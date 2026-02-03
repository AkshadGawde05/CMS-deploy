import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

function isEmpty(v) {
  return v === null || v === undefined || v === "";
}

function roleBase(u) {
  // Try both styles (some code uses role, some uses roleid/role_id)
  const role = u.role;
  const roleid = u.roleid || u.role_id;

  if (role === "SuperAdmin" || role === "Admin") return 90000;
  if (roleid === "admin") return 90000;

  if (role === "Teacher" || roleid === "teacher") return 20000;
  if (role === "Student" || roleid === "student") return 10000;
  if (role === "Parent" || roleid === "parent") return 80000;

  return 70000;
}

async function nextAvailableId(usedSet, base) {
  // base=10000 => first candidate 10001
  let n = base + 1;
  while (usedSet.has(String(n))) n++;
  usedSet.add(String(n));
  return String(n);
}

async function main() {
  if (!uri) throw new Error("Missing MONGODB_URI / MONGO_URI in .env");
  await mongoose.connect(uri);
  console.log("✅ Connected");

  // 1) Build a set of ALL already-used IDs across collections (prevents collisions)
  const used = new Set();

  const existingUserIds = await User.find({ device_user_id: { $exists: true, $ne: null } })
    .select("device_user_id").lean();
  existingUserIds.forEach(d => used.add(String(d.device_user_id)));

  const existingStudentIds = await Student.find({ device_user_id: { $exists: true, $ne: null } })
    .select("device_user_id").lean();
  existingStudentIds.forEach(d => used.add(String(d.device_user_id)));

  const existingTeacherIds = await Teacher.find({ device_user_id: { $exists: true, $ne: null } })
    .select("device_user_id").lean();
  existingTeacherIds.forEach(d => used.add(String(d.device_user_id)));

  console.log("Used device_user_id count:", used.size);

  // 2) Assign missing device_user_id to Users (NO save(), only updateOne)
  const usersMissing = await User.find({
    $or: [{ device_user_id: null }, { device_user_id: "" }, { device_user_id: { $exists: false } }]
  }).select("_id role roleid role_id email").lean();

  console.log("Users missing device_user_id:", usersMissing.length);

  let updatedUsers = 0;
  for (const u of usersMissing) {
    const base = roleBase(u);
    const newId = await nextAvailableId(used, base);

    await User.updateOne({ _id: u._id }, { $set: { device_user_id: newId } });
    updatedUsers++;
  }
  console.log("✅ Updated Users:", updatedUsers);

  // 3) Ensure Students have device_user_id (prefer copying from linked user_id)
  const students = await Student.find({
    $or: [{ device_user_id: null }, { device_user_id: "" }, { device_user_id: { $exists: false } }]
  }).select("_id user_id").lean();

  console.log("Students missing device_user_id:", students.length);

  let updatedStudents = 0;
  for (const s of students) {
    let newId = null;

    if (s.user_id) {
      const u = await User.findById(s.user_id).select("device_user_id role roleid role_id").lean();
      if (u?.device_user_id && !used.has(String(u.device_user_id))) {
        // very rare: user has an id but wasn't in used set (shouldn’t happen)
        used.add(String(u.device_user_id));
      }
      if (u?.device_user_id) newId = String(u.device_user_id);
    }

    if (!newId) {
      newId = await nextAvailableId(used, 10000);
    }

    await Student.updateOne({ _id: s._id }, { $set: { device_user_id: newId } });
    updatedStudents++;
  }
  console.log("✅ Updated Students:", updatedStudents);

  // 4) Ensure Teachers have device_user_id (copy from linked user_id when possible)
  const teachers = await Teacher.find({
    $or: [{ device_user_id: null }, { device_user_id: "" }, { device_user_id: { $exists: false } }]
  }).select("_id user_id").lean();

  console.log("Teachers missing device_user_id:", teachers.length);

  let updatedTeachers = 0;
  for (const t of teachers) {
    let newId = null;

    if (t.user_id) {
      const u = await User.findById(t.user_id).select("device_user_id").lean();
      if (u?.device_user_id) newId = String(u.device_user_id);
    }

    if (!newId) {
      newId = await nextAvailableId(used, 20000);
    }

    await Teacher.updateOne({ _id: t._id }, { $set: { device_user_id: newId } });
    updatedTeachers++;
  }
  console.log("✅ Updated Teachers:", updatedTeachers);

  console.log("✅ Migration complete (idempotent, passwords untouched).");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("❌ Migration failed:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
