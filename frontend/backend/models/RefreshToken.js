import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    device: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { collection: "refresh_tokens" }
);

// Helpful compound index to query active sessions quickly
RefreshTokenSchema.index({ userId: 1, revoked: 1, expiresAt: 1 });

export default mongoose.model("RefreshToken", RefreshTokenSchema);
