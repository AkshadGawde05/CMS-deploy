/**
 * Migration: Drop old problematic unique index from Attendance collection
 * Run: node scripts/migrations/dropAttendanceOldIndex.js
 * 
 * The old schema had: unique index on (lecture_id, student_id)
 * This conflicts with new schema where these fields can be null
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "../../models/Attendance.js";

dotenv.config();

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cms", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("✅ Connected to MongoDB");

    // Get all indexes using Mongoose's collection API
    const indexes = await Attendance.collection.getIndexes();
    console.log("\n📋 Current indexes on Attendance collection:");
    console.log(JSON.stringify(indexes, null, 2));

    // Find indexes to drop
    const indicesToDrop = [];

    for (const [indexName, indexSpec] of Object.entries(indexes)) {
      // Skip the default _id index
      if (indexName === "_id_") continue;

      // Drop any index that contains old field names
      if (
        indexName.includes("lecture_id") ||
        indexName.includes("student_id") ||
        indexName.includes("batch_id_") ||
        indexName.includes("role_")
      ) {
        console.log(`\n⚠️  Found old index: ${indexName}`);
        console.log(`   Spec: ${JSON.stringify(indexSpec)}`);
        indicesToDrop.push(indexName);
      }
    }

    if (indicesToDrop.length === 0) {
      console.log("\n✅ No old indexes found. Collection is clean.");
    } else {
      console.log(`\n🗑️  Dropping ${indicesToDrop.length} old index(es)...`);
      for (const indexName of indicesToDrop) {
        try {
          await Attendance.collection.dropIndex(indexName);
          console.log(`   ✅ Dropped: ${indexName}`);
        } catch (err) {
          console.log(`   ⚠️  Could not drop ${indexName}: ${err.message}`);
        }
      }
    }

    // Verify final indexes
    const finalIndexes = await Attendance.collection.getIndexes();
    console.log("\n📋 Indexes after migration:");
    console.log(Object.keys(finalIndexes));

    console.log("\n✅ Migration complete!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

migrate();
