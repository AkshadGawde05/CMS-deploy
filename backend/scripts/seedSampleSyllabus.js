import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";
import Syllabus from "../models/Syllabus.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in environment");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const courseName = "JEE";
  const batchName = "Morning";
  const subject = "Mathematics";

  // Find course and batch by name
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    console.error(`❌ Course '${courseName}' not found. Create it first.`);
    process.exit(1);
  }

  const batch = await Batches.findOne({ name: batchName, course_id: course._id });
  if (!batch) {
    console.error(`❌ Batch '${batchName}' for course '${courseName}' not found. Create it first.`);
    process.exit(1);
  }

  // Upsert syllabus for this course+batch (no academic_year filter here for simplicity)
  const sampleItems = [
    { subject, topic: "Limits and Continuity", subtopic: "Left-hand and Right-hand limits", description: "Basics of limits" },
    { subject, topic: "Limits and Continuity", subtopic: "Continuity at a point", description: "Continuity definition" },
    { subject, topic: "Derivatives", subtopic: "Basics of differentiation", description: "Intro to derivatives" },
    { subject, topic: "Derivatives", subtopic: "Chain rule", description: "Applying chain rule" },
    { subject, topic: "Integrals", subtopic: "Indefinite integrals", description: "Basic integration" },
  ];

  const syllabus = await Syllabus.findOneAndUpdate(
    { course_id: course._id, batch_id: batch._id },
    {
      course_id: course._id,
      batch_id: batch._id,
      academic_year: "2024-2025",
      items: sampleItems,
      created_by: batch.teacher_id || course.created_by || course.updated_by || null,
      updated_by: batch.teacher_id || course.updated_by || null,
      updated_at: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log("✅ Seeded syllabus for", courseName, batchName, "items:", syllabus.items.length);
  await mongoose.disconnect();
  console.log("✅ Disconnected");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seed script failed", err);
  process.exit(1);
});
