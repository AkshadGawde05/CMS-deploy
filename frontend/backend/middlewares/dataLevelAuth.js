/**
 * Data-Level Authorization Middleware
 * Ensures users can only access data they own or are authorized to see
 * Applied after JWT/role checks, before database queries
 */

import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Parent from "../models/Parent.js";
import Attendance from "../models/Attendance.js";

/**
 * Middleware to verify a student can only access their own data
 * Usage: router.get('/attendance', verifyAuth, verifyStudentSelfAccess(), getAttendance);
 */
export function verifyStudentSelfAccess(dataOwnerParam = "studentId") {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Only students are restricted; admins bypass
      if (userRole === "SuperAdmin" || userRole === "Admin") {
        return next();
      }

      if (userRole !== "Student") {
        return next(); // Non-students don't need this check
      }

      // For students: ensure they're requesting their own data
      const requestedStudentId =
        req.params?.[dataOwnerParam] ||
        req.query?.[dataOwnerParam] ||
        req.body?.[dataOwnerParam];

      // If requesting specific student data, verify ownership
      if (requestedStudentId) {
        const student = await Student.findById(requestedStudentId).lean();
        if (!student) {
          return res.status(404).json({ error: "Student not found" });
        }

        // Verify the student's user_id matches logged-in user
        if (String(student.user_id) !== String(userId)) {
          return res.status(403).json({
            error: "Access Denied: Cannot access another student's data",
          });
        }
      }

      return next();
    } catch (error) {
      console.error("Student self-access verification error:", error);
      return res.status(500).json({ error: "Access verification failed" });
    }
  };
}

/**
 * Middleware to verify parent can only access their linked children's data
 * Usage: router.get('/attendance/:studentId', verifyAuth, verifyParentHasAccess('studentId'), getAttendance);
 */
export function verifyParentHasAccess(studentIdParam = "studentId") {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const linkedStudents = req.user?.linkedStudents || [];

      // Admins bypass
      if (userRole === "SuperAdmin" || userRole === "Admin") {
        return next();
      }

      // Only parents are restricted
      if (userRole !== "Parent") {
        return next();
      }

      // Get the student ID being accessed
      const studentId =
        req.params?.[studentIdParam] ||
        req.query?.[studentIdParam] ||
        req.body?.[studentIdParam];

      if (!studentId) {
        // If no specific student is being accessed, allow (query all children)
        return next();
      }

      // Verify parent is linked to this student
      const studentObjectIds = linkedStudents.map((s) => String(s));
      if (!studentObjectIds.includes(String(studentId))) {
        return res.status(403).json({
          error: "Access Denied: Parent not linked to student",
        });
      }

      return next();
    } catch (error) {
      console.error("Parent access verification error:", error);
      return res.status(500).json({ error: "Access verification failed" });
    }
  };
}

/**
 * Middleware to verify user can access attendance stats
 * Allows: Students (own stats), Teachers (own stats), Parents (linked children), Admins (all)
 * Usage: router.get('/user/:userId/stats', verifyAuth, verifyAttendanceStatsAccess('userId'), getAttendanceStats);
 */
export function verifyAttendanceStatsAccess(userIdParam = "userId") {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const loggedInUserId = req.user?.id;
      const linkedStudents = req.user?.linkedStudents || [];

      // Admins bypass
      if (userRole === "SuperAdmin" || userRole === "Admin") {
        return next();
      }

      // Get the user ID being accessed
      const requestedUserId =
        req.params?.[userIdParam] ||
        req.query?.[userIdParam] ||
        req.body?.[userIdParam];

      if (!requestedUserId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Students can only access their own stats
      if (userRole === "Student") {
        if (String(loggedInUserId) !== String(requestedUserId)) {
          return res.status(403).json({
            error: "Access Denied: Cannot access another student's attendance stats",
          });
        }
        return next();
      }

      // Teachers can only access their own stats
      if (userRole === "Teacher") {
        if (String(loggedInUserId) !== String(requestedUserId)) {
          return res.status(403).json({
            error: "Access Denied: Cannot access another teacher's attendance stats",
          });
        }
        return next();
      }

      // Parents can access linked children's stats
      if (userRole === "Parent") {
        // Get the student record to find their user_id
        const student = await Student.findById(requestedUserId).lean();
        if (!student) {
          return res.status(404).json({ error: "Student not found" });
        }

        // Check if parent is linked to this student
        const studentObjectIds = linkedStudents.map((s) => String(s));
        if (!studentObjectIds.includes(String(requestedUserId))) {
          return res.status(403).json({
            error: "Access Denied: Parent not linked to student",
          });
        }
        return next();
      }

      return res.status(403).json({ error: "Access Denied" });
    } catch (error) {
      console.error("Attendance stats access verification error:", error);
      return res.status(500).json({ error: "Access verification failed" });
    }
  };
}

