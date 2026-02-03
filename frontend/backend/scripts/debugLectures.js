console.log("🔍 [DEBUG] Checking database state for lectures debugging...");

import mongoose from "mongoose";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Lecture from "../models/Lecture.js";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/classroom_management";

async function debugLectures() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if there are any students
    const studentCount = await Student.countDocuments();
    console.log(`📊 Total students: ${studentCount}`);

    if (studentCount > 0) {
      const sampleStudent = await Student.findOne()
        .populate("batch_id")
        .populate("course_id");
      console.log("👤 Sample student:", {
        _id: sampleStudent._id,
        name: `${sampleStudent.f_name} ${sampleStudent.l_name}`,
        batch: sampleStudent.batch_id?.name,
        course: sampleStudent.course_id?.name,
        batch_id: sampleStudent.batch_id?._id,
      });

      // Check if there are lectures for this student's batch
      if (sampleStudent.batch_id) {
        const lecturesForBatch = await Lecture.find({
          batch_id: sampleStudent.batch_id._id,
        })
          .populate("course_id", "name")
          .populate("batch_id", "name")
          .populate("teacher_id", "f_name l_name");

        console.log(
          `📚 Lectures for student's batch (${sampleStudent.batch_id.name}): ${lecturesForBatch.length}`
        );

        lecturesForBatch.forEach((lecture, index) => {
          console.log(`   ${index + 1}. ${lecture.subject} - ${lecture.topic}`);
        });
      }
    }

    // Check total lectures
    const totalLectures = await Lecture.countDocuments();
    console.log(`📚 Total lectures in database: ${totalLectures}`);

    if (totalLectures > 0) {
      const sampleLectures = await Lecture.find({})
        .populate("course_id", "name")
        .populate("batch_id", "name")
        .populate("teacher_id", "f_name l_name")
        .limit(5);

      console.log("📋 Sample lectures:");
      sampleLectures.forEach((lecture, index) => {
        console.log(
          `   ${index + 1}. ${lecture.subject} - ${lecture.topic} (Batch: ${
            lecture.batch_id?.name
          })`
        );
      });
    }

    // Check courses and batches
    const courseCount = await Course.countDocuments();
    const batchCount = await Batches.countDocuments();
    const teacherCount = await User.countDocuments({ role: "Teacher" });

    console.log(
      `📊 Courses: ${courseCount}, Batches: ${batchCount}, Teachers: ${teacherCount}`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugLectures();
