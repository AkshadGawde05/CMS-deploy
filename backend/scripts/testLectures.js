console.log("Testing lectures functionality...");

// Test if we can import the lectures controller
try {
  const mongoose = require("mongoose");
  console.log("✓ Mongoose imported successfully");

  // Test database connection
  const connectDB = async () => {
    try {
      await mongoose.connect("mongodb://localhost:27017/classroom_management");
      console.log("✓ Connected to MongoDB");

      // Check if lectures collection exists and has data
      const lecturesCount = await mongoose.connection.db
        .collection("lectures")
        .countDocuments();
      console.log(`📊 Lectures in database: ${lecturesCount}`);

      // Check if courses, batches, and teachers exist (needed for lectures)
      const coursesCount = await mongoose.connection.db
        .collection("courses")
        .countDocuments();
      const batchesCount = await mongoose.connection.db
        .collection("batches")
        .countDocuments();
      const teachersCount = await mongoose.connection.db
        .collection("users")
        .countDocuments({ role: "Teacher" });

      console.log(
        `📊 Courses: ${coursesCount}, Batches: ${batchesCount}, Teachers: ${teachersCount}`
      );

      if (lecturesCount === 0) {
        console.log("❌ No lectures found in database");
        console.log("💡 You may need to:");
        console.log("   1. Run the sample lectures script");
        console.log("   2. Create some lectures manually");
        console.log("   3. Check if lectures are being filtered out");
      } else {
        // Get sample lecture
        const sampleLecture = await mongoose.connection.db
          .collection("lectures")
          .findOne({});
        console.log(
          "📄 Sample lecture:",
          JSON.stringify(sampleLecture, null, 2)
        );
      }

      process.exit(0);
    } catch (error) {
      console.error("❌ Database error:", error.message);
      process.exit(1);
    }
  };

  connectDB();
} catch (error) {
  console.error("❌ Import error:", error.message);
  process.exit(1);
}