/**
 * Middleware to verify teacher can only access their assigned batches
 * Usage: router.get('/students', verifyAuth, verifyTeacherBatchAccess('batchId'), getStudents);
 */
export function verifyTeacherBatchAccess(batchIdParam = "batchId") {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Admins bypass
      if (userRole === "SuperAdmin" || userRole === "Admin") {
        return next();
      }

      // Only teachers are restricted
      if (userRole !== "Teacher") {
        return next();
      }

      // Get the batch ID being accessed
      const batchId =
        req.params?.[batchIdParam] ||
        req.query?.[batchIdParam] ||
        req.body?.[batchIdParam];

      if (!batchId) {
        // If no specific batch is specified, allow (will filter in controller)
        return next();
      }

      // Fetch teacher record to get assigned batches
      const teacher = await Teacher.findOne({ user_id: userId }).lean();
      if (!teacher) {
        return res.status(403).json({ error: "Teacher record not found" });
      }

      const assignedBatchIds = (teacher.assigned_batches || []).map((b) =>
        String(b)
      );

      // Verify teacher is assigned to this batch
      if (!assignedBatchIds.includes(String(batchId))) {
        return res.status(403).json({
          error: "Access Denied: Teacher not assigned to batch",
        });
      }

      // Attach assigned batches to request for use in controller
      req.user.assignedBatchIds = assignedBatchIds;

      return next();
    } catch (error) {
      console.error("Teacher batch access verification error:", error);
      return res.status(500).json({ error: "Access verification failed" });
    }
  };
}

/**
 * Helper: Get query filter for attendance based on user role and access
 * Usage in controller: const filter = getAttendanceFilter(req.user, studentId);
 */
export async function getAttendanceFilter(user, requestedStudentId = null) {
  const role = user?.role;
  const userId = user?.id;
  const linkedStudents = user?.linkedStudents || [];
  const assignedBatches = user?.assignedBatchIds || [];

  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return {}; // No filter - see all

    case "Student":
      // Student can only see their own attendance
      const student = await Student.findOne({ user_id: userId }).lean();
      return student ? { studentId: student._id } : {};

    case "Parent":
      // Parent sees attendance of linked children
      return { studentId: { $in: linkedStudents } };

    case "Teacher":
      // Teacher sees attendance for their assigned batches
      // Must fetch students in those batches
      const studentsInBatches = await Student.find({
        batch_id: { $in: assignedBatches },
      })
        .lean()
        .select("_id");
      const studentIds = studentsInBatches.map((s) => s._id);
      return { studentId: { $in: studentIds } };

    default:
      return { student_id: requestedStudentId || null }; // Restrictive default
  }
}

/**
 * Helper: Get query filter for students based on user role
 * Usage in controller: const filter = getStudentFilter(req.user);
 */
export async function getStudentFilter(user) {
  const role = user?.role;
  const userId = user?.id;
  const linkedStudents = user?.linkedStudents || [];
  const assignedBatches = user?.assignedBatchIds || [];

  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return {}; // No filter - see all

    case "Student":
      // Students can see their own record
      const student = await Student.findOne({ user_id: userId }).lean();
      return student ? { _id: student._id } : { _id: null };

    case "Parent":
      // Parents see their linked children
      return { _id: { $in: linkedStudents } };

    case "Teacher":
      // Teachers see students in their assigned batches
      return { batch_id: { $in: assignedBatches } };

    default:
      return { _id: null }; // Restrictive default
  }
}

/**
 * Helper: Get query filter for syllabus based on user role
 * Usage in controller: const filter = getSyllabusFilter(req.user);
 */
export async function getSyllabusFilter(user) {
  const role = user?.role;
  const userId = user?.id;
  const linkedStudents = user?.linkedStudents || [];
  const assignedBatches = user?.assignedBatchIds || [];

  switch (role) {
    case "SuperAdmin":
    case "Admin":
      return {}; // No filter - see all

    case "Student":
      // Students see only their batch's syllabus
      const student = await Student.findOne({ user_id: userId }).lean();
      return student ? { batch_id: student.batch_id } : { batch_id: null };

    case "Parent":
      // Parents see syllabi for their children's batches
      const parentStudents = await Student.find({
        _id: { $in: linkedStudents },
      })
        .lean()
        .select("batch_id");
      const parentBatchIds = [
        ...new Set(parentStudents.map((s) => String(s.batch_id))),
      ];
      return { batch_id: { $in: parentBatchIds } };

    case "Teacher":
      // Teachers see syllabi for their assigned batches
      return { batch_id: { $in: assignedBatches } };

    default:
      return { batch_id: null }; // Restrictive default
  }
}

export default {
  verifyStudentSelfAccess,
  verifyParentHasAccess,
  verifyAttendanceStatsAccess,
  verifyTeacherBatchAccess,
  getAttendanceFilter,
  getStudentFilter,
  getSyllabusFilter,
};
