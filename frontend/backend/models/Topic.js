import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  subject: {
    type: String,
    required: true,
    // Removed enum constraint to allow dynamic subjects from database
  },
  topic_name: {
    type: String,
    required: true,
  },
  topic_number: {
    type: Number,
    required: true,
  },
  subtopic_number: {
    type: Number,
    default: 1,
  },
  description: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  archived: {
    type: Boolean,
    default: false,
  },
});

// Compound index to ensure unique topic numbers per course and subject
topicSchema.index({ course_id: 1, subject: 1, topic_number: 1 }, { unique: true });

export default mongoose.model("Topic", topicSchema);
