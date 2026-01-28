import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function dropIndex() {
  try {
    // Connect using the .env MONGODB_URI
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");

    // Get the database and collection
    const db = mongoose.connection.db;
    const collection = db.collection("feeplans");

    // Check if collection exists
    const collections = await db
      .listCollections({ name: "feeplans" })
      .toArray();
    if (collections.length === 0) {
      console.log(
        'ℹ️  Collection "feeplans" does not exist yet. No index to drop.',
      );
      return;
    }

    // List existing indexes
    const indexes = await collection.indexes();
    console.log(
      "📋 Current indexes:",
      indexes.map((i) => i.name),
    );

    // Drop the batch_id_1 index if it exists
    const hasBatchIndex = indexes.some((i) => i.name === "batch_id_1");
    if (hasBatchIndex) {
      await collection.dropIndex("batch_id_1");
      console.log("✅ Successfully dropped batch_id_1 unique index");
    } else {
      console.log("ℹ️  batch_id_1 index does not exist");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Connection closed");
  }
}

dropIndex();
