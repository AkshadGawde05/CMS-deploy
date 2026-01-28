/*
  Migration: Add role (RBAC) and linkedStudents to User documents
  Usage:
    NODE_OPTIONS=--experimental-modules node scripts/migrations/add-role-linkedStudents.js
  Note: Ensure MONGODB_URI is set in .env.
*/
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Parent from "../../models/Parent.js";

dotenv.config();

function mapLegacy(role_id) {
  switch (role_id) {
    case "admin":
      return "Admin";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    default:
      return "Student";
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // 1) Ensure all users have a role based on legacy role_id or default Student
  const users = await User.find({});
  let updatedCount = 0;
  for (const u of users) {
    if (!u.role) {
      u.role = mapLegacy(u.role_id);
      updatedCount++;
      await u.save();
    }
  }
  console.log(`Updated role for ${updatedCount} users`);

  // 2) Populate linkedStudents for parent users from Parent collection
  const parents = await Parent.aggregate([
    { $group: { _id: "$user_id", students: { $addToSet: "$student_id" } } },
  ]);
  let parentsUpdated = 0;
  for (const p of parents) {
    const user = await User.findById(p._id);
    if (!user) continue;
    if (
      !Array.isArray(user.linkedStudents) ||
      user.linkedStudents.length === 0
    ) {
      user.linkedStudents = p.students;
      if (!user.role) user.role = "Parent";
      await user.save();
      parentsUpdated++;
    }
  }
  console.log(`Populated linkedStudents for ${parentsUpdated} parents`);

  await mongoose.disconnect();
  console.log("Done");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
