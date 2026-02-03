import mongoose from "mongoose";

const biometricRawLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, index: true },
    deviceUserId: { type: String, index: true },

    timestamp: { type: Date, required: true, index: true },
    date: { type: Date, required: true, index: true },

    logType: { type: String },     // checkin / checkout
    verifyMode: { type: String },  // fingerprint / face / card / etc

    // deterministic unique key so you don't store duplicates
    deviceLogId: { type: String, unique: true, index: true },

    // User references (supports both student and teacher)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userType: { type: String, enum: ["Student", "Teacher"], default: null },
    
    // optional: link if found
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batches", default: null },

    // Track if this raw log has been processed into an Attendance record
    processed: { type: Boolean, default: false, index: true },

    raw: { type: Object }
  },
  { timestamps: true }
);

biometricRawLogSchema.index({ deviceId: 1, timestamp: -1 });
biometricRawLogSchema.index({ deviceUserId: 1, timestamp: -1 });
biometricRawLogSchema.index({ userId: 1, date: -1 });
biometricRawLogSchema.index({ processed: 1, userId: 1 });

export default mongoose.model("BiometricRawLog", biometricRawLogSchema);
