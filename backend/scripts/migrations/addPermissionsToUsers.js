// Migration script: Add permissions field to all existing users
// Usage: node scripts/migrations/addPermissionsToUsers.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import User, { getDefaultPermissions } from "../../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

async function migrate() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI missing in environment");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all users without permissions or with empty permissions
    const users = await User.find({
      $or: [
        { permissions: { $exists: false } },
        { permissions: {} },
        { permissions: null },
      ],
    });

    console.log(`📋 Found ${users.length} users needing permissions`);

    let updated = 0;
    for (const user of users) {
      const role = user.role || "Student";
      const defaultPerms = getDefaultPermissions(role);

      await User.updateOne(
        { _id: user._id },
        { $set: { permissions: defaultPerms } }
      );

      updated++;
      console.log(`✓ Updated ${user.email} (${role})`);
    }

    console.log(`\n✅ Migration complete: ${updated} users updated`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
