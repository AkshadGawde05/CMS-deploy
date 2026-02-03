import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Lecture from "../models/Lecture.js";

const MONGO_URI = "mongodb://localhost:27017/cms";

async function linkAttendanceToLectures() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all attendance records
    const allAttendance = await Attendance.find({});
    console.log(`📝 Total attendance records: ${allAttendance.length}\n`);

    // Get all lectures
    const allLectures = await Lecture.find({});
    console.log(`📚 Total lectures: ${allLectures.length}\n`);

    if (allLectures.length === 0) {
      console.log("⚠️  No lectures found in database!");
      console.log("Please create lectures first before marking attendance.");
      return;
    }

    let updated = 0;
    let alreadySet = 0;
    let notFound = 0;

    for (const attendance of allAttendance) {
      // Skip if already has lectureId
      if (attendance.lectureId) {
        alreadySet++;
        continue;
      }

      if (!attendance.batchId || !attendance.date) {
        console.log(`⚠️  Skipping ${attendance._id} - missing batch or date`);
        notFound++;
        continue;
      }

      // Find lecture for this batch and date
      const attendanceDate = new Date(attendance.date);
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const lecture = await Lecture.findOne({
        batch_id: attendance.batchId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (lecture) {
        attendance.lectureId = lecture._id;
        await attendance.save();
        console.log(
          `✅ Linked attendance ${attendance._id} to lecture "${lecture.topic}"`
        );
        updated++;
      } else {
        console.log(
          `⚠️  No lecture found for batch ${attendance.batchId} on ${attendanceDate.toDateString()}`
        );
        notFound++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Updated: ${updated} records`);
    console.log(`ℹ️  Already had lectureId: ${alreadySet} records`);
    console.log(`⚠️  No matching lecture: ${notFound} records`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

linkAttendanceToLectures();
