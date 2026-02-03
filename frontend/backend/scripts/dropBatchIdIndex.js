import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");

    const db = mongoose.connection.db;
    const collection = db.collection("feeplans");

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Current indexes:");
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Check if batch_id_1 index exists
    const hasBatchIdIndex = indexes.some((idx) => idx.name === "batch_id_1");

    if (hasBatchIdIndex) {
      console.log(
        "\n🗑️  Dropping batch_id_1 index to allow multiple fee plans per batch...",
      );
      await collection.dropIndex("batch_id_1");
      console.log("✅ Index dropped successfully!");
    } else {
      console.log(
        "\n✨ No batch_id_1 index found. Multiple fee plans per batch already allowed!",
      );
    }

    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log("\n📋 Final indexes:");
    finalIndexes.forEach((idx) => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

dropIndex();
