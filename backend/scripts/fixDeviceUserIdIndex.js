// Fix duplicate key error on device_user_id
// Run this script once to fix the database
// Usage: node backend/scripts/fixDeviceUserIdIndex.js

import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

async function fixDeviceUserIdIndex() {
  try {
    console.log("🔧 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Drop the unique index on device_user_id
    console.log("\n🗑️  Dropping unique index on device_user_id...");
    try {
      await User.collection.dropIndex("device_user_id_1");
      console.log("✅ Dropped old unique index");
    } catch (err) {
      if (err.code === 27 || err.message.includes("index not found")) {
        console.log("ℹ️  Index already removed or doesn't exist");
      } else {
        throw err;
      }
    }

    // Create new sparse index (non-unique)
    console.log("\n📊 Creating new sparse index on device_user_id...");
    await User.collection.createIndex(
      { device_user_id: 1 },
      { sparse: true, unique: false }
    );
    console.log("✅ Created new sparse index");

    // Check for any duplicate null values and clean them
    console.log("\n🔍 Checking for documents with null device_user_id...");
    const nullCount = await User.countDocuments({
      $or: [{ device_user_id: null }, { device_user_id: { $exists: false } }],
    });
    console.log(`   Found ${nullCount} documents with null device_user_id`);

    console.log("\n✨ Fix completed successfully!");
    console.log("   You can now add teachers without the duplicate key error.");

    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

fixDeviceUserIdIndex();
