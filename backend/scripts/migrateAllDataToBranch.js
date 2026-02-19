import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js";
import Course from "../models/Course.js";
import Parent from "../models/Parent.js";
import Exam from "../models/Exam.js";
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
 * Migration script to assign all existing records to a specific branch
 * Usage: node migrateAllDataToBranch.js <BRANCH_ID>
 * Example: node migrateAllDataToBranch.js 699413f95714a872cd5dc5d1
 */
async function migrateAllDataToBranch() {
    try {
        const branchId = process.argv[2];

        if (!branchId) {
            console.error("❌ Branch ID is required!");
            console.log("Usage: node migrateAllDataToBranch.js <BRANCH_ID>");
            console.log("Example: node migrateAllDataToBranch.js 699413f95714a872cd5dc5d1");
            process.exit(1);
        }

        console.log("🔄 Starting migration for all data...");
        console.log(`📌 Target Branch ID: ${branchId}`);

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Verify branch exists
        const branch = await Branch.findById(branchId);
        if (!branch) {
            console.error("❌ Branch not found with ID:", branchId);
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`✅ Branch found: ${branch.name} (${branch.code})`);

        // Migration stats
        const stats = {
            courses: 0,
            batches: 0,
            students: 0,
            teachers: 0,
            lectures: 0,
            parents: 0,
            exams: 0,
            attendance: 0,
            devices: 0,
            feePlans: 0,
            feePayments: 0,
            expenses: 0,
            enquiries: 0,
        };

        // Convert branchId to ObjectId if string
        const branchObjectId = mongoose.Types.ObjectId.isValid(branchId)
            ? new mongoose.Types.ObjectId(branchId)
            : branchId;

        // Migrate Courses
        console.log("\n📚 Migrating Courses...");
        const coursesResult = await Course.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.courses = coursesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.courses} courses`);

        // Migrate Batches
        console.log("\n📖 Migrating Batches...");
        const batchesResult = await Batches.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.batches = batchesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.batches} batches`);

        // Migrate Students
        console.log("\n👨‍🎓 Migrating Students...");
        const studentsResult = await Student.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.students = studentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.students} students`);

        // Migrate Teachers
        console.log("\n👨‍🏫 Migrating Teachers...");
        const teachersResult = await Teacher.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.teachers = teachersResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.teachers} teachers`);

        // Migrate Lectures
        console.log("\n📝 Migrating Lectures...");
        const lecturesResult = await Lecture.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.lectures = lecturesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.lectures} lectures`);

        // Migrate Parents
        console.log("\n👨‍👩‍👧 Migrating Parents...");
        const parentsResult = await Parent.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.parents = parentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.parents} parents`);

        // Migrate Exams
        console.log("\n📝 Migrating Exams...");
        const examsResult = await Exam.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.exams = examsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.exams} exams`);

        // Migrate Attendance
        console.log("\n✅ Migrating Attendance...");
        const attendanceResult = await Attendance.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.attendance = attendanceResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.attendance} attendance records`);

        // Migrate Devices
        console.log("\n📱 Migrating Devices...");
        const devicesResult = await Device.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.devices = devicesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.devices} devices`);

        // Migrate Fee Plans
        console.log("\n💰 Migrating Fee Plans...");
        const feePlansResult = await FeePlan.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.feePlans = feePlansResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.feePlans} fee plans`);

        // Migrate Fee Payments
        console.log("\n💳 Migrating Fee Payments...");
        const feePaymentsResult = await FeePayment.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.feePayments = feePaymentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.feePayments} fee payments`);

        // Migrate Expenses
        console.log("\n💸 Migrating Expenses...");
        const expensesResult = await Expense.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.expenses = expensesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.expenses} expenses`);

        // Migrate Enquiries
        console.log("\n📞 Migrating Enquiries...");
        const enquiriesResult = await Enquiry.updateMany(
            {},
            { $set: { branchId: branchObjectId } }
        );
        stats.enquiries = enquiriesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.enquiries} enquiries`);

        // Print summary
        console.log("\n" + "=".repeat(60));
        console.log("📊 MIGRATION SUMMARY");
        console.log("=".repeat(60));
        console.log(`Branch:        ${branch.name} (${branch.code})`);
        console.log(`Branch ID:     ${branchId}`);
        console.log("\nRecords Migrated:");
        console.log(`   Courses:       ${stats.courses}`);
        console.log(`   Batches:       ${stats.batches}`);
        console.log(`   Students:      ${stats.students}`);
        console.log(`   Teachers:      ${stats.teachers}`);
        console.log(`   Lectures:      ${stats.lectures}`);
        console.log(`   Parents:       ${stats.parents}`);
        console.log(`   Exams:         ${stats.exams}`);
        console.log(`   Attendance:    ${stats.attendance}`);
        console.log(`   Devices:       ${stats.devices}`);
        console.log(`   Fee Plans:     ${stats.feePlans}`);
        console.log(`   Fee Payments:  ${stats.feePayments}`);
        console.log(`   Expenses:      ${stats.expenses}`);
        console.log(`   Enquiries:     ${stats.enquiries}`);
        console.log("=".repeat(60));

        const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        console.log(`\n✅ Total records migrated: ${total}`);

        // Verify migration
        console.log("\n🔍 Verifying migration...");
        const verifyCourse = await Course.countDocuments({ branchId: branchObjectId });
        const verifyBatch = await Batches.countDocuments({ branchId: branchObjectId });
        const verifyStudent = await Student.countDocuments({ branchId: branchObjectId });
        const verifyTeacher = await Teacher.countDocuments({ branchId: branchObjectId });
        const verifyLecture = await Lecture.countDocuments({ branchId: branchObjectId });
        const verifyParent = await Parent.countDocuments({ branchId: branchObjectId });
        const verifyExam = await Exam.countDocuments({ branchId: branchObjectId });

        console.log(`   Courses:       ${verifyCourse}`);
        console.log(`   Batches:       ${verifyBatch}`);
        console.log(`   Students:      ${verifyStudent}`);
        console.log(`   Teachers:      ${verifyTeacher}`);
        console.log(`   Lectures:      ${verifyLecture}`);
        console.log(`   Parents:       ${verifyParent}`);
        console.log(`   Exams:         ${verifyExam}`);

        await mongoose.disconnect();
        console.log("\n✅ Migration completed successfully!");
        console.log("✅ Disconnected from MongoDB");
    } catch (error) {
        console.error("\n❌ Migration error:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateAllDataToBranch()
        .then(() => {
            console.log("\n🎉 All data successfully migrated to the specified branch!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Migration failed:", error);
            process.exit(1);
        });
}

export default migrateAllDataToBranch;
