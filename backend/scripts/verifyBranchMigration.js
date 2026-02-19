import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Lecture from "../models/Lecture.js";
import Parent from "../models/Parent.js";
import Exam from "../models/Exam.js";

dotenv.config();

/**
 * Verify migration and show data assigned to a specific branch
 * Usage: node verifyBranchMigration.js <BRANCH_ID>
 */
async function verifyBranchMigration() {
    try {
        const branchId = process.argv[2];

        if (!branchId) {
            console.error("❌ Branch ID is required!");
            console.log("Usage: node verifyBranchMigration.js <BRANCH_ID>");
            process.exit(1);
        }

        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB\n");

        // Verify branch exists
        const branch = await Branch.findById(branchId);
        if (!branch) {
            console.error("❌ Branch not found!");
            await mongoose.disconnect();
            process.exit(1);
        }

        const branchObjectId = new mongoose.Types.ObjectId(branchId);

        console.log("=".repeat(60));
        console.log(`📌 VERIFICATION REPORT FOR: ${branch.name} (${branch.code})`);
        console.log("=".repeat(60));

        // Count records
        const counts = {
            courses: await Course.countDocuments({ branchId: branchObjectId }),
            batches: await Batches.countDocuments({ branchId: branchObjectId }),
            students: await Student.countDocuments({ branchId: branchObjectId }),
            teachers: await Teacher.countDocuments({ branchId: branchObjectId }),
            lectures: await Lecture.countDocuments({ branchId: branchObjectId }),
            parents: await Parent.countDocuments({ branchId: branchObjectId }),
            exams: await Exam.countDocuments({ branchId: branchObjectId }),
        };

        console.log("\n📊 Record Counts:\n");
        console.log(`   📚 Courses:       ${counts.courses}`);
        console.log(`   📖 Batches:       ${counts.batches}`);
        console.log(`   👨‍🎓 Students:      ${counts.students}`);
        console.log(`   👨‍🏫 Teachers:      ${counts.teachers}`);
        console.log(`   📝 Lectures:      ${counts.lectures}`);
        console.log(`   👨‍👩‍👧 Parents:       ${counts.parents}`);
        console.log(`   📋 Exams:         ${counts.exams}`);

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        console.log(`\n   ✅ TOTAL:         ${total} records`);

        // Show sample data
        console.log("\n" + "=".repeat(60));
        console.log("📋 SAMPLE DATA:");
        console.log("=".repeat(60));

        if (counts.courses > 0) {
            const sampleCourse = await Course.findOne({ branchId: branchObjectId }).lean();
            console.log("\n📚 Sample Course:");
            console.log(`   Name: ${sampleCourse.name}`);
            console.log(`   Status: ${sampleCourse.status}`);
            console.log(`   BranchId: ${sampleCourse.branchId}`);
        }

        if (counts.batches > 0) {
            const sampleBatch = await Batches.findOne({ branchId: branchObjectId }).lean();
            console.log("\n📖 Sample Batch:");
            console.log(`   Name: ${sampleBatch.name}`);
            console.log(`   Schedule: ${sampleBatch.schedule}`);
            console.log(`   BranchId: ${sampleBatch.branchId}`);
        }

        if (counts.students > 0) {
            const sampleStudent = await Student.findOne({ branchId: branchObjectId }).lean();
            console.log("\n👨‍🎓 Sample Student:");
            console.log(`   Name: ${sampleStudent.fname} ${sampleStudent.lname}`);
            console.log(`   Course: ${sampleStudent.course_id}`);
            console.log(`   BranchId: ${sampleStudent.branchId}`);
        }

        if (counts.teachers > 0) {
            const sampleTeacher = await Teacher.findOne({ branchId: branchObjectId }).lean();
            console.log("\n👨‍🏫 Sample Teacher:");
            console.log(`   Name: ${sampleTeacher.fname} ${sampleTeacher.lname}`);
            console.log(`   Emp No: ${sampleTeacher.emp_no}`);
            console.log(`   BranchId: ${sampleTeacher.branchId}`);
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ Verification completed!\n");

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    verifyBranchMigration();
}

export default verifyBranchMigration;
