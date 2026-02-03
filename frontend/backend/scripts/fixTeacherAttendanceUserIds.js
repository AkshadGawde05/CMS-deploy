import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Attendance from "../models/Attendance.js";
import Teacher from "../models/Teacher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '..', '.env') });

async function fixTeacherAttendanceUserIds() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("MONGODB_URI not found in environment variables");
      console.log("Available env vars:", Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find all teacher attendance records
    const teacherAttendance = await Attendance.find({
      userType: "Teacher",
    }).lean();

    console.log(`Found ${teacherAttendance.length} teacher attendance records`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const record of teacherAttendance) {
      try {
        // Check if userId points to a Teacher document instead of User document
        const teacher = await Teacher.findById(record.userId).lean();
        
        if (teacher) {
          // This userId is a Teacher ID, not a User ID - fix it
          console.log(`Fixing record ${record._id}: Teacher ID ${record.userId} -> User ID ${teacher.user_id}`);
          
          await Attendance.updateOne(
            { _id: record._id },
            { $set: { userId: teacher.user_id } }
          );
          
          fixed++;
        } else {
          // userId doesn't point to a Teacher, so it's probably already correct
          alreadyCorrect++;
        }
      } catch (err) {
        console.error(`Error processing record ${record._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\nResults:`);
    console.log(`- Fixed: ${fixed}`);
    console.log(`- Already correct: ${alreadyCorrect}`);
    console.log(`- Errors: ${errors}`);

    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

fixTeacherAttendanceUserIds();
