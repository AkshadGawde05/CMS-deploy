#!/usr/bin/env node
/**
 * Temporary Data Integrity Verification Script
 *
 * Validates cross-reference consistency for Students, Teachers, Lectures
 * after switching bulk-upload logic to human-friendly Course/Batch names.
 *
 * Checks:
 *  - Every student.course_id exists
 *  - Every student.batch_id exists and its course matches student.course_id
 *  - DOB plausibility & attempts dd/mm/yyyy vs yyyy-mm-dd confusion fix (optional)
 *  - Every teacher.assigned_batches exists
 *  - Every lecture course/batch/teacher references exist & batch.course_id matches lecture.course_id
 *
 * Optional flags:
 *  --fix-dob            Attempt to correct ambiguous DD/MM vs MM/DD swaps
 *  --dob-cutoff-year=Y  Ignore DOB earlier than Y (default 1950) when checking
 *  --dry-run            Report intended fixes without writing
 *  --limit=N            Limit number of documents processed per collection
 *  --verbose            Extra logging
 *
 * Usage:
 *   node scripts/verifyDataIntegrity.js
 *   node scripts/verifyDataIntegrity.js --fix-dob --dry-run --verbose
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Batches from '../models/Batches.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';

dotenv.config();

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getArgValue = (prefix, def) => {
  const found = args.find((a) => a.startsWith(prefix + '='));
  if (!found) return def;
  return found.split('=')[1];
};

const FIX_DOB = hasFlag('--fix-dob');
const DRY_RUN = hasFlag('--dry-run');
const VERBOSE = hasFlag('--verbose');
const LIMIT = parseInt(getArgValue('--limit', '0')) || 0;
const DOB_CUTOFF_YEAR = parseInt(getArgValue('--dob-cutoff-year', '1950')) || 1950;

function log(...m) { console.log('[verify]', ...m); }
function warn(...m) { console.warn('[verify][WARN]', ...m); }
function errorLog(...m) { console.error('[verify][ERROR]', ...m); }

function fmtDate(d) {
  if (!d || isNaN(d)) return 'InvalidDate';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Attempt to detect if a DOB likely swapped (e.g., 2005-30-01 parsed invalid and stored differently). We only work with Date objects.
function detectSwap(d) {
  if (!d || isNaN(d)) return false;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  // If day <= 12 and month > 12 it might have been swapped originally, but JavaScript wouldn't produce such automatically.
  // Simple heuristic: If month === day we can't tell; else if original day (from a stored metadata?) we can't. Using limited heuristic:
  return false; // placeholder logic kept simple
}

// Re-interpret a possibly mis-parsed date string in dd/mm/yyyy form
function parseHumanDOB(str) {
  if (!str) return null;
  const m = String(str).match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d) ? null : d;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    errorLog('MONGODB_URI not set in environment');
    process.exit(1);
  }
  await mongoose.connect(uri);
  log('Connected to MongoDB');

  const summary = {
    students: { checked: 0, issues: [], dobFixed: 0 },
    teachers: { checked: 0, issues: [] },
    lectures: { checked: 0, issues: [] },
  };

  // Preload reference maps
  const courses = await Course.find({}, { name: 1 }).lean();
  const batches = await Batches.find({}, { name: 1, course_id: 1 }).lean();
  const courseById = new Map(courses.map(c => [String(c._id), c]));
  const courseIdByName = new Map(courses.map(c => [c.name, c._id]));
  const batchById = new Map(batches.map(b => [String(b._id), b]));
  const batchIdsByName = new Map(); // name -> [batchIds]
  batches.forEach(b => {
    const arr = batchIdsByName.get(b.name) || [];
    arr.push(b._id);
    batchIdsByName.set(b.name, arr);
  });

  // ---- Students ----
  const studentQuery = Student.find();
  if (LIMIT) studentQuery.limit(LIMIT);
  const students = await studentQuery.lean();
  for (const s of students) {
    summary.students.checked++;
    const sid = String(s._id);
    // course existence
    if ( s.course_id && !courseById.has(String(s.course_id)) ) {
      summary.students.issues.push({ id: sid, type: 'missing_course', course_id: s.course_id });
    }
    // batch existence and linkage
    if ( s.batch_id ) {
      const b = batchById.get(String(s.batch_id));
      if (!b) {
        summary.students.issues.push({ id: sid, type: 'missing_batch', batch_id: s.batch_id });
      } else if ( s.course_id && String(b.course_id) !== String(s.course_id) ) {
        summary.students.issues.push({ id: sid, type: 'batch_course_mismatch', batch_id: s.batch_id, batch_course_id: b.course_id, student_course_id: s.course_id });
      }
    }
    // DOB plausibility
    if (s.dob) {
      const dob = new Date(s.dob);
      if (!isNaN(dob)) {
        const year = dob.getFullYear();
        const nowYear = new Date().getFullYear();
        if (year < DOB_CUTOFF_YEAR || year > nowYear) {
          summary.students.issues.push({ id: sid, type: 'dob_out_of_range', dob: dob.toISOString() });
        }
      } else {
        summary.students.issues.push({ id: sid, type: 'dob_invalid', raw: s.dob });
      }
      // Attempt fix only if a string original existed (not accessible now) - heuristic: if stored as string in doc
      if (FIX_DOB && typeof s.dob === 'string') {
        const parsed = parseHumanDOB(s.dob);
        if (parsed && !isNaN(parsed)) {
          if (!DRY_RUN) {
            await Student.updateOne({ _id: s._id }, { $set: { dob: parsed } });
          }
          summary.students.dobFixed++;
          if (VERBOSE) log(`Fixed DOB for student ${sid} -> ${fmtDate(parsed)}`);
        }
      }
    }
  }

  // ---- Teachers ----
  const teacherQuery = Teacher.find();
  if (LIMIT) teacherQuery.limit(LIMIT);
  const teachers = await teacherQuery.lean();
  for (const t of teachers) {
    summary.teachers.checked++;
    const tid = String(t._id);
    if (Array.isArray(t.assigned_batches)) {
      for (const bid of t.assigned_batches) {
        if (!batchById.has(String(bid))) {
          summary.teachers.issues.push({ id: tid, type: 'missing_assigned_batch', batch_id: bid });
        }
      }
    }
  }

  // ---- Lectures ----
  const lectureQuery = Lecture.find();
  if (LIMIT) lectureQuery.limit(LIMIT);
  const lectures = await lectureQuery.lean();
  for (const l of lectures) {
    summary.lectures.checked++;
    const lid = String(l._id);
    if (l.course_id && !courseById.has(String(l.course_id))) {
      summary.lectures.issues.push({ id: lid, type: 'missing_course', course_id: l.course_id });
    }
    if (l.batch_id) {
      const b = batchById.get(String(l.batch_id));
      if (!b) {
        summary.lectures.issues.push({ id: lid, type: 'missing_batch', batch_id: l.batch_id });
      } else if (l.course_id && String(b.course_id) !== String(l.course_id)) {
        summary.lectures.issues.push({ id: lid, type: 'batch_course_mismatch', batch_id: l.batch_id, batch_course_id: b.course_id, lecture_course_id: l.course_id });
      }
    }
    if (l.teacher_id) {
      const teacherExists = await Teacher.exists({ _id: l.teacher_id });
      if (!teacherExists) {
        summary.lectures.issues.push({ id: lid, type: 'missing_teacher', teacher_id: l.teacher_id });
      }
    }
    if (l.date) {
      const lectureDate = new Date(l.date);
      if (isNaN(lectureDate)) {
        summary.lectures.issues.push({ id: lid, type: 'invalid_date', raw: l.date });
      }
    }
  }

  // Output summary
  console.log('\n========== DATA INTEGRITY SUMMARY ==========' );
  console.log('Students checked:', summary.students.checked);
  console.log(' - Issues:', summary.students.issues.length);
  console.log(' - DOB fixed:', summary.students.dobFixed, FIX_DOB ? (DRY_RUN ? '(dry-run)' : '') : '(DOB fix disabled)');
  console.log('Teachers checked:', summary.teachers.checked);
  console.log(' - Issues:', summary.teachers.issues.length);
  console.log('Lectures checked:', summary.lectures.checked);
  console.log(' - Issues:', summary.lectures.issues.length);

  const listIssues = (label, arr) => {
    if (!arr.length) { console.log(`No ${label} issues.`); return; }
    console.log(`\n--- ${label} Issues (${arr.length}) ---`);
    arr.slice(0, 50).forEach((it) => console.log(it));
    if (arr.length > 50) console.log(`(Truncated. Total ${arr.length})`);
  };

  listIssues('Student', summary.students.issues);
  listIssues('Teacher', summary.teachers.issues);
  listIssues('Lecture', summary.lectures.issues);

  await mongoose.disconnect();
  log('Disconnected. Integrity verification complete.');
  if (summary.students.issues.length || summary.teachers.issues.length || summary.lectures.issues.length) {
    process.exitCode = 1; // Non-zero if issues found
  }
}

main().catch((e) => {
  errorLog('Fatal error:', e);
  process.exit(2);
});
