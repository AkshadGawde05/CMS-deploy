import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Parent from "../models/Parent.js";
import Batches from "../models/Batches.js";
import Lecture from "../models/Lecture.js";
import ExcelJS from "exceljs";

export const getAttendance = async (req, res) => {
  try {
    const {
      batchId,
      studentId,
      userId,
      userType,
      startDate,
      endDate,
      status,
      source,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    const userRole = req.user?.role;
    const userId_auth = req.user?.id;
    const linkedStudents = req.user?.linkedStudents || [];

    // Apply data-level authorization FIRST
    if (userRole === "Student") {
      // Student can only see their own attendance
      const student = await Student.findOne({ user_id: userId_auth }).lean();
      if (!student) {
        // No attendance records if student not found
        return res.json({
          success: true,
          attendance: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        });
      }
      filter.studentId = student._id;
      filter.userType = "Student"; // Students can only see Student attendance
    } else if (userRole === "Parent") {
      // Parent can only see linked children's attendance
      if (linkedStudents.length === 0) {
        // No linked students, return empty
        return res.json({
          success: true,
          attendance: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        });
      }
      filter.studentId = { $in: linkedStudents };
      filter.userType = "Student"; // Parents can only see Student attendance
    } else if (userRole === "Teacher") {
      // Teacher can only see their own attendance
      filter.userId = userId_auth;
      filter.userType = "Teacher";
    }
    // SuperAdmin and Admin see all data (no filter)

    // Apply optional filters, but respect authorization bounds
    if (batchId) filter.batchId = batchId;
    if (studentId) {
      // Check if student is within authorized access
      let hasAccess = false;
      
      if (!filter.studentId) {
        // Admin/SuperAdmin - can access any student
        hasAccess = true;
      } else if (typeof filter.studentId === 'object' && filter.studentId.$in) {
        // Parent or teacher - check if requested student is in their authorized list
        const studentIdStr = String(studentId);
        hasAccess = filter.studentId.$in.some((id) => String(id) === studentIdStr);
      } else if (String(filter.studentId) === String(studentId)) {
        // Student checking their own data
        hasAccess = true;
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Cannot access this student's attendance",
        });
      }
      filter.studentId = studentId;
    }
    if (userId) filter.userId = userId;
    if (userType && !filter.userType) filter.userType = userType;
    if (status) filter.status = status;
    if (source) filter.source = source;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate({
          path: "studentId",
          select: "fname lname email phone",
        })
        .populate({
          path: "userId",
          select: "fname lname email",
        })
        .populate({
          path: "batchId",
          select: "name",
        })
        .populate({
          path: "markedByUser",
          select: "fname lname",
        })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      attendance: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const markManualAttendance = async (req, res) => {
  try {
    const { studentId, userId, userType, batchId, date, status, notes } =
      req.body;
    const markedByUser = req.user?.id;

    // Require either studentId (legacy) or userId + userType (new)
    if ((!studentId && !userId) || !date || !status) {
      return res.status(400).json({
        success: false,
        message:
          "Either (studentId) OR (userId + userType) and date, status are required",
      });
    }

    const existingDate = new Date(date);
    const startOfDay = new Date(existingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(existingDate.setHours(23, 59, 59, 999));

    // Determine which field to use based on userType
    const actualStudentId =
      studentId || (userType === "Student" ? userId : null);
    const actualUserId = userType === "Teacher" ? userId : null;

    // Find lecture for this date and batch
    let lectureId = null;
    if (batchId) {
      const lecture = await Lecture.findOne({
        batch_id: batchId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });
      if (lecture) {
        lectureId = lecture._id;
      }
    }

    // Build filter based on what was provided
    const attendanceFilter = {
      date: { $gte: startOfDay, $lte: endOfDay },
      source: "manual",
    };

    if (actualStudentId) {
      attendanceFilter.studentId = actualStudentId;
    } else if (actualUserId) {
      attendanceFilter.userId = actualUserId;
    }

    const existing = await Attendance.findOne(attendanceFilter);

    if (existing) {
      existing.status = status;
      existing.notes = notes;
      existing.markedBy = "manual";
      existing.markedByUser = markedByUser;
      if (lectureId) {
        existing.lectureId = lectureId;
      }
      await existing.save();

      const populated = await Attendance.findById(existing._id)
        .populate("studentId", "fname lname")
        .populate("userId", "fname lname")
        .populate("batchId", "name");

      return res.json({
        success: true,
        message: "Attendance updated",
        attendance: populated,
      });
    }

    const attendance = new Attendance({
      studentId: actualStudentId,
      userId: actualUserId,
      userType: userType || "Student",
      batchId,
      lectureId: lectureId || null,
      deviceId: "manual",
      timestamp: new Date(),
      date: new Date(date),
      status,
      source: "manual",
      notes,
      markedBy: "manual",
      markedByUser: markedByUser,
    });

    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate("studentId", "fname lname")
      .populate("userId", "fname lname")
      .populate("batchId", "name");

    res.status(201).json({
      success: true,
      message: "Manual attendance marked",
      attendance: populated,
    });
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAttendanceStats = async (req, res) => {
  try {
    const { batchId, userType, startDate, endDate } = req.query;

    const filter = {};
    const userRole = req.user?.role;
    const userId_auth = req.user?.id;
    const linkedStudents = req.user?.linkedStudents || [];

    // Apply data-level authorization FIRST
    if (userRole === "Student") {
      // Student can only see their own attendance
      const student = await Student.findOne({ user_id: userId_auth }).lean();
      if (!student) {
        // No attendance records if student not found
        return res.json({
          success: true,
          stats: {
            totalRecords: 0,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
            biometric: 0,
            manual: 0,
          },
        });
      }
      filter.studentId = student._id;
      filter.userType = "Student"; // Students can only see Student attendance
    } else if (userRole === "Parent") {
      // Parent can only see linked children's attendance
      if (linkedStudents.length === 0) {
        // No linked students, return empty
        return res.json({
          success: true,
          stats: {
            totalRecords: 0,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
            biometric: 0,
            manual: 0,
          },
        });
      }
      filter.studentId = { $in: linkedStudents };
      filter.userType = "Student"; // Parents can only see Student attendance
    } else if (userRole === "Teacher") {
      // Teacher can only see their own attendance
      filter.userId = userId_auth;
      filter.userType = "Teacher";
      // Teachers can only see their own (Teacher) attendance
    }
    // SuperAdmin and Admin see all data (no authorization filter)

    // Apply optional filters from query, but respect authorization bounds
    if (batchId && !filter.studentId) {
      // Only allow batchId filter for users who can see multiple records
      filter.batchId = batchId;
    }
    // Only apply userType query param if not already set by authorization
    if (userType && !filter.userType) {
      // Respect userType from query only if it matches user's authorization
      if (userRole === "Admin" || userRole === "SuperAdmin") {
        filter.userType = userType;
      }
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          excused: {
            $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] },
          },
          biometric: {
            $sum: { $cond: [{ $eq: ["$source", "biometric"] }, 1, 0] },
          },
          manual: {
            $sum: { $cond: [{ $eq: ["$source", "manual"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalRecords: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      biometric: 0,
      manual: 0,
    };

    res.json({
      success: true,
      stats: result,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const exportAttendance = async (req, res) => {
  try {
    const { batchId, userType, startDate, endDate } = req.query;

    const filter = {};
    const userRole = req.user?.role;
    const userId_auth = req.user?.id;
    const linkedStudents = req.user?.linkedStudents || [];

    // Apply data-level authorization FIRST
    if (userRole === "Student") {
      // Student can only export their own attendance
      const student = await Student.findOne({ user_id: userId_auth }).lean();
      if (!student) {
        // No attendance records if student not found
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance");
        worksheet.columns = [
          { header: "Date", key: "date", width: 15 },
          { header: "Time", key: "time", width: 12 },
          { header: "User Type", key: "userType", width: 12 },
          { header: "Name", key: "name", width: 25 },
          { header: "Email", key: "email", width: 30 },
          { header: "Batch", key: "batch", width: 20 },
          { header: "Status", key: "status", width: 12 },
          { header: "Source", key: "source", width: 12 },
          { header: "Device", key: "device", width: 15 },
        ];
        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="attendance_${new Date().toISOString().slice(0, 10)}.xlsx"`);
        return res.send(buffer);
      }
      filter.studentId = student._id;
      filter.userType = "Student"; // Students can only export Student attendance
    } else if (userRole === "Parent") {
      // Parent can only export linked children's attendance
      if (linkedStudents.length === 0) {
        // No linked students, return empty
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance");
        worksheet.columns = [
          { header: "Date", key: "date", width: 15 },
          { header: "Time", key: "time", width: 12 },
          { header: "User Type", key: "userType", width: 12 },
          { header: "Name", key: "name", width: 25 },
          { header: "Email", key: "email", width: 30 },
          { header: "Batch", key: "batch", width: 20 },
          { header: "Status", key: "status", width: 12 },
          { header: "Source", key: "source", width: 12 },
          { header: "Device", key: "device", width: 15 },
        ];
        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="attendance_${new Date().toISOString().slice(0, 10)}.xlsx"`);
        return res.send(buffer);
      }
      filter.studentId = { $in: linkedStudents };
      filter.userType = "Student"; // Parents can only export Student attendance
    } else if (userRole === "Teacher") {
      // Teacher can only export their own attendance
      filter.userId = userId_auth;
      filter.userType = "Teacher";
    }
    // SuperAdmin and Admin see all data (no filter)

    if (batchId && !filter.studentId) {
      // Only allow batchId filter for users who can see multiple records
      filter.batchId = batchId;
    }
    // Only apply userType query param if not already set by authorization
    if (userType && !filter.userType) filter.userType = userType;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate("studentId", "fname lname email phone")
      .populate("userId", "fname lname email")
      .populate("batchId", "name")
      .sort({ date: -1, timestamp: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 12 },
      { header: "User Type", key: "userType", width: 12 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Batch", key: "batch", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Source", key: "source", width: 12 },
      { header: "Device", key: "device", width: 15 },
    ];

    records.forEach((record) => {
      const user = record.studentId || record.userId;
      const firstName = user?.fname || "";
      const lastName = user?.lname || "";
      worksheet.addRow({
        date: record.date.toLocaleDateString(),
        time: record.timestamp.toLocaleTimeString(),
        userType: record.userType,
        name: user ? `${firstName} ${lastName}` : "",
        email: user?.email || "",
        batch: record.batchId?.name || "",
        status: record.status,
        source: record.source,
        device: record.deviceId,
      });
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting attendance:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    attendance.markedBy = "manual";
    attendance.markedByUser = req.user?.id;

    await attendance.save();

    const populated = await Attendance.findById(id)
      .populate("studentId", "fname lname email")
      .populate("userId", "fname lname email")
      .populate("batchId", "name");

    res.json({
      success: true,
      message: "Attendance updated successfully",
      attendance: populated,
    });
  } catch (err) {
    console.error("Error updating attendance:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Only allow deletion of manual entries
    if (attendance.source !== "manual") {
      return res.status(403).json({
        success: false,
        message: "Only manual attendance records can be deleted",
      });
    }

    await Attendance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting attendance:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const triggerDeviceSync = async (req, res) => {
  try {
    const { default: syncService } =
      await import("../services/attendanceSync.js");

    syncService.syncAllDevices().catch((err) => {
      console.error("Manual sync error:", err);
    });

    res.json({
      success: true,
      message: "Device sync triggered",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get attendance statistics for a specific user (Student or Teacher)
export const getUserAttendanceStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const filter = {};
    let actualId = userId;

    // Filter by user type
    if (userType === "Student") {
      // userId could be either Student ID or User ID - try to resolve it
      // First check if it's a Student ID directly
      const studentRecord = await Student.findById(userId).lean();
      if (studentRecord) {
        filter.studentId = userId;
      } else {
        // It might be a User ID, so find the associated Student
        const studentByUserId = await Student.findOne({ user_id: userId }).lean();
        if (studentByUserId) {
          filter.studentId = studentByUserId._id;
        } else {
          // Try both ways in the query
          filter.$or = [{ studentId: userId }, { userId: userId }];
        }
      }
    } else if (userType === "Teacher") {
      // For teachers, use userId directly (should be User ID)
      filter.userId = userId;
    } else {
      // If no type specified, check both fields
      filter.$or = [{ studentId: userId }, { userId: userId }];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Get all attendance records for this user
    const records = await Attendance.find(filter).lean();

    // Calculate statistics
    const totalClasses = records.length;
    const presentCount = records.filter(
      (r) => r.status === "present" || r.status === "late",
    ).length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;

    const percentage =
      totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalClasses,
        presentCount,
        absentCount,
        lateCount,
        percentage,
        text: `${presentCount}/${totalClasses}`,
      },
    });
  } catch (err) {
    console.error("Get user attendance stats error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
