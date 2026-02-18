import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js";

dotenv.config();

/**
 * Seed script to create the default "Main Branch"
 * Run this before the migration script
 */
async function seedDefaultBranch() {
    try {
        console.log("🌱 Seeding default branch...");

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Check if any branches exist
        const existingBranches = await Branch.countDocuments();
        if (existingBranches > 0) {
            console.log(`ℹ️  Found ${existingBranches} existing branch(es)`);
            const mainBranch = await Branch.findOne({ code: "MAIN" });
            if (mainBranch) {
                console.log("✅ Main Branch already exists:", mainBranch._id);
                console.log("   Name:", mainBranch.name);
                console.log("   Code:", mainBranch.code);
                await mongoose.disconnect();
                return mainBranch._id;
            }
        }

        // Create default branch
        const defaultBranch = new Branch({
            name: "Main Branch",
            code: "MAIN",
            address: {
                city: "Default City",
                state: "Default State",
                country: "India",
            },
            status: "active",
        });

        await defaultBranch.save();
        console.log("✅ Default branch created successfully!");
        console.log("   ID:", defaultBranch._id);
        console.log("   Name:", defaultBranch.name);
        console.log("   Code:", defaultBranch.code);

        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");

        return defaultBranch._id;
    } catch (error) {
        console.error("❌ Error seeding default branch:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDefaultBranch()
        .then((branchId) => {
            console.log("\n🎉 Seed completed successfully!");
            console.log("📝 Branch ID for migration:", branchId);
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Seed failed:", error);
            process.exit(1);
        });
}

export default seedDefaultBranch;
