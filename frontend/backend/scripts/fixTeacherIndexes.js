/**
 * Fix Teacher indexes to prevent duplicate key errors for empty aadhar/pan_number
 * 
 * This script:
 * 1. Drops the old aadhar_1 and pan_number indexes if they exist
 * 2. Updates any existing teachers with empty strings to undefined/null
 * 3. Creates new partial indexes that only enforce uniqueness for non-empty values
 * 
 * Run this script once to fix existing data and indexes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Teacher from "../models/Teacher.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";

async function fixTeacherIndexes() {
  try {
    console.log("🔧 Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to database");

    const db = mongoose.connection.db;
    const collection = db.collection("teachers");

    // Step 1: Check existing indexes
    console.log("\n📋 Checking existing indexes...");
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes.map(i => i.name));

    // Step 2: Drop old problematic indexes
    const indexesToDrop = ["aadhar_1", "pan_number_1"];
    for (const indexName of indexesToDrop) {
      const indexExists = indexes.some(i => i.name === indexName);
      if (indexExists) {
        console.log(`\n🗑️  Dropping old index: ${indexName}`);
        try {
          await collection.dropIndex(indexName);
          console.log(`✅ Dropped index: ${indexName}`);
        } catch (err) {
          if (err.code === 27) {
            console.log(`ℹ️  Index ${indexName} doesn't exist (already dropped)`);
          } else {
            console.error(`❌ Error dropping ${indexName}:`, err.message);
          }
        }
      } else {
        console.log(`ℹ️  Index ${indexName} doesn't exist`);
      }
    }

    // Step 3: Update documents with empty strings to null
    console.log("\n🔄 Updating teachers with empty aadhar/pan_number to null...");
    
    const result = await collection.updateMany(
      {
        $or: [
          { aadhar: "" },
          { aadhar: null },
          { pan_number: "" },
          { pan_number: null }
        ]
      },
      {
        $set: {
          aadhar: undefined,
          pan_number: undefined
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} teacher records`);

    // Step 4: Create new partial indexes
    console.log("\n🔨 Creating new partial indexes...");
    
    // Create aadhar index
    try {
      await collection.createIndex(
        { aadhar: 1 },
        {
          name: "aadhar_unique_nonempty",
          unique: true,
          partialFilterExpression: { 
            aadhar: { $exists: true, $type: "string", $ne: "" } 
          }
        }
      );
      console.log("✅ Created aadhar_unique_nonempty index");
    } catch (err) {
      console.error("❌ Error creating aadhar index:", err.message);
    }

    // Create pan_number index
    try {
      await collection.createIndex(
        { pan_number: 1 },
        {
          name: "pan_number_unique_nonempty",
          unique: true,
          partialFilterExpression: { 
            pan_number: { $exists: true, $type: "string", $ne: "" } 
          }
        }
      );
      console.log("✅ Created pan_number_unique_nonempty index");
    } catch (err) {
      console.error("❌ Error creating pan_number index:", err.message);
    }

    // Step 5: Verify final indexes
    console.log("\n📋 Verifying final indexes...");
    const finalIndexes = await collection.indexes();
    console.log("Final indexes:");
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), 
        idx.unique ? "(unique)" : "",
        idx.partialFilterExpression ? `(partial: ${JSON.stringify(idx.partialFilterExpression)})` : ""
      );
    });

    console.log("\n✅ Teacher indexes fixed successfully!");
    console.log("\n💡 Summary:");
    console.log("   - Dropped old aadhar_1 and pan_number_1 indexes");
    console.log("   - Cleaned up empty string values in existing records");
    console.log("   - Created new partial indexes that allow multiple null/undefined values");
    console.log("   - Empty strings will now be converted to undefined before saving");

  } catch (err) {
    console.error("❌ Error fixing teacher indexes:", err);
    throw err;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
fixTeacherIndexes()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Script failed:", err);
    process.exit(1);
  });
