/**
 * PHASE 2-3: Centralized Attendance Business Logic
 * Single source of truth for attendance status calculation and lecture resolution
 */

/**
 * PHASE 3: Calculate attendance status based on check-in time and lecture schedule
 * @param {Date} checkInTime - When the user checked in
 * @param {Date} lectureStart - Lecture start time
 * @param {Date} lectureEnd - Lecture end time
 * @param {Object} config - Configuration { gracePeriodMinutes, lateWindowMinutes }
 * @returns {string} - Status: 'present', 'late', or 'auto_absent'
 */
export function calculateAttendanceStatus(
  checkInTime,
  lectureStart,
  lectureEnd,
  config = {}
) {
  if (!checkInTime || !lectureStart) {
    return "absent";
  }

  const checkIn = new Date(checkInTime);
  const start = new Date(lectureStart);
  const end = lectureEnd ? new Date(lectureEnd) : null;

  const gracePeriodMinutes = config.gracePeriodMinutes || 15;
  const lateWindowMinutes = config.lateWindowMinutes || 30;

  // Calculate time difference in minutes from lecture start
  const diffMinutes = (checkIn - start) / (1000 * 60);

  // Present: Within grace period
  if (diffMinutes <= gracePeriodMinutes) {
    return "present";
  }

  // Late: After grace but within late window
  if (diffMinutes <= lateWindowMinutes) {
    return "late";
  }

  // Auto-absent: After late window or after lecture ended
  if (end && checkIn > end) {
    return "auto_absent";
  }

  return "auto_absent";
}

/**
 * PHASE 2: Resolve lecture from existing batch schedules
 * @param {ObjectId} batchId - Batch ID
 * @param {Date} timestamp - Check-in timestamp
 * @param {Object} Lecture - Lecture model
 * @returns {Object|null} - Lecture object or null
 */
export async function resolveLectureFromSchedule(batchId, timestamp, Lecture) {
  try {
    const checkDate = new Date(timestamp);
    checkDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find lecture for this batch on this date
    const lecture = await Lecture.findOne({
      batch_id: batchId,
      date: { $gte: checkDate, $lt: nextDay },
      archived: { $ne: true },
    }).lean();

    return lecture;
  } catch (error) {
    console.error("Error resolving lecture:", error);
    return null;
  }
}

/**
 * PHASE 4: Check if lecture should auto-finalize absent students
 * @param {Object} lecture - Lecture object
 * @returns {boolean}
 */
export function shouldAutoFinalize(lecture) {
  if (!lecture || lecture.finalized) {
    return false;
  }

  const lectureEnd = new Date(lecture.lecture_end);
  const now = new Date();

  // Auto-finalize 30 minutes after lecture ends
  const finalizeDelayMinutes = 30;
  const finalizeTime = new Date(
    lectureEnd.getTime() + finalizeDelayMinutes * 60 * 1000
  );

  return now >= finalizeTime;
}

/**
 * Validate attendance data before saving
 * @param {Object} data - Attendance data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateAttendanceData(data) {
  const errors = [];

  if (!data.userId && !data.studentId) {
    errors.push("userId or studentId is required");
  }

  if (!data.date && !data.lectureId) {
    errors.push("date or lectureId is required");
  }

  const validStatuses = [
    "present",
    "late",
    "absent",
    "excused",
    "auto_absent",
    "device_scanned",
  ];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if attendance can be edited
 * @param {Object} attendance - Attendance record
 * @param {Object} lecture - Lecture (if available)
 * @returns {Object} - { allowed: boolean, reason: string }
 */
export function canEditAttendance(attendance, lecture) {
  // Cannot edit finalized lecture attendance
  if (lecture && lecture.finalized) {
    return { allowed: false, reason: "Lecture attendance is finalized" };
  }

  // Cannot edit auto-absent records (only manual override)
  if (attendance.status === "auto_absent" && attendance.markedBy === "system") {
    return {
      allowed: false,
      reason:
        "Cannot edit system-generated auto-absent. Use manual override instead.",
    };
  }

  return { allowed: true, reason: "" };
}
