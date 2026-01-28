import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";
import FeePlan from "../models/FeePlan.js";
import FeeInstallment from "../models/FeeInstallment.js";

dotenv.config();

async function recreateInstallments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all fee plans
    const feePlans = await FeePlan.find({});
    console.log(`📋 Found ${feePlans.length} fee plans`);

    let totalDeleted = 0;
    let totalCreated = 0;

    for (const feePlan of feePlans) {
      console.log(`\n🔧 Processing fee plan ${feePlan._id}:`);
      console.log(`   - Batch ID: ${feePlan.batch_id}`);
      console.log(`   - Total Amount: ₹${feePlan.total_amount}`);
      console.log(`   - Installments: ${feePlan.num_installments}`);

      // Delete old installments for this plan
      const deleteResult = await FeeInstallment.deleteMany({
        plan_id: feePlan._id,
      });
      console.log(
        `   ❌ Deleted ${deleteResult.deletedCount} old installments`,
      );
      totalDeleted += deleteResult.deletedCount;

      // Calculate installment amount
      const installmentAmount = feePlan.total_amount / feePlan.num_installments;
      console.log(`   - Each installment: ₹${installmentAmount.toFixed(2)}`);

      // Create new installments
      const installments = [];
      const today = new Date();

      for (let i = 1; i <= feePlan.num_installments; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(today.getMonth() + i); // Due every month

        installments.push({
          plan_id: feePlan._id,
          installment_no: i,
          amount: Math.round(installmentAmount * 100) / 100, // Round to 2 decimals
          due_date: dueDate,
        });
      }

      await FeeInstallment.insertMany(installments);
      console.log(`   ✅ Created ${installments.length} new installments`);
      totalCreated += installments.length;
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log(`   - Total deleted: ${totalDeleted}`);
    console.log(`   - Total created: ${totalCreated}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
  }
}

recreateInstallments();
