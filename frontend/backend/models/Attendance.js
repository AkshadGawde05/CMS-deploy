import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    // Student attendance (optional - for backward compatibility)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      index: true,
    },

    // Generic user ID (supports both student and teacher)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    // User type: Student or Teacher
    userType: {
      type: String,
      enum: ["Student", "Teacher"],
      required: false,
      index: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batches",
      index: true,
    },

    deviceId: { type: String, required: true, index: true },

    timestamp: { type: Date, required: true, index: true },

    date: { type: Date, required: true, index: true },

    logType: {
      type: String,
      enum: ["check_in", "check_out"],
      default: "check_in",
    },

    verifyMode: {
      type: String,
      enum: ["fingerprint", "password", "card", "face"],
      default: "fingerprint",
    },

    status: {
      type: String,
      enum: [
        "present",
        "late",
        "absent",
        "excused",
        "device_scanned",
        "auto_absent",
      ],
      default: "device_scanned",
    },

    source: {
      type: String,
      enum: ["biometric", "manual", "bulk_upload"],
      default: "biometric",
      required: true,
    },

    notes: String,

    markedBy: {
      type: String,
      enum: ["biometric", "manual", "system", "admin"],
      default: "biometric",
    },

    markedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // PHASE 1: Lecture-aware fields (nullable for backward compatibility)
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: false,
      index: true,
    },

    checkInTime: {
      type: Date,
      required: false,
    },

    editReason: {
      type: String,
      required: false,
    },

    syncedAt: Date,
  },
  { timestamps: true }
);

// Comprehensive indexes for fast queries
attendanceSchema.index({ studentId: 1, date: -1 });
attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index({ userType: 1, date: -1 });
attendanceSchema.index({ batchId: 1, date: -1 });
attendanceSchema.index({ deviceId: 1, timestamp: -1 });
// PHASE 1: Lecture-based indexes
attendanceSchema.index({ lectureId: 1, userId: 1 });
attendanceSchema.index({ lectureId: 1, status: 1 });
attendanceSchema.index({ date: -1, status: 1 });
attendanceSchema.index({ userId: 1, userType: 1, date: -1 });

// Compound index for efficient daily reports
attendanceSchema.index({ date: 1, batchId: 1, status: 1 });

export default mongoose.model("Attendance", attendanceSchema);
