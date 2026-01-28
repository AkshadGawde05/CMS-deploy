import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/classroom_management";

async function addSimpleLecture() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Create a simple lecture document directly
    const simpleLecture = {
      course_id: new mongoose.Types.ObjectId(), // dummy ID for now
      batch_id: new mongoose.Types.ObjectId(), // dummy ID for now
      teacher_id: new mongoose.Types.ObjectId(), // dummy ID for now
      subject: "Test Subject",
      topic: "Test Topic",
      subtopic: "Test Subtopic",
      date: new Date(),
      lecture_start: new Date(),
      lecture_end: new Date(Date.now() + 90 * 60 * 1000), // 90 minutes later
      note: "This is a test lecture to verify the API is working",
      status: "scheduled",
      total_students: 10,
      attendance_count: 0,
      archived: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await mongoose.connection.db
      .collection("lectures")
      .insertOne(simpleLecture);
    console.log("✓ Created test lecture with ID:", result.insertedId);

    // Verify it was created
    const count = await mongoose.connection.db
      .collection("lectures")
      .countDocuments();
    console.log(`✓ Total lectures in database: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addSimpleLecture();
