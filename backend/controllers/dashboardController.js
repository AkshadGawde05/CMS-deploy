/**
 * Dashboard Controller
 * Provides role-specific dashboard data with strict data-level authorization
 */

import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Parent from "../models/Parent.js";
import Attendance from "../models/Attendance.js";
import Syllabus from "../models/Syllabus.js";
import Lecture from "../models/Lecture.js";
import Exam from "../models/Exam.js";
import User from "../models/User.js";
import Batches from "../models/Batches.js";

/**
 * Helper function to build student card data (same format used by both Student and Parent dashboards)
 */
const buildStudentCardData = async (student) => {
  // Attendance stats
  const totalDays = await Attendance.countDocuments({
    studentId: student._id,
  });

  const presentDays = await Attendance.countDocuments({
    studentId: student._id,
    status: "present",
  });

  // Batch syllabus
  const syllabus = student.batch_id
    ? await Syllabus.findOne({
        batch_id: student.batch_id._id,
      })
        .select("_id name items academic_year")
        .lean()
    : null;

  // Get lectures for student's batch
  const lectures = student.batch_id
    ? await Lecture.find({
        batch_id: student.batch_id._id,
        archived: false,
      })
        .select("_id title date_created topics batch_id")
        .sort({ date_created: -1 })
        .limit(10)
        .lean()
    : [];

  // Get exams for student's batch
  const exams = student.batch_id
    ? await Exam.find({
        batch_id: student.batch_id._id,
      })
        .select("_id subject topic exam_type date total_marks status batch_id exam_link")
        .sort({ date: -1 })
        .lean()
    : [];

  // Recent attendance records
  const recentAttendance = await Attendance.find({
    studentId: student._id,
  })
    .sort({ date: -1 })
    .limit(7)
    .lean();

  return {
    id: student._id,
    name: `${student.fname} ${student.lname}`,
    batch: student.batch_id?.name || "Not assigned",
    course: student.course_id?.name || "Not assigned",
    feeStatus: student.fee_status,
    admissionDate: student.admission_date,
    attendance: {
      total: totalDays,
      present: presentDays,
      percentage: totalDays > 0 ? parseFloat(((presentDays / totalDays) * 100).toFixed(2)) : 0,
    },
    syllabus: {
      id: syllabus?._id,
      name: syllabus?.name,
      itemsCount: syllabus?.items?.length || 0,
      academicYear: syllabus?.academic_year,
    },
    lectures: {
      total: lectures.length,
      pending: lectures.length,
      recent: lectures.map((lec) => ({
        id: lec._id,
        title: lec.title || lec.topic,
        date: lec.date_created || lec.date,
        topics: lec.topics || lec.topic,
      })),
    },
    exams: {
      total: exams.length,
      scheduled: exams.filter((exam) => exam.status === "scheduled").length,
      completed: exams.filter((exam) => exam.status === "completed").length,
      recent: exams.map((exam) => ({
        id: exam._id,
        subject: exam.subject,
        topic: exam.topic,
        type: exam.exam_type,
        date: exam.date,
        totalMarks: exam.total_marks,
        status: exam.status,
        examLink: exam.exam_link || null,
      })),
    },
    recentActivity: {
      attendance: recentAttendance.slice(0, 5).map((att) => ({
        date: att.date,
        status: att.status,
        source: att.source,
      })),
    },
  };
};

/**
 * Student Dashboard
 * Shows: Personal attendance, batch syllabus, lectures, academic progress
 * Same format as parent dashboard for unified components
 */
export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Only students can access their own dashboard
    if (userRole !== "Student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access student dashboard",
      });
    }

    // Get student record
    const student = await Student.findOne({ user_id: userId })
      .populate("batch_id", "name course_id")
      .populate("course_id", "name code")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Build student data using unified format
    const studentData = await buildStudentCardData(student);

    return res.json({
      success: true,
      data: {
        user: {
          id: student.user_id,
          name: `${student.fname} ${student.lname}`,
          role: "Student",
        },
        children: [studentData], // Wrapped in array for consistent component usage
      },
    });
  } catch (err) {
    console.error("Student dashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load student dashboard",
      error: err.message,
    });
  }
};

/**
 * Teacher Dashboard
 * Shows: Assigned batches, students, attendance stats, syllabus completion
 */
