import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixStudentDeviceUserIdIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("students");

    // Check existing indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Current indexes:", JSON.stringify(indexes, null, 2));

    // Drop the old unique index if it exists
    try {
      await collection.dropIndex("device_user_id_1");
      console.log("✅ Dropped old unique index on device_user_id");
    } catch (error) {
      if (error.code === 27) {
        console.log("ℹ️  Index device_user_id_1 does not exist, skipping drop");
      } else {
        throw error;
      }
    }

    // Create new sparse index without unique constraint
    await collection.createIndex(
      { device_user_id: 1 },
      { sparse: true, unique: false }
    );
    console.log("✅ Created new sparse index on device_user_id (non-unique)");

    // Check for null values
    const nullCount = await collection.countDocuments({
      $or: [{ device_user_id: null }, { device_user_id: { $exists: false } }],
    });
    console.log(`\nℹ️  Found ${nullCount} documents with null device_user_id`);

    console.log("\n✨ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

fixStudentDeviceUserIdIndex();
