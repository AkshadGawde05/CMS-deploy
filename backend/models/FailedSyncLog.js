import mongoose from "mongoose";

const failedSyncLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    deviceUserId: { type: String, required: true, index: true },

    timestamp: { type: Date, required: true },
    date: { type: Date, required: true, index: true },

    logType: { type: String },
    verifyMode: { type: String },

    error: { type: String, required: true },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },

    raw: { type: Object }
  },
  { timestamps: true }
);

failedSyncLogSchema.index({ deviceId: 1, retryCount: 1 });
failedSyncLogSchema.index({ createdAt: 1 }); // For cleanup

export default mongoose.model("FailedSyncLog", failedSyncLogSchema);