export const getTeacherDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Only teachers can access teacher dashboard
    if (userRole !== "Teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can access teacher dashboard",
      });
    }

    // Get teacher record with assigned batches
    const teacher = await Teacher.findOne({ user_id: userId })
      .populate("assigned_batches", "name course_id")
      .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher record not found",
      });
    }

    const assignedBatchIds = teacher.assigned_batches?.map((b) => b._id) || [];

    if (assignedBatchIds.length === 0) {
      return res.json({
        success: true,
        data: {
          teacher: {
            id: teacher._id,
            name: `${teacher.fname} ${teacher.lname}`,
            subjects: teacher.subjects,
          },
          batches: [],
          studentsCount: 0,
          attendanceStats: [],
          syllabusStats: [],
        },
      });
    }

    // Get students in assigned batches
    const students = await Student.find({
      batch_id: { $in: assignedBatchIds },
    })
      .select("_id fname lname batch_id admission_date fee_status")
      .lean();

    // Get attendance statistics for each batch
    const attendanceStats = await Promise.all(
      assignedBatchIds.map(async (batchId) => {
        const batchStudents = students.filter(
          (s) => s.batch_id.toString() === batchId.toString()
        );
        const batchStudentIds = batchStudents.map((s) => s._id);

        const totalRecords = await Attendance.countDocuments({
          studentId: { $in: batchStudentIds },
        });

        const presentRecords = await Attendance.countDocuments({
          studentId: { $in: batchStudentIds },
          status: "present",
        });

        return {
          batchId,
          studentCount: batchStudents.length,
          totalAttendanceRecords: totalRecords,
          averageAttendance:
            totalRecords > 0
              ? ((presentRecords / totalRecords) * 100).toFixed(2)
              : 0,
        };
      })
    );

    // Get syllabus completion status for each batch
    const syllabusStats = await Promise.all(
      assignedBatchIds.map(async (batchId) => {
        const syllabus = await Syllabus.findOne({ batch_id: batchId })
          .select("_id name items academic_year")
          .lean();

        return {
          batchId,
          syllabusName: syllabus?.name || "Not created",
          itemsCount: syllabus?.items?.length || 0,
          completedItems: syllabus?.items?.filter(
            (item) => item.completed === true
          ).length || 0,
          completionPercentage:
            syllabus && syllabus.items.length > 0
              ? (
                  (syllabus.items.filter((i) => i.completed).length /
                    syllabus.items.length) *
                  100
                ).toFixed(2)
              : 0,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          name: `${teacher.fname} ${teacher.lname}`,
          empNo: teacher.emp_no,
          subjects: teacher.subjects,
          joiningDate: teacher.joining_date,
        },
        batches: teacher.assigned_batches.map((batch, idx) => ({
          id: batch._id,
          name: batch.name,
          courseId: batch.course_id,
          studentCount: attendanceStats[idx]?.studentCount || 0,
          averageAttendance:
            attendanceStats[idx]?.averageAttendance || "0.00",
        })),
        studentsCount: students.length,
        stats: {
          attendance: attendanceStats,
          syllabus: syllabusStats,
        },
      },
    });
  } catch (err) {
    console.error("Teacher dashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load teacher dashboard",
      error: err.message,
    });
  }
};

/**
 * Parent Dashboard
 * Shows: Linked children, their attendance, batch info, academic progress
 * Uses SAME component structure as Student dashboard for reusability
 */
export const getParentDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const linkedStudents = req.user?.linkedStudents || [];

    // Only parents can access parent dashboard
    if (userRole !== "Parent") {
      return res.status(403).json({
        success: false,
        message: "Only parents can access parent dashboard",
      });
    }

    // Get parent record
    const parent = await Parent.findOne({ user_id: userId })
      .select("fname lname relation")
      .lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent record not found",
      });
    }

    if (linkedStudents.length === 0) {
      return res.json({
        success: true,
        data: {
          user: {
            id: parent.user_id,
            name: `${parent.fname} ${parent.lname}`,
            role: "Parent",
            relation: parent.relation,
          },
          children: [], // Empty array for consistency
        },
      });
    }

    // Get linked students' data
    const children = await Student.find({ _id: { $in: linkedStudents } })
      .populate("batch_id", "name course_id")
      .populate("course_id", "name code")
      .lean();

    // Build data for each child using the same unified format
    const childrenData = await Promise.all(
      children.map((child) => buildStudentCardData(child))
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: parent.user_id,
          name: `${parent.fname} ${parent.lname}`,
          role: "Parent",
          relation: parent.relation,
        },
        children: childrenData, // Same format as student dashboard
      },
    });
  } catch (err) {
    console.error("Parent dashboard error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load parent dashboard",
      error: err.message,
    });
  }
};

export default {
  getStudentDashboard,
  getTeacherDashboard,
  getParentDashboard,
};
