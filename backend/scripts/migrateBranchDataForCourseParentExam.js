import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js";
import Course from "../models/Course.js";
import Parent from "../models/Parent.js";
import Exam from "../models/Exam.js";

dotenv.config();

/**
 * Migration script to backfill branchId for Course, Parent, and Exam records
 * Run this AFTER seedBranch.js and the main migrateBranchData.js
 */
async function migrateBranchDataForCourseParentExam() {
    try {
        console.log("🔄 Starting branch data migration for Course, Parent, Exam...");

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
            courses: 0,
            parents: 0,
            exams: 0,
        };

        // Migrate Courses
        console.log("\n📚 Migrating Courses...");
        const coursesResult = await Course.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.courses = coursesResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.courses} courses`);

        // Migrate Parents
        console.log("\n👨‍👩‍👧 Migrating Parents...");
        const parentsResult = await Parent.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.parents = parentsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.parents} parents`);

        // Migrate Exams
        console.log("\n📝 Migrating Exams...");
        const examsResult = await Exam.updateMany(
            { branchId: { $exists: false } },
            { $set: { branchId } }
        );
        stats.exams = examsResult.modifiedCount;
        console.log(`   ✅ Updated ${stats.exams} exams`);

        // Print summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 MIGRATION SUMMARY");
        console.log("=".repeat(50));
        console.log(`Courses:       ${stats.courses}`);
        console.log(`Parents:       ${stats.parents}`);
        console.log(`Exams:         ${stats.exams}`);
        console.log("=".repeat(50));

        const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        console.log(`\n✅ Total records migrated: ${total}`);

        // Verify migration
        console.log("\n🔍 Verifying migration...");
        const verifyCourse = await Course.countDocuments({ branchId });
        const verifyParent = await Parent.countDocuments({ branchId });
        const verifyExam = await Exam.countDocuments({ branchId });
        console.log(`   Courses with branchId: ${verifyCourse}`);
        console.log(`   Parents with branchId: ${verifyParent}`);
        console.log(`   Exams with branchId: ${verifyExam}`);

        // Also show total counts without branchId
        const coursesWithoutBranch = await Course.countDocuments({ branchId: { $exists: false } });
        const parentsWithoutBranch = await Parent.countDocuments({ branchId: { $exists: false } });
        const examsWithoutBranch = await Exam.countDocuments({ branchId: { $exists: false } });
        
        if (coursesWithoutBranch > 0 || parentsWithoutBranch > 0 || examsWithoutBranch > 0) {
            console.log("\n⚠️  Records still without branchId:");
            if (coursesWithoutBranch > 0) console.log(`   Courses: ${coursesWithoutBranch}`);
            if (parentsWithoutBranch > 0) console.log(`   Parents: ${parentsWithoutBranch}`);
            if (examsWithoutBranch > 0) console.log(`   Exams: ${examsWithoutBranch}`);
        } else {
            console.log("\n✅ All records have branchId assigned!");
        }

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
    migrateBranchDataForCourseParentExam()
        .then(() => {
            console.log("\n🎉 Migration completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Migration failed:", error);
            process.exit(1);
        });
}

export default migrateBranchDataForCourseParentExam;
