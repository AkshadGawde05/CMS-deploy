import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Models
import Branch from '../models/Branch.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Batches from '../models/Batches.js';
import Lecture from '../models/Lecture.js';
import FeePlan from '../models/FeePlan.js';
import FeePayment from '../models/FeePayment.js';
import Expense from '../models/Expense.js';
import Enquiry from '../models/Enquiry.js';
import Attendance from '../models/Attendance.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';
import Parent from '../models/Parent.js';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const migrate = async () => {
    await connectDB();

    try {
        // 1. Find or Create Airoli Branch
        let airoliBranch = await Branch.findOne({ code: '002' });

        if (!airoliBranch) {
            console.log('Airoli branch not found. Creating...');
            airoliBranch = await Branch.create({
                name: 'Airoli',
                code: '002',
                status: 'active',
                address: {
                    street: 'Airoli Naka',
                    city: 'Navi Mumbai',
                    state: 'Maharashtra',
                    pincode: '400708',
                    country: 'India'
                },
                contacted_person: 'Admin',
                phone: '9999999999'
            });
            console.log('Airoli branch created successfully.');
        } else {
            console.log('Airoli branch found:', airoliBranch.name);
        }

        const branchId = airoliBranch._id;

        // 2. Models to migrate
        // Format: [Model, ModelName]
        const modelsToMigrate = [
            [Student, 'Student'],
            [Teacher, 'Teacher'],
            [Parent, 'Parent'],
            [Course, 'Course'],
            [Batches, 'Batches'],
            [Lecture, 'Lecture'],
            [FeePlan, 'FeePlan'],
            [FeePayment, 'FeePayment'], // Make sure this matches your payment model used
            [Expense, 'Expense'],
            [Enquiry, 'Enquiry'],
            [Attendance, 'Attendance'],
            [Exam, 'Exam'],
            [Result, 'Result']
        ];

        // 3. Update generic collections
        for (const [Model, name] of modelsToMigrate) {
            try {
                // Check if collection exists to avoid error on empty collections
                // Actually updateMany is safe on empty collections
                const result = await Model.updateMany(
                    { branchId: { $exists: false } },
                    { $set: { branchId: branchId } }
                );
                console.log(`${name}: Updated ${result.modifiedCount} records (Matched: ${result.matchedCount})`);
            } catch (err) {
                console.error(`Error updating ${name}:`, err.message);
            }
        }

        // 4. Update Users (Users are special)
        // Add branch to 'branches' array if not present
        // Set 'primaryBranch' if missing
        try {
            const userUpdatePrimary = await User.updateMany(
                { primaryBranch: { $exists: false } },
                { $set: { primaryBranch: branchId } }
            );
            console.log(`User (Primary Branch): Updated ${userUpdatePrimary.modifiedCount} records`);

            const userUpdateArray = await User.updateMany(
                { branches: { $nin: [branchId] } },
                { $push: { branches: branchId } }
            );
            console.log(`User (Branches Array): Updated ${userUpdateArray.modifiedCount} records`);

        } catch (err) {
            console.error(`Error updating Users:`, err.message);
        }

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
