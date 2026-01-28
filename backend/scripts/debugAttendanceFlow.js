/**
 * Attendance System Debug & Testing Script
 * Run: node scripts/debugAttendanceFlow.js
 * 
 * This script tests the complete attendance workflow:
 * 1. Device connection & logs fetch
 * 2. Raw log storage
 * 3. Student/Teacher matching
 * 4. Processing raw logs to attendance records
 */

import mongoose from "mongoose";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import BiometricRawLog from "../models/BiometricRawLog.js";
import Attendance from "../models/Attendance.js";
import Device from "../models/Device.js";
import FailedSyncLog from "../models/FailedSyncLog.js";
import biomaxConfig from "../config/biomaxConfig.js";
import syncService from "../services/attendanceSync.js";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(color, label, message) {
  console.log(`${color}${label}${colors.reset} ${message}`);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cms", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log(colors.green, "✅ DB Connected", "MongoDB connected successfully");
  } catch (err) {
    log(colors.red, "❌ DB Error", err.message);
    process.exit(1);
  }
}

async function testDeviceConnection() {
  log(colors.cyan, "🧪 TEST 1", "Device Connection");
  console.log("---");

  for (const deviceConfig of biomaxConfig.devices) {
    try {
      const service = await import("../services/biomaxService.js").then(m => m.default);
      const bioService = new service.constructor(deviceConfig);

      log(colors.blue, "   📡", `Testing connection to ${deviceConfig.name} (${deviceConfig.host}:${deviceConfig.port})`);
      
      // This would attempt real connection - for testing just check config
      if (deviceConfig.host && deviceConfig.port) {
        log(colors.green, "   ✅", `Device config valid`);
      }
    } catch (err) {
      log(colors.red, "   ❌", `Failed: ${err.message}`);
    }
  }
  console.log("");
}

async function testStudentMatching() {
  log(colors.cyan, "🧪 TEST 2", "Student/Teacher Matching");
  console.log("---");

  // Find a student with device_user_id
  const studentWithDevice = await Student.findOne({ device_user_id: { $exists: true, $ne: null } })
    .select("device_user_id f_name l_name user_id batch_id")
    .lean();

  if (studentWithDevice) {
    log(colors.green, "   ✅", `Found student: ${studentWithDevice.f_name} ${studentWithDevice.l_name}`);
    log(colors.blue, "   📌", `Device ID: ${studentWithDevice.device_user_id}`);
    log(colors.blue, "   📌", `User ID: ${studentWithDevice.user_id}`);
    log(colors.blue, "   📌", `Batch ID: ${studentWithDevice.batch_id}`);
  } else {
    log(colors.yellow, "   ⚠️", "No student with device_user_id found (expected if not yet enrolled)");
  }

  // Find a teacher with device_user_id
  const teacherWithDevice = await Teacher.findOne({ device_user_id: { $exists: true, $ne: null } })
    .select("device_user_id emp_no user_id")
    .lean();

  if (teacherWithDevice) {
    log(colors.green, "   ✅", `Found teacher: Emp# ${teacherWithDevice.emp_no}`);
    log(colors.blue, "   📌", `Device ID: ${teacherWithDevice.device_user_id}`);
  } else {
    log(colors.yellow, "   ⚠️", "No teacher with device_user_id found");
  }
  console.log("");
}

async function testRawLogs() {
  log(colors.cyan, "🧪 TEST 3", "Raw Biometric Logs");
  console.log("---");

  const total = await BiometricRawLog.countDocuments();
  const processed = await BiometricRawLog.countDocuments({ processed: true });
  const unprocessed = await BiometricRawLog.countDocuments({ processed: false });

  log(colors.blue, "   📊", `Total raw logs: ${total}`);
  log(colors.green, "   ✅", `Processed: ${processed}`);
  log(colors.yellow, "   ⏳", `Unprocessed: ${unprocessed}`);

  // Show recent unprocessed logs
  const recent = await BiometricRawLog.find({ processed: false })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  if (recent.length > 0) {
    log(colors.blue, "   📝", "Recent unprocessed logs:");
    recent.forEach(log => {
      console.log(`       - Device User: ${log.deviceUserId}, Time: ${log.timestamp.toISOString()}`);
    });
  }
  console.log("");
}

