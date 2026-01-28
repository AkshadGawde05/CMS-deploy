import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const migrateFieldNames = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Migrate Students collection
    console.log("\n📚 Migrating Students collection...");
    const studentsResult = await db.collection("students").updateMany(
      { f_name: { $exists: true } },
      {
        $rename: {
          f_name: "fname",
          l_name: "lname",
        },
      }
    );
    console.log(`✅ Updated ${studentsResult.modifiedCount} student records`);

    console.log("\n✨ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Students: ${studentsResult.modifiedCount} records updated`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateFieldNames();
