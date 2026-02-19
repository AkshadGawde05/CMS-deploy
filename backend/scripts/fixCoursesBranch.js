import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";

dotenv.config();

const AIROLI_BRANCH_ID = "699413f95714a872cd5dc5d1";

async function fixCourses() {
    console.log("🔧 Fixing course branch assignment...");
    
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ MongoDB connected");

        const branchObjId = new mongoose.Types.ObjectId(AIROLI_BRANCH_ID);

        // Show courses before update
        const coursesBefore = await Course.find({}).select("_id name branchId").lean();
        console.log(`\n📚 Courses BEFORE update: ${coursesBefore.length}`);
        coursesBefore.forEach(c => {
            console.log(`   - ${c.name} | BranchId: ${c.branchId || "MISSING"}`);
        });

        // Update all courses with branchId
        const result = await Course.updateMany(
            {},
            { $set: { branchId: branchObjId } },
            { multi: true }
        );

        console.log(`\n✅ Update result: ${result.modifiedCount} documents modified`);

        // Show courses after update
        const coursesAfter = await Course.find({}).select("_id name branchId").lean();
        console.log(`\n📚 Courses AFTER update: ${coursesAfter.length}`);
        coursesAfter.forEach(c => {
            console.log(`   - ${c.name} | BranchId: ${c.branchId}`);
        });

        // Verify
        const coursesWithBranch = await Course.countDocuments({ branchId: branchObjId });
        console.log(`\n✅ Courses with Airoli branchId: ${coursesWithBranch}`);

        await mongoose.disconnect();
        console.log("\n✅ Course fix completed!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}

fixCourses();
