import mongoose from "mongoose";
import Topic from "./models/Topic.js";

async function checkTopics() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/classroom_management"
    );

    const total = await Topic.countDocuments();
    console.log("Total topics:", total);

    const subjects = await Topic.distinct("subject");
    console.log("Subjects in DB:", subjects);

    const mathsTopics = await Topic.find({
      subject: { $regex: /^mathematics$/i },
      $or: [{ archived: false }, { archived: { $exists: false } }],
    }).populate("course_id", "name");

    console.log("\nMathematics topics found:", mathsTopics.length);

    mathsTopics.forEach((topic) => {
      console.log(
        `- Course: ${topic.course_id?.name || "Unknown"}, Topic: ${topic.topic_name}, Number: ${topic.topic_number}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTopics();
