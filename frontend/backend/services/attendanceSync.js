import cron from "node-cron";
import BiomaxService from "./biomaxService.js";
import biomaxConfig from "../config/biomaxConfig.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Device from "../models/Device.js";
import BiometricRawLog from "../models/BiometricRawLog.js";
import Attendance from "../models/Attendance.js";
import FailedSyncLog from "../models/FailedSyncLog.js";
import Lecture from "../models/Lecture.js";
import Batches from "../models/Batches.js";
import {
  calculateAttendanceStatus,
  resolveLectureFromSchedule,
  shouldAutoFinalize,
} from "../utils/attendanceLogic.js";

class AttendanceSyncService {
  constructor() {
    this.devices = [];
    this.syncJob = null;
    this.isRunning = false;
  }

  async initialize() {
    console.log("🔄 Initializing attendance sync service...");

    for (const deviceConfig of biomaxConfig.devices) {
      const service = new BiomaxService(deviceConfig);
      this.devices.push({ service, config: deviceConfig });

      await Device.findOneAndUpdate(
        { deviceId: deviceConfig.id },
        {
          deviceId: deviceConfig.id,
          name: deviceConfig.name,
          model: deviceConfig.model,
          serialNumber: deviceConfig.serialNumber,
          host: deviceConfig.host,
          port: deviceConfig.port,
          cloudId: deviceConfig.cloudId,
          location: deviceConfig.location,
          firmware: deviceConfig.firmware,
          enabled: deviceConfig.enabled,
        },
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Initialized ${this.devices.length} devices`);
  }

  startSync() {
    if (this.isRunning) return;

    const intervalMinutes = biomaxConfig.sync.intervalMinutes || 1;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    console.log(`🕒 Starting sync every ${intervalMinutes} minutes`);
    this.syncJob = cron.schedule(cronExpression, async () => {
      await this.syncAllDevices();
    });

    this.isRunning = true;
    setTimeout(() => this.syncAllDevices(), 1500);
  }

  async syncAllDevices() {
    console.log("🔁 Starting sync cycle...");

    for (const { service, config } of this.devices) {
      if (!config.enabled) continue;

      try {
        await this.syncDevice(service, config);
        // Process raw logs to attendance after syncing
        await this.processRawLogsToAttendance(config.id);
      } catch (err) {
        console.error(`❌ Sync failed for ${config.name}:`, err.message);
      }
    }

    // PHASE 4: Auto-finalize lectures and mark absent users
    try {
      await this.autoFinalizeLectures();
    } catch (err) {
      console.error("❌ Auto-finalization failed:", err.message);
    }

    console.log("✅ Sync cycle complete");
  }

  normalizeLogType(logType) {
    if (logType === "checkout" || logType === "check_out") return "check_out";
    return "check_in";
  }

  /**
   * Parse timestamp from bridge response
   * Handles string (ISO), number (milliseconds), or date object
   */
  parseTimestamp(tsRaw) {
    try {
      if (typeof tsRaw === "string") {
        const d = new Date(tsRaw);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (typeof tsRaw === "number") {
        const d = new Date(tsRaw);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (tsRaw instanceof Date) {
        return Number.isNaN(tsRaw.getTime()) ? null : tsRaw;
      }
      return null;
    } catch (e) {
      console.warn(`⚠️ Failed to parse timestamp: ${tsRaw}`, e.message);
      return null;
    }
  }

  async syncDevice(service, config) {
    const device = await Device.findOne({ deviceId: config.id });
    const lastSync =
      device?.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(
      `📡 Syncing ${config.name}, last sync: ${lastSync.toISOString()}`
    );

    let logs = [];
    try {
      logs = await service.fetchAttendanceLogs(null);
    } catch (err) {
      console.error(
        `❌ Failed to fetch logs from ${config.name}:`,
        err.message
      );
      await Device.findOneAndUpdate(
        { deviceId: config.id },
        { status: "error", lastError: err.message }
      );
      return;
    }

    if (!logs || logs.length === 0) {
      console.log(`ℹ️ No new logs for ${config.name}`);
      await Device.findOneAndUpdate(
        { deviceId: config.id },
        { status: "online", lastSync: new Date() }
      );
      return;
    }

    console.log(`📥 Processing ${logs.length} log(s) from ${config.name}...`);

    let saved = 0;
    let skipped = 0;
    let failed = 0;

    for (const log of logs) {
      try {
        const ok = await this.saveRawLogOnly(log, config);
        if (ok) saved++;
        else skipped++;
      } catch (err) {
        console.error(
          `❌ Error saving log for device user ${log.deviceUserId}:`,
          err.message
        );
        failed++;
        // Store failed log for retry
        await this.storeFailedLogEntry(log, config, err);
      }
    }

    await Device.findOneAndUpdate(
      { deviceId: config.id },
      {
        status: "online",
        lastSync: new Date(),
        lastError: null,
        $inc: { totalLogsSynced: saved },
      }
    );

    console.log(
      `✅ ${config.name}: ${saved} raw saved, ${skipped} skipped, ${failed} failed`
    );
  }

  /**
   * Store failed sync logs for retry later
   */
  async storeFailedLogEntry(log, deviceConfig, error) {
    try {
      await FailedSyncLog.create({
        deviceId: deviceConfig.id,
        deviceUserId: String(log.deviceUserId),
        timestamp: this.parseTimestamp(log.timestamp) || new Date(),
        logType: log.logType,
        verifyMode: log.verifyMode,
        error: error.message,
        raw: log,
        retryCount: 0,
      });
    } catch (err) {
      console.error("❌ Failed to store failed sync log:", err.message);
    }
  }

  /**
   * Retry failed sync logs
   */
  async retryFailedLogs() {
    const maxRetries = 3;
    const failedLogs = await FailedSyncLog.find({
      retryCount: { $lt: maxRetries },
    }).limit(50);

    for (const entry of failedLogs) {
      try {
        const config = biomaxConfig.devices.find(
          (d) => d.id === entry.deviceId
        );
        if (!config) {
          await entry.deleteOne();
          continue;
        }

        const ok = await this.saveRawLogOnly(entry, config);
        if (ok) {
          await entry.deleteOne();
        } else {
          await entry.updateOne({ $inc: { retryCount: 1 } });
        }
      } catch (err) {
        await entry.updateOne({ $inc: { retryCount: 1 }, error: err.message });
      }
    }
  }

  async saveRawLogOnly(log, deviceConfig) {
    const deviceUserId = String(log.deviceUserId);
    const ts = this.parseTimestamp(log.timestamp);

    if (!ts) {
      console.warn(
        `⚠️ Invalid timestamp for device user ${deviceUserId}: ${log.timestamp}`
      );
      return false;
    }

    if (!deviceUserId) {
      console.warn(`⚠️ Missing device user ID in log:`, log);
      return false;
    }

    // Create deterministic unique ID
    const deviceLogId = `${deviceConfig.id}_${deviceUserId}_${ts.getTime()}`;

    // De-dupe in raw collection
    const existing = await BiometricRawLog.findOne({ deviceLogId }).lean();
    if (existing) {
      return false; // Already processed
    }

    // Match student or teacher (with fallback strategies)
    const { userId, userType, batchId } = await this.matchUserByDeviceId(
      deviceUserId
    );

    if (!userId) {
      console.warn(
        `⚠️ Could not match student/teacher for device user ID: ${deviceUserId}`
      );
    }

    const dateOnly = new Date(ts.toDateString());

    const doc = new BiometricRawLog({
      deviceId: deviceConfig.id,
      deviceUserId,
      deviceLogId,
      timestamp: ts,
      date: dateOnly,
      logType: this.normalizeLogType(log.logType),
      verifyMode: log.verifyMode || "fingerprint",
      userId: userId || null,
      userType: userType || null,
      batchId: batchId || null,
      processed: false,
      raw: log,
    });

    await doc.save();
    return true;
  }

  /**
   * Match user (student or teacher) by device_user_id with fallback strategies
   * Returns: { userId, userType, batchId }
   */
  async matchUserByDeviceId(deviceUserId) {
    try {
      // Strategy 1: Try to match student by device_user_id
      let student = await Student.findOne({ device_user_id: deviceUserId })
        .select("user_id batch_id")
        .lean();

      if (student) {
        return {
          userId: student.user_id,
          userType: "Student",
          batchId: student.batch_id,
        };
      }

      // Strategy 2: Try to match teacher by device_user_id
      let teacher = await Teacher.findOne({ device_user_id: deviceUserId })
        .select("user_id")
        .lean();

      if (teacher) {
        return {
          userId: teacher.user_id,
          userType: "Teacher",
          batchId: null,
        };
      }

      // Strategy 3: If numeric ID, try matching by enrollment ID (student)
      if (/^\d+$/.test(deviceUserId)) {
        student = await Student.findOne({
          enrollmentId: deviceUserId,
        })
          .select("user_id batch_id")
          .lean();

        if (student) {
          // Auto-update device_user_id for future syncs
          await Student.updateOne(
            { _id: student._id },
            { device_user_id: deviceUserId }
          );
          return {
            userId: student.user_id,
            userType: "Student",
            batchId: student.batch_id,
          };
        }
      }

      return { userId: null, userType: null, batchId: null };
    } catch (err) {
      console.error(
        `❌ Error matching user for device ID ${deviceUserId}:`,
        err.message
      );
      return { userId: null, userType: null, batchId: null };
    }
  }

  /**
   * Process raw logs to generate attendance records
   * This is the critical pipeline: raw device logs → processed attendance
   */
  async processRawLogsToAttendance(deviceId) {
    console.log(
      `🔄 Processing raw logs to attendance for device ${deviceId}...`
    );

    const unprocessedLogs = await BiometricRawLog.find({
      deviceId,
      processed: false,
      userId: { $ne: null },
    }).sort({ timestamp: 1 });

    if (unprocessedLogs.length === 0) {
      console.log(`ℹ️ No unprocessed logs to convert to attendance`);
      return;
    }

    // Group by user and date to process check-in/check-out pairs
    const grouped = {};
    for (const log of unprocessedLogs) {
      const dateStr = log.date.toDateString();
      const key = `${log.userId}_${dateStr}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(log);
    }

    let processed = 0;
    let errors = 0;

    for (const key in grouped) {
      try {
        const logsForDay = grouped[key];
        await this.createAttendanceFromLogs(logsForDay);

        // Mark all logs as processed
        const logIds = logsForDay.map((l) => l._id);
        await BiometricRawLog.updateMany(
          { _id: { $in: logIds } },
          { processed: true }
        );

        processed += logsForDay.length;
      } catch (err) {
        console.error(`❌ Error processing logs for ${key}:`, err.message);
        errors++;
      }
    }

    console.log(`✅ Processed ${processed} logs, ${errors} errors`);
  }

  /**
   * Create a single attendance record from logs for a user on a day
   * Handles check-in/check-out logic
   */
  async createAttendanceFromLogs(logsForDay) {
    if (!logsForDay || logsForDay.length === 0) return;

    // Sort by timestamp to get first check-in
    logsForDay.sort((a, b) => a.timestamp - b.timestamp);

    const firstLog = logsForDay[0];
    const userId = firstLog.userId;
    const userType = firstLog.userType;
    const date = firstLog.date;
    const batchId = firstLog.batchId;
    const firstTimestamp = firstLog.timestamp;

    // Check if attendance already exists for this user/date/type
    const existing = await Attendance.findOne({
      userId,
      date,
      userType,
    });

    if (existing) {
      // Update existing record with latest device info
      existing.timestamp = firstTimestamp;
      existing.deviceId = firstLog.deviceId;
      existing.logType = firstLog.logType;
      existing.verifyMode = firstLog.verifyMode;
      existing.syncedAt = new Date();
      await existing.save();
      console.log(
        `✅ Updated attendance for ${userType} ${userId} on ${date.toDateString()}`
      );
      return;
    }

    // PHASE 2: Try to resolve lecture for this attendance
    let lecture = null;
    let lectureId = null;

    if (batchId) {
      lecture = await resolveLectureFromSchedule(
        batchId,
        firstTimestamp,
        Lecture
      );
      if (lecture) {
        lectureId = lecture._id;
      }
    }

    // PHASE 3: Calculate status using centralized logic
    let status = "present";
    let logType = "check_in";

    if (lecture && lecture.lecture_start && lecture.lecture_end) {
      // Use lecture-aware status calculation
      status = calculateAttendanceStatus(
        firstTimestamp,
        lecture.lecture_start,
        lecture.lecture_end,
        {
          gracePeriodMinutes: biomaxConfig.attendance?.gracePeriodMinutes || 15,
          lateWindowMinutes: biomaxConfig.attendance?.lateWindowMinutes || 30,
        }
      );
    } else {
      // Fallback to legacy logic if no lecture found
      const lateThreshold = biomaxConfig.attendance?.lateThresholdMinutes || 15;
      const scheduledStart = await this.getScheduledStartTime(
        batchId,
        date,
        userType,
        userId
      );

      if (scheduledStart) {
        const lateMinutes = (firstTimestamp - scheduledStart) / (1000 * 60);
        if (lateMinutes > lateThreshold && lateMinutes > 0) {
          status = "late";
        }
      }
    }

    // If multiple logs (check-in + check-out), use last log type
    if (logsForDay.length > 1) {
      const lastLog = logsForDay[logsForDay.length - 1];
      logType = lastLog.logType;
    }

    // Create attendance record
    try {
      const attendance = new Attendance({
        userId,
        studentId: userType === "Student" ? userId : null, // Keep studentId for backward compatibility
        batchId,
        userType,
        deviceId: firstLog.deviceId,
        timestamp: firstTimestamp,
        date,
        logType,
        verifyMode: firstLog.verifyMode,
        status,
        source: "biometric",
        syncedAt: new Date(),
        // PHASE 2-3: Add lecture-aware fields
        lectureId: lectureId || null,
        checkInTime: firstTimestamp,
        markedBy: "biometric",
      });

      await attendance.save();
      console.log(
        `✅ Created attendance for ${userType} ${userId} on ${date.toDateString()}: ${status}`
      );
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key - try to update existing
        console.log(
          `⚠️ Duplicate record, attempting update for ${userId} on ${date.toDateString()}`
        );
        const updated = await Attendance.findOneAndUpdate(
          { userId, date, userType },
          {
            timestamp: firstTimestamp,
            deviceId: firstLog.deviceId,
            logType,
            verifyMode: firstLog.verifyMode,
            status,
            syncedAt: new Date(),
          },
          { new: true }
        );
        if (updated) {
          console.log(`✅ Updated duplicate record for ${userId}`);
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * PHASE 4: Auto-finalize lectures and mark absent users
   * Runs 30 minutes after lecture ends
   * Idempotent - only marks users who have no attendance record
   */
  async autoFinalizeLectures() {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Find lectures that ended at least 30 minutes ago and are not finalized
    const lecturesToFinalize = await Lecture.find({
      lecture_end: { $lte: thirtyMinutesAgo },
      finalized: { $ne: true },
      archived: { $ne: true },
    })
      .select("_id batch_id lecture_end")
      .lean();

    if (lecturesToFinalize.length === 0) {
      return;
    }

    console.log(
      `📋 Found ${lecturesToFinalize.length} lectures to auto-finalize`
    );

    for (const lecture of lecturesToFinalize) {
      try {
        // Check if lecture should be finalized
        if (!shouldAutoFinalize(lecture)) {
          continue;
        }

        // Get batch to find all enrolled students
        const batch = await Batches.findById(lecture.batch_id).lean();
        if (!batch) {
          console.warn(`⚠️ Batch not found for lecture ${lecture._id}`);
          continue;
        }

        // Find all students in this batch
        const students = await Student.find({
          batch_id: lecture.batch_id,
          status: true,
        })
          .select("_id user_id")
          .lean();

        if (students.length === 0) {
          console.log(`ℹ️ No students found for batch ${batch.name}`);
          // Still mark as finalized even if no students
          await Lecture.findByIdAndUpdate(lecture._id, {
            finalized: true,
            finalizedAt: new Date(),
            finalizedBy: null, // System finalization
          });
          continue;
        }

        // Check which students have no attendance record for this lecture
        const existingAttendance = await Attendance.find({
          lectureId: lecture._id,
        })
          .select("userId")
          .lean();

        const attendedUserIds = new Set(
          existingAttendance.map((a) => a.userId?.toString())
        );

        // Mark absent students
        let absentCount = 0;
        for (const student of students) {
          const userId = student.user_id?.toString() || student._id.toString();

          // Skip if already has attendance record
          if (attendedUserIds.has(userId)) {
            continue;
          }

          // Create auto-absent record
          const lectureDate = new Date(lecture.lecture_end);
          lectureDate.setHours(0, 0, 0, 0);

          await Attendance.create({
            userId: student.user_id || student._id,
            studentId: student._id,
            userType: "Student",
            batchId: lecture.batch_id,
            lectureId: lecture._id,
            deviceId: "system",
            timestamp: lecture.lecture_end,
            date: lectureDate,
            status: "auto_absent",
            source: "biometric",
            markedBy: "system",
            checkInTime: null,
          });

          absentCount++;
        }

        // Mark lecture as finalized
        await Lecture.findByIdAndUpdate(lecture._id, {
          finalized: true,
          finalizedAt: new Date(),
          finalizedBy: null, // System finalization
        });

        console.log(
          `✅ Finalized lecture ${lecture._id}: marked ${absentCount} students as auto_absent`
        );
      } catch (err) {
        console.error(
          `❌ Failed to finalize lecture ${lecture._id}:`,
          err.message
        );
      }
    }
  }

  /**
   * Get scheduled class start time for a batch on a given date
   * Used to determine if attendance is late
   */
  async getScheduledStartTime(batchId, date, userType, userId) {
    try {
      // Dynamically import Lecture model
      const { default: Lecture } = await import("../models/Lecture.js");

      if (userType === "Student" && batchId) {
        // For students, find lecture for their batch
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const lecture = await Lecture.findOne({
          batch_id: batchId,
          date: {
            $gte: dateStart,
            $lte: dateEnd,
          },
        })
          .select("lecture_start")
          .lean();

        if (lecture) {
          return new Date(lecture.lecture_start);
        }
      } else if (userType === "Teacher") {
        // For teachers, find their first lecture of the day
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const lecture = await Lecture.findOne({
          teacher_id: userId,
          date: {
            $gte: dateStart,
            $lte: dateEnd,
          },
        })
          .select("lecture_start")
          .lean();

        if (lecture) {
          return new Date(lecture.lecture_start);
        }
      }

      return null;
    } catch (err) {
      console.warn(`⚠️ Could not get scheduled start time:`, err.message);
      return null;
    }
  }
}

const syncService = new AttendanceSyncService();
export default syncService;
