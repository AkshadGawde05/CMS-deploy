// Script to check and fix student records for lecture access
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import User from "../models/User.js";
import Student from "../models/Student.js";
import Batches from "../models/Batches.js";
import Lecture from "../models/Lecture.js";

async function fixStudentRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all users with role "Student"
    const studentUsers = await User.find({ role: "Student" });
    console.log(`📊 Found ${studentUsers.length} users with Student role`);

    for (const user of studentUsers) {
      console.log(`\n🔍 Checking user: ${user.email} (ID: ${user._id})`);

      // Check if this user has a Student record
      const studentRecord = await Student.findOne({ user_id: user._id });

      if (!studentRecord) {
        console.log(`❌ No Student record found for ${user.email}`);

        // Get first available batch
        const firstBatch = await Batches.findOne({});
        if (!firstBatch) {
          console.log(`❌ No batches found. Creating a sample batch...`);

          const newBatch = new Batches({
            batch_name: "Default Batch",
            course_id: null, // Will be null for now
            start_date: new Date(),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            max_students: 50,
            status: "active",
          });

          await newBatch.save();
          console.log(`✅ Created default batch: ${newBatch._id}`);

          // Create Student record
          const newStudent = new Student({
            user_id: user._id,
            student_id: `STU${Date.now()}`, // Generate simple student ID
            f_name: user.email.split("@")[0], // Use email prefix as name
            l_name: "Student",
            batch_id: newBatch._id,
            status: "active",
          });

          await newStudent.save();
          console.log(`✅ Created Student record for ${user.email}`);
        } else {
          console.log(
            `✅ Found batch: ${firstBatch.batch_name} (ID: ${firstBatch._id})`
          );

          // Create Student record with existing batch
          const newStudent = new Student({
            user_id: user._id,
            student_id: `STU${Date.now()}`, // Generate simple student ID
            f_name: user.email.split("@")[0], // Use email prefix as name
            l_name: "Student",
            batch_id: firstBatch._id,
            status: "active",
          });

          await newStudent.save();
          console.log(
            `✅ Created Student record for ${user.email} in batch ${firstBatch.batch_name}`
          );
        }
      } else {
        console.log(
          `✅ Student record exists: ${studentRecord.f_name} ${studentRecord.l_name}`
        );
        console.log(`   Batch ID: ${studentRecord.batch_id}`);

        if (studentRecord.batch_id) {
          const batch = await Batches.findById(studentRecord.batch_id);
          console.log(
            `   Batch: ${batch ? batch.batch_name : "Batch not found"}`
          );
        }
      }
    }

    // Check lectures
    const lectureCount = await Lecture.countDocuments({
      archived: { $ne: true },
    });
    console.log(`\n📚 Active lectures in database: ${lectureCount}`);

    if (lectureCount === 0) {
      console.log(
        "❌ No lectures found. You may need to create some lectures."
      );
    } else {
      const lectures = await Lecture.find({ archived: { $ne: true } }).limit(5);
      console.log("📖 Sample lectures:");
      lectures.forEach((lecture) => {
        console.log(`   - ${lecture.title} (Batch: ${lecture.batch_id})`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixStudentRecords();
