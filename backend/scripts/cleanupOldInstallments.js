import mongoose from "mongoose";
import dotenv from "dotenv";
import FeeInstallment from "../models/FeeInstallment.js";
import FeePayment from "../models/FeePayment.js";

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/viki-gts",
    );
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function cleanup() {
  try {
    await connectDB();

    console.log("\n🧹 Cleaning up old fee installment records...\n");

    // Count existing records
    const installmentCount = await FeeInstallment.countDocuments();
    const paymentCount = await FeePayment.countDocuments();

    console.log(`📊 Current state:`);
    console.log(`   - FeeInstallment records: ${installmentCount}`);
    console.log(`   - FeePayment records: ${paymentCount}`);

    if (installmentCount === 0) {
      console.log("\n✨ No installment records to clean up!");
    } else {
      // Delete all FeeInstallment records (no longer needed)
      const result = await FeeInstallment.deleteMany({});
      console.log(`\n✅ Deleted ${result.deletedCount} FeeInstallment records`);
    }

    if (paymentCount > 0) {
      console.log(
        `\n⚠️  Note: ${paymentCount} FeePayment records exist with old structure (installment_id).`,
      );
      console.log(
        `   These payments may need to be updated to use fee_plan_id + installment_no instead.`,
      );
      console.log(`   Consider deleting old payments if they're test data:`);
      console.log(`   > db.feepayments.deleteMany({})`);
    }

    console.log("\n✅ Cleanup complete!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

cleanup();
