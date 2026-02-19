import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";

dotenv.config();

const AIROLI_BRANCH_ID = "699413f95714a872cd5dc5d1";

async function debug() {
    console.log("🔍 Starting debug check...");
    
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ MongoDB connected");

        const branchObjId = new mongoose.Types.ObjectId(AIROLI_BRANCH_ID);

        // Count all records regardless of branch
        const allCourses = await Course.countDocuments({});
        const allBatches = await Batches.countDocuments({});
        const allStudents = await Student.countDocuments({});
        const allTeachers = await Teacher.countDocuments({});

        console.log("\n📊 TOTAL RECORDS IN DB:");
        console.log(`   All Courses: ${allCourses}`);
        console.log(`   All Batches: ${allBatches}`);
        console.log(`   All Students: ${allStudents}`);
        console.log(`   All Teachers: ${allTeachers}`);

        // Count records with branchId matching Airoli
        const arioliBranches = {
            courses: await Course.countDocuments({ branchId: branchObjId }),
            batches: await Batches.countDocuments({ branchId: branchObjId }),
            students: await Student.countDocuments({ branchId: branchObjId }),
            teachers: await Teacher.countDocuments({ branchId: branchObjId }),
        };

        console.log("\n✅ AIROLI BRANCH RECORDS:");
        console.log(`   Courses: ${arioliBranches.courses}`);
        console.log(`   Batches: ${arioliBranches.batches}`);
        console.log(`   Students: ${arioliBranches.students}`);
        console.log(`   Teachers: ${arioliBranches.teachers}`);

        // Show a sample course
        const sampleCourse = await Course.findOne({ branchId: branchObjId }).select("name status branchId").lean();
        if (sampleCourse) {
            console.log("\n📚 Sample Course:");
            console.log(`   Name: ${sampleCourse.name}`);
            console.log(`   Status: ${sampleCourse.status}`);
            console.log(`   BranchId: ${sampleCourse.branchId}`);
        }

        await mongoose.disconnect();
        console.log("\n✅ Debug completed!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}

debug();
