import mongoose from "mongoose";
import Lecture from "../models/Lecture.js";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/classroom_management";

async function createSampleLectures() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if lectures already exist
    const existingLectures = await Lecture.countDocuments();
    if (existingLectures > 0) {
      console.log(`${existingLectures} lectures already exist in database`);
      process.exit(0);
    }

    // Get some sample courses, batches, and teachers
    const courses = await Course.find().limit(3);
    const batches = await Batches.find().limit(3);
    const teachers = await User.find({ role: "Teacher" }).limit(3);

    if (courses.length === 0 || batches.length === 0 || teachers.length === 0) {
      console.log(
        "Need courses, batches, and teachers to create sample lectures"
      );
      console.log(
        `Found: ${courses.length} courses, ${batches.length} batches, ${teachers.length} teachers`
      );
      process.exit(1);
    }

    const sampleLectures = [
      {
        course_id: courses[0]._id,
        batch_id: batches[0]._id,
        teacher_id: teachers[0]._id,
        subject: "Mathematics",
        topic: "Algebra Fundamentals",
        subtopic: "Linear Equations",
        // Note: You can now optionally use syllabus_item_id instead of hardcoding subject/topic/subtopic
        // syllabus_item_id: syllabusItemId, // Optional reference to syllabus item
        date: new Date("2024-11-15"),
        lecture_start: new Date("2024-11-15T10:00:00Z"),
        lecture_end: new Date("2024-11-15T11:30:00Z"),
        note: "Introduction to linear equations with practical examples",
        status: "scheduled",
        total_students: 25,
        attendance_count: 0,
      },
      {
        course_id: courses[1] ? courses[1]._id : courses[0]._id,
        batch_id: batches[1] ? batches[1]._id : batches[0]._id,
        teacher_id: teachers[1] ? teachers[1]._id : teachers[0]._id,
        subject: "Physics",
        topic: "Mechanics",
        subtopic: "Newton's Laws",
        date: new Date("2024-11-16"),
        lecture_start: new Date("2024-11-16T14:00:00Z"),
        lecture_end: new Date("2024-11-16T15:30:00Z"),
        note: "Understanding force, mass, and acceleration",
        status: "scheduled",
        total_students: 20,
        attendance_count: 0,
      },
      {
        course_id: courses[2] ? courses[2]._id : courses[0]._id,
        batch_id: batches[2] ? batches[2]._id : batches[0]._id,
        teacher_id: teachers[2] ? teachers[2]._id : teachers[0]._id,
        subject: "Chemistry",
        topic: "Organic Chemistry",
        subtopic: "Hydrocarbons",
        date: new Date("2024-11-17"),
        lecture_start: new Date("2024-11-17T09:00:00Z"),
        lecture_end: new Date("2024-11-17T10:30:00Z"),
        note: "Classification and properties of hydrocarbons",
        status: "completed",
        total_students: 30,
        attendance_count: 28,
      },
    ];

    const createdLectures = await Lecture.insertMany(sampleLectures);
    console.log(
      `Created ${createdLectures.length} sample lectures successfully!`
    );

    process.exit(0);
  } catch (error) {
    console.error("Error creating sample lectures:", error);
    process.exit(1);
  }
}

createSampleLectures();
