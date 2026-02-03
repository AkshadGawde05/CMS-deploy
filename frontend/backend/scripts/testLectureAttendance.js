import mongoose from "mongoose";
import Lecture from "../models/Lecture.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";

const MONGO_URI = "mongodb://localhost:27017/cms";

async function testLectureAttendance() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get one recent lecture
    const lecture = await Lecture.findOne()
      .sort({ date: -1 })
      .populate("batch_id", "name")
      .populate("course_id", "name");

    if (!lecture) {
      console.log("❌ No lectures found");
      return;
    }

    console.log("📚 Testing Lecture:");
    console.log("  - Topic:", lecture.topic);
    console.log("  - Date:", lecture.date);
    console.log("  - Batch:", lecture.batch_id?.name || "N/A");
    console.log("  - Lecture ID:", lecture._id);
    console.log("");

    // Count students in the batch
    const totalStudents = await Student.countDocuments({
      batch_id: lecture.batch_id?._id,
    });
    console.log("👥 Total students in batch:", totalStudents);
    console.log("");

    // Check attendance records for this lecture
    const lectureDate = new Date(lecture.date);
    const startOfDay = new Date(lectureDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(lectureDate.setHours(23, 59, 59, 999));

    const attendanceRecords = await Attendance.find({
      lectureId: lecture._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      userType: "Student",
    }).populate("userId", "f_name l_name");

    console.log("📝 Attendance records for this lecture:", attendanceRecords.length);
    attendanceRecords.forEach((record, i) => {
      const userName = record.userId
        ? `${record.userId.f_name} ${record.userId.l_name}`
        : "Unknown";
      console.log(`  ${i + 1}. ${userName} - Status: ${record.status}`);
    });
    console.log("");

    // Count present/late students
    const attendedCount = await Attendance.countDocuments({
      lectureId: lecture._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      userType: "Student",
      status: { $in: ["present", "late"] },
    });

    console.log("✅ Students marked present/late:", attendedCount);
    console.log("📊 Attendance: " + attendedCount + "/" + totalStudents);
    
    if (totalStudents > 0) {
      const percentage = Math.round((attendedCount / totalStudents) * 100);
      console.log("📈 Percentage:", percentage + "%");
    }
    console.log("");

    // Check lecture state
    const now = new Date();
    const lectureStart = new Date(lecture.lecture_start);
    const lectureEnd = new Date(lecture.lecture_end);

    let state = "pending";
    if (now < lectureStart) {
      state = "pending (not started yet)";
    } else if (now >= lectureStart && now <= lectureEnd) {
      state = "live (in progress)";
    } else {
      state = "final (completed)";
    }
    console.log("🔴 Lecture state:", state);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

testLectureAttendance();
