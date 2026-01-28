import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Lecture from "../models/Lecture.js";
import Student from "../models/Student.js";

const MONGO_URI = "mongodb://localhost:27017/cms";

async function debugAttendanceIssue() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find the "unit 1" lecture in senior batch
    const lecture = await Lecture.findOne({
      topic: "unit 1",
    })
      .populate("batch_id", "name")
      .populate("course_id", "name");

    if (!lecture) {
      console.log("❌ Could not find 'unit 1' lecture");
      
      // List all lectures
      const allLectures = await Lecture.find().populate("batch_id", "name");
      console.log("\n📚 All lectures:");
      allLectures.forEach((lec) => {
        console.log(
          `  - ${lec.topic} (${lec.batch_id?.name || "No batch"}) - Date: ${lec.date.toDateString()}`
        );
      });
      return;
    }

    console.log("📚 Found Lecture:");
    console.log(`  ID: ${lecture._id}`);
    console.log(`  Topic: ${lecture.topic}`);
    console.log(`  Batch: ${lecture.batch_id?.name || "N/A"}`);
    console.log(`  Date: ${lecture.date}`);
    console.log("");

    // Check students in batch
    const studentsInBatch = await Student.countDocuments({
      batch_id: lecture.batch_id?._id,
    });
    console.log(`👥 Students in batch: ${studentsInBatch}`);
    console.log("");

    // Check ALL attendance records for this date
    const lectureDate = new Date(lecture.date);
    const startOfDay = new Date(lectureDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(lectureDate.setHours(23, 59, 59, 999));

    console.log("🔍 Searching for attendance records:");
    console.log(`  Date range: ${startOfDay} to ${endOfDay}`);
    console.log("");

    const allAttendanceOnDate = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate("userId", "f_name l_name");

    console.log(`📝 Total attendance records on this date: ${allAttendanceOnDate.length}`);
    allAttendanceOnDate.forEach((att, i) => {
      const userName = att.userId
        ? `${att.userId.f_name} ${att.userId.l_name}`
        : "Unknown";
      console.log(`  ${i + 1}. ${userName}`);
      console.log(`     - Status: ${att.status}`);
      console.log(`     - UserType: ${att.userType}`);
      console.log(`     - LectureId: ${att.lectureId || "NOT SET"}`);
      console.log(`     - BatchId: ${att.batchId || "NOT SET"}`);
      console.log(`     - Source: ${att.source}`);
      console.log("");
    });

    // Check attendance WITH lectureId
    const attendanceWithLecture = await Attendance.find({
      lectureId: lecture._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      userType: "Student",
    });

    console.log(`✅ Attendance records WITH lectureId=${lecture._id}: ${attendanceWithLecture.length}`);
    console.log("");

    // Count present/late
    const presentCount = await Attendance.countDocuments({
      lectureId: lecture._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      userType: "Student",
      status: { $in: ["present", "late"] },
    });

    console.log("📊 Summary:");
    console.log(`  Present/Late: ${presentCount}/${studentsInBatch}`);
    console.log(
      `  Percentage: ${studentsInBatch > 0 ? Math.round((presentCount / studentsInBatch) * 100) : 0}%`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

debugAttendanceIssue();
