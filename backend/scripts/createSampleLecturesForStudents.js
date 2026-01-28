// Script to create sample lectures for testing
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Lecture from "../models/Lecture.js";
import Batches from "../models/Batches.js";
import Course from "../models/Course.js";

async function createSampleLectures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if lectures already exist
    const existingLectures = await Lecture.countDocuments();
    if (existingLectures > 0) {
      console.log(
        `📚 ${existingLectures} lectures already exist. Skipping creation.`
      );
      return;
    }

    // Get or create a batch
    let batch = await Batches.findOne();
    if (!batch) {
      console.log("Creating default batch...");
      batch = new Batches({
        batch_name: "Default Batch",
        course_id: null,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_students: 50,
        status: "active",
      });
      await batch.save();
      console.log(`✅ Created batch: ${batch.batch_name}`);
    }

    // Get or create a course
    let course = await Course.findOne();
    if (!course) {
      console.log("Creating default course...");
      course = new Course({
        course_name: "Mathematics",
        course_code: "MATH101",
        description: "Basic Mathematics Course",
        duration: 6,
        status: "active",
      });
      await course.save();
      console.log(`✅ Created course: ${course.course_name}`);
    }

    // Create sample lectures
    const sampleLectures = [
      {
        title: "Introduction to Algebra",
        description: "Basic algebraic concepts and operations",
        course_id: course._id,
        batch_id: batch._id,
        date: new Date(),
        start_time: "10:00 AM",
        end_time: "11:00 AM",
        type: "theory",
        status: "scheduled",
      },
      {
        title: "Quadratic Equations",
        description: "Solving quadratic equations and their applications",
        course_id: course._id,
        batch_id: batch._id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        start_time: "10:00 AM",
        end_time: "11:00 AM",
        type: "theory",
        status: "scheduled",
      },
      {
        title: "Geometry Basics",
        description: "Introduction to geometric shapes and properties",
        course_id: course._id,
        batch_id: batch._id,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        start_time: "2:00 PM",
        end_time: "3:00 PM",
        type: "practical",
        status: "scheduled",
      },
    ];

    for (const lectureData of sampleLectures) {
      const lecture = new Lecture(lectureData);
      await lecture.save();
      console.log(`✅ Created lecture: ${lecture.title}`);
    }

    console.log(
      `\n🎉 Successfully created ${sampleLectures.length} sample lectures for batch: ${batch.batch_name}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleLectures();
