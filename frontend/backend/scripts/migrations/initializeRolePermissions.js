// Migration script to initialize role-based permissions
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname (ESM fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env correctly
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI);

const MONGO_URI = process.env.MONGODB_URI;

import { getDefaultPermissions } from "../../models/User.js";
import RolePermissions from "../../models/RolePermissions.js";

async function initializeRolePermissions() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGODB_URI is undefined. Check your .env path.");
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const roles = ["Admin", "Teacher", "Student", "Parent"];

    for (const role of roles) {
      const existingRole = await RolePermissions.findOne({ role });

      if (existingRole) {
        console.log(`⚠️  Role "${role}" already exists, skipping...`);
        continue;
      }

      const defaultPermissions = getDefaultPermissions(role);

      await RolePermissions.create({
        role,
        permissions: defaultPermissions,
      });

      console.log(`✅ Created permissions for role: ${role}`);
    }

    console.log("\n🎉 Role permissions initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing role permissions:", error);
    process.exit(1);
  }
}

initializeRolePermissions();
