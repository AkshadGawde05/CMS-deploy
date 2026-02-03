// Directly set a single bcrypt hash for the SuperAdmin password via updateOne (no pre-save hook rehash)
// Usage from backend dir: node scripts/forceHashSuperAdmin.js superadmin@gmail.com NewStrongPass@123
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const [emailArg, newPwd] = process.argv.slice(2);
  if (!emailArg || !newPwd) {
    console.error(
      "Usage: node scripts/forceHashSuperAdmin.js <email> <newPassword>"
    );
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing");
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: emailArg.toLowerCase() });
  if (!user) {
    console.error("User not found:", emailArg);
    process.exit(3);
  }
  const hash = await bcrypt.hash(newPwd, 12);
  await User.updateOne({ _id: user._id }, { $set: { password_hash: hash } });
  console.log("Password forcibly reset for", emailArg);
  await mongoose.disconnect();
}
run().catch((e) => {
  console.error("Error:", e);
  process.exit(99);
});
