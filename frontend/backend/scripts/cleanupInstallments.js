import mongoose from "mongoose";
import dotenv from "dotenv";
import FeePlan from "../models/FeePlan.js";
import FeeInstallment from "../models/FeeInstallment.js";

dotenv.config();

async function cleanupInstallments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const feePlans = await FeePlan.find({});
    console.log(`📋 Found ${feePlans.length} fee plans\n`);

    for (const plan of feePlans) {
      const installments = await FeeInstallment.find({ plan_id: plan._id });

      console.log(`Fee Plan ${plan._id}:`);
      console.log(`  - Expected: ${plan.num_installments} installments`);
      console.log(`  - Found: ${installments.length} installments in DB`);

      if (installments.length !== plan.num_installments) {
        console.log(`  ⚠️  MISMATCH! Deleting all and recreating...`);

        // Delete all installments for this plan
        await FeeInstallment.deleteMany({ plan_id: plan._id });

        // Recreate correct number of installments
        const installmentAmount = plan.total_amount / plan.num_installments;
        const today = new Date();

        for (let i = 1; i <= plan.num_installments; i++) {
          const dueDate = new Date(today);
          dueDate.setMonth(today.getMonth() + i);

          await FeeInstallment.create({
            plan_id: plan._id,
            installment_no: i,
            amount: Math.round(installmentAmount * 100) / 100,
            due_date: dueDate,
          });
        }

        console.log(`  ✅ Created ${plan.num_installments} new installments`);
      } else {
        console.log(`  ✅ Count matches`);
      }
      console.log("");
    }

    console.log("🎉 Cleanup completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
  }
}

cleanupInstallments();
