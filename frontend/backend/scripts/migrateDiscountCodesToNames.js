import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";
import FeePlan from "../models/FeePlan.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function migrateDiscountCodes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all students with discount_type set
    const students = await Student.find({
      discount_type: { $exists: true, $ne: null, $ne: "" },
    }).populate("fee_plan_id");

    console.log(`\n📋 Found ${students.length} students with discount codes\n`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const student of students) {
      const oldCode = student.discount_type;

      // Skip if already looks like a name (no numbers, longer than 3 chars)
      if (!/^\d+$/.test(oldCode) && oldCode.length > 3) {
        console.log(
          `⏭️  ${student.fname} ${student.lname}: Already has name "${oldCode}"`,
        );
        skipped++;
        continue;
      }

      // Get fee plan
      let feePlan = student.fee_plan_id;

      // If fee_plan_id is not populated or not set, try to find by batch
      if (!feePlan && student.batch_id) {
        feePlan = await FeePlan.findOne({ batch_id: student.batch_id }).sort({
          createdAt: -1,
        });
      }

      if (
        !feePlan ||
        !feePlan.discount_types ||
        feePlan.discount_types.length === 0
      ) {
        console.log(
          `⚠️  ${student.fname} ${student.lname}: No fee plan found, skipping`,
        );
        notFound++;
        continue;
      }

      // Try to find matching discount by old code field (if it still exists) or by index
      let matchedDiscount = null;

      // Try to match by code if it exists
      matchedDiscount = feePlan.discount_types.find(
        (dt) => dt.code === oldCode,
      );

      // If no match, try first discount as fallback
      if (!matchedDiscount && feePlan.discount_types.length > 0) {
        matchedDiscount = feePlan.discount_types[0];
        console.log(
          `⚠️  ${student.fname} ${student.lname}: Code "${oldCode}" not found, using first discount "${matchedDiscount.name}"`,
        );
      }

      if (matchedDiscount && matchedDiscount.name) {
        student.discount_type = matchedDiscount.name;
        await student.save();
        console.log(
          `✅ ${student.fname} ${student.lname}: "${oldCode}" → "${matchedDiscount.name}" (${matchedDiscount.discount_percent}% off)`,
        );
        updated++;
      } else {
        console.log(
          `❌ ${student.fname} ${student.lname}: Could not find matching discount`,
        );
        notFound++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Not Found: ${notFound}`);
    console.log(`   📋 Total: ${students.length}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateDiscountCodes();
