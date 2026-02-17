import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Batches from "../models/Batches.js";
import Lecture from "../models/Lecture.js";
import Attendance from "../models/Attendance.js";
import Device from "../models/Device.js";
import FeePlan from "../models/FeePlan.js";
import FeePayment from "../models/FeePayment.js";
import Expense from "../models/Expense.js";
import Enquiry from "../models/Enquiry.js";

dotenv.config();

/**
 * Migration script to backfill branchId for all existing records
 * Run this AFTER seedBranch.js
 */
async function migrateBranchData() {
    try {
        console.log("🔄 Starting branch data migration...");

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Get the default "Main Branch"
        const mainBranch = await Branch.findOne({ code: "MAIN" });
        if (!mainBranch) {
            console.error("❌ Main Branch not found! Please run seedBranch.js first.");
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log("📌 Using Main Branch ID:", mainBranch._id);
        const branchId = mainBranch._id;

        // Migration stats
        const stats = {
            students: 0,
            teachers: 0,
            batches: 0,
            lectures: 0,
            attendance: 0,
            devices: 0,
            feePlans: 0,
            feePayments: 0,
            expenses: 0,
            enquiries: 0,
        };

        // Migrate Students
        console.log("\n📚 Migrating Students...");
        const studentsResult = await Student.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.students = studentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.students} students`);

        // Migrate Teachers
        console.log("\n👨‍🏫 Migrating Teachers...");
        const teachersResult = await Teacher.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.teachers = teachersResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.teachers} teachers`);

        // Migrate Batches
        console.log("\n📖 Migrating Batches...");
        const batchesResult = await Batches.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.batches = batchesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.batches} batches`);

        // Migrate Lectures
        console.log("\n📝 Migrating Lectures...");
        const lecturesResult = await Lecture.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.lectures = lecturesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.lectures} lectures`);

        // Migrate Attendance
        console.log("\n✅ Migrating Attendance...");
        const attendanceResult = await Attendance.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.attendance = attendanceResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.attendance} attendance records`);

        // Migrate Devices
        console.log("\n📱 Migrating Devices...");
        const devicesResult = await Device.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.devices = devicesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.devices} devices`);

        // Migrate Fee Plans
        console.log("\n💰 Migrating Fee Plans...");
        const feePlansResult = await FeePlan.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.feePlans = feePlansResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.feePlans} fee plans`);

        // Migrate Fee Payments
        console.log("\n💳 Migrating Fee Payments...");
        const feePaymentsResult = await FeePayment.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.feePayments = feePaymentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.feePayments} fee payments`);

        // Migrate Expenses
        console.log("\n💸 Migrating Expenses...");
        const expensesResult = await Expense.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.expenses = expensesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.expenses} expenses`);

        // Migrate Enquiries
        console.log("\n📞 Migrating Enquiries...");
        const enquiriesResult = await Enquiry.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.enquiries = enquiriesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.enquiries} enquiries`);

        // Print summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 MIGRATION SUMMARY");
        console.log("=".repeat(50));
        console.log(`Students:      ${stats.students}`);
        console.log(`Teachers:      ${stats.teachers}`);
        console.log(`Batches:       ${stats.batches}`);
        console.log(`Lectures:      ${stats.lectures}`);
        console.log(`Attendance:    ${stats.attendance}`);
        console.log(`Devices:       ${stats.devices}`);
        console.log(`Fee Plans:     ${stats.feePlans}`);
        console.log(`Fee Payments:  ${stats.feePayments}`);
        console.log(`Expenses:      ${stats.expenses}`);
        console.log(`Enquiries:     ${stats.enquiries}`);
        console.log("=".repeat(50));

        const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        console.log(`\n✅ Total records migrated: ${total}`);

        // Verify migration
        console.log("\n🔍 Verifying migration...");
        const verifyStudent = await Student.countDocuments({ branchId });
        const verifyTeacher = await Teacher.countDocuments({ branchId });
        const verifyBatch = await Batches.countDocuments({ branchId });
        console.log(`   Students with branchId: ${verifyStudent}`);
        console.log(`   Teachers with branchId: ${verifyTeacher}`);
        console.log(`   Batches with branchId: ${verifyBatch}`);

        await mongoose.disconnect();
        console.log("\n✅ Migration completed successfully!");
        console.log("✅ Disconnected from MongoDB");
    } catch (error) {
        console.error("\n❌ Migration error:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateBranchData()
        .then(() => {
            console.log("\n🎉 Migration completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Migration failed:", error);
            process.exit(1);
        });
}

export default migrateBranchData;
