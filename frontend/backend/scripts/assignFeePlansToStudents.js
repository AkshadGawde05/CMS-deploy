import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";
import FeePlan from "../models/FeePlan.js";
import Batches from "../models/Batches.js";

dotenv.config();

async function assignFeePlansToStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all students
    const students = await Student.find({}).populate("batch_id");
    console.log(`📋 Found ${students.length} students`);

    let updatedCount = 0;

    for (const student of students) {
      if (!student.batch_id) {
        console.log(
          `⚠️  Student ${student.fname} ${student.lname} has no batch, skipping...`,
        );
        continue;
      }

      // Find fee plan for this batch
      const feePlan = await FeePlan.findOne({
        batch_id: student.batch_id._id,
      }).sort({ createdAt: -1 });

      if (!feePlan) {
        console.log(`⚠️  No fee plan found for batch ${student.batch_id.name}`);
        continue;
      }

      // Update student with fee plan
      student.fee_plan_id = feePlan._id;
      await student.save();

      console.log(
        `✅ ${student.fname} ${student.lname} → Fee Plan ₹${feePlan.total_amount} (${feePlan.num_installments} installments)`,
      );
      updatedCount++;
    }

    console.log(`\n🎉 Updated ${updatedCount} students with fee plans`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
  }
}

assignFeePlansToStudents();
