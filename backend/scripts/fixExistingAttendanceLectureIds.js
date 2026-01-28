import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Lecture from "../models/Lecture.js";

const MONGO_URI = "mongodb://localhost:27017/cms";

async function fixExistingAttendance() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all attendance records without lectureId
    const attendanceWithoutLecture = await Attendance.find({
      $or: [{ lectureId: null }, { lectureId: { $exists: false } }],
    });

    console.log(
      `📝 Found ${attendanceWithoutLecture.length} attendance records without lectureId\n`
    );

    let updated = 0;
    let notFound = 0;

    for (const attendance of attendanceWithoutLecture) {
      if (!attendance.batchId || !attendance.date) {
        console.log(
          `⚠️  Skipping record ${attendance._id} - missing batch or date`
        );
        notFound++;
        continue;
      }

      // Find lecture for this attendance date and batch
      const attendanceDate = new Date(attendance.date);
      const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(attendanceDate.setHours(23, 59, 59, 999));

      const lecture = await Lecture.findOne({
        batch_id: attendance.batchId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (lecture) {
        attendance.lectureId = lecture._id;
        await attendance.save();
        console.log(
          `✅ Updated attendance ${attendance._id} with lecture ${lecture._id} (${lecture.topic})`
        );
        updated++;
      } else {
        console.log(
          `⚠️  No lecture found for attendance ${attendance._id} on ${attendance.date.toDateString()}`
        );
        notFound++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Updated: ${updated} records`);
    console.log(`⚠️  Not found: ${notFound} records`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

fixExistingAttendance();
