import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    device: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

// Optional TTL: remove OTP docs 1 day after expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export default mongoose.model("Otp", OtpSchema);
