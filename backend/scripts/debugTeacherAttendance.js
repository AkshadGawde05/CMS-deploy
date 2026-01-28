import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Teacher from "../models/Teacher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function debugTeacherAttendance() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // Get one teacher attendance record
    const record = await Attendance.findOne({ userType: "Teacher" })
      .populate("userId")
      .populate("studentId")
      .lean();

    if (!record) {
      console.log("No teacher attendance records found");
      await mongoose.disconnect();
      return;
    }

    console.log("=== Attendance Record ===");
    console.log("_id:", record._id);
    console.log("userType:", record.userType);
    console.log("userId:", record.userId?._id || record.userId);
    console.log("studentId:", record.studentId?._id || record.studentId);
    console.log("deviceId:", record.deviceId);
    console.log("date:", record.date);
    console.log("status:", record.status);
    
    console.log("\n=== Populated userId (User document) ===");
    if (record.userId && typeof record.userId === 'object') {
      console.log("User ID:", record.userId._id);
      console.log("fname:", record.userId.fname);
      console.log("lname:", record.userId.lname);
      console.log("email:", record.userId.email);
      console.log("Full object:", JSON.stringify(record.userId, null, 2));
    } else {
      console.log("userId is not populated or is just an ID:", record.userId);
      
      // Try to fetch the User manually
      if (record.userId) {
        const user = await User.findById(record.userId).lean();
        console.log("\n=== Manual User lookup ===");
        if (user) {
          console.log("Found User:", user._id);
          console.log("fname:", user.fname);
          console.log("lname:", user.lname);
          console.log("email:", user.email);
          console.log("All fields:", Object.keys(user));
        } else {
          console.log("User not found!");
        }
      }
    }

    // Check if there's a teacher record
    const teacher = await Teacher.findOne({ user_id: record.userId._id || record.userId }).lean();
    if (teacher) {
      console.log("\n=== Teacher Record ===");
      console.log("Teacher ID:", teacher._id);
      console.log("user_id:", teacher.user_id);
      console.log("emp_no:", teacher.emp_no);
      console.log("device_user_id:", teacher.device_user_id);
    }

    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

debugTeacherAttendance();
