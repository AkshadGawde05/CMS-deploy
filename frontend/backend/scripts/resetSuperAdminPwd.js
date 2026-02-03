// Usage: node scripts/resetSuperAdminPwd.js <newPassword>
// Defaults to SuperAdmin@123

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function main() {
  const newPassword = process.argv[2] || "SuperAdmin@123";
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ Missing MONGODB_URI / MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  // Find SuperAdmin user (your DB seems to use roleid/role fields; check both)
  const user = await User.findOne({
    $or: [{ role: "SuperAdmin" }, { roleid: "admin" }, { roleid: "superadmin" }]
  }).select("_id email role roleid");

  if (!user) {
    console.error("❌ SuperAdmin/Admin user not found");
    process.exit(2);
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  // IMPORTANT: set passwordhash (camelCase) to bcrypt hash directly
  await User.updateOne({ _id: user._id }, { $set: { passwordhash: hash } });

  console.log("✅ Password reset ok for email=%s newPassword=%s", user.email, newPassword);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("Reset failed:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(3);
});