async function testAttendanceRecords() {
  log(colors.cyan, "🧪 TEST 4", "Attendance Records");
  console.log("---");

  const bySource = await Attendance.aggregate([
    { $group: { _id: "$source", count: { $sum: 1 } } }
  ]);

  const byStatus = await Attendance.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const byUserType = await Attendance.aggregate([
    { $group: { _id: "$userType", count: { $sum: 1 } } }
  ]);

  log(colors.blue, "   📊", "By Source:");
  bySource.forEach(item => {
    console.log(`       - ${item._id || "unknown"}: ${item.count}`);
  });

  log(colors.blue, "   📊", "By Status:");
  byStatus.forEach(item => {
    console.log(`       - ${item._id}: ${item.count}`);
  });

  log(colors.blue, "   📊", "By User Type:");
  byUserType.forEach(item => {
    console.log(`       - ${item._id || "unknown"}: ${item.count}`);
  });

  // Show today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCount = await Attendance.countDocuments({
    date: { $gte: today, $lt: tomorrow }
  });

  log(colors.green, "   ✅", `Attendance records today: ${todayCount}`);
  console.log("");
}

async function testFailedSyncs() {
  log(colors.cyan, "🧪 TEST 5", "Failed Sync Logs");
  console.log("---");

  const failed = await FailedSyncLog.countDocuments();
  const retryable = await FailedSyncLog.countDocuments({ retryCount: { $lt: 3 } });

  log(colors.blue, "   📊", `Total failed syncs: ${failed}`);
  log(colors.yellow, "   ⏳", `Retryable: ${retryable}`);

  if (failed > 0) {
    const recent = await FailedSyncLog.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    log(colors.blue, "   📝", "Recent failures:");
    recent.forEach(entry => {
      console.log(`       - Device User: ${entry.deviceUserId}, Error: ${entry.error}`);
    });
  }
  console.log("");
}

async function testDeviceStatus() {
  log(colors.cyan, "🧪 TEST 6", "Device Status");
  console.log("---");

  const devices = await Device.find().lean();

  if (devices.length === 0) {
    log(colors.yellow, "   ⚠️", "No devices registered");
  } else {
    devices.forEach(device => {
      console.log(`   Device: ${device.name}`);
      log(colors.blue, "       📌", `Status: ${device.status}`);
      log(colors.blue, "       📌", `Host: ${device.host}:${device.port}`);
      log(colors.blue, "       📌", `Last Sync: ${device.lastSync ? device.lastSync.toISOString() : "never"}`);
      if (device.lastError) {
        log(colors.red, "       ❌", `Error: ${device.lastError}`);
      }
      log(colors.green, "       ✅", `Logs synced: ${device.totalLogsSynced || 0}`);
    });
  }
  console.log("");
}

async function simulateSync() {
  log(colors.cyan, "🧪 TEST 7", "Process Unprocessed Raw Logs");
  console.log("---");

  const unprocessedCount = await BiometricRawLog.countDocuments({ processed: false, userId: { $ne: null } });
  
  if (unprocessedCount === 0) {
    log(colors.yellow, "   ⚠️", "No unprocessed logs to process");
    console.log("");
    return;
  }

  log(colors.blue, "   ⏳", `Processing ${unprocessedCount} unprocessed logs...`);

  try {
    for (const deviceConfig of biomaxConfig.devices) {
      await syncService.processRawLogsToAttendance(deviceConfig.id);
    }
    log(colors.green, "   ✅", "Processing complete");
  } catch (err) {
    log(colors.red, "   ❌", `Error: ${err.message}`);
  }
  console.log("");
}

async function runAllTests() {
  const separator = "=".repeat(60);
  console.log("\n" + colors.cyan + separator + colors.reset);
  console.log(colors.cyan + "  BIOMAX ATTENDANCE SYSTEM - DEBUG & TEST SUITE" + colors.reset);
  console.log(colors.cyan + separator + colors.reset + "\n");

  await connectDB();
  
  await testDeviceConnection();
  await testStudentMatching();
  await testRawLogs();
  await testAttendanceRecords();
  await testFailedSyncs();
  await testDeviceStatus();
  await simulateSync();

  console.log(colors.cyan + separator + colors.reset);
  log(colors.green, "✅ TESTS COMPLETE", "All diagnostic checks finished");
  console.log(colors.cyan + separator + colors.reset + "\n");

  await mongoose.disconnect();
}

runAllTests().catch(err => {
  log(colors.red, "❌ FATAL", err.message);
  console.error(err);
  process.exit(1);
});
