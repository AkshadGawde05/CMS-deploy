import mongoose from "mongoose";

const batchesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // Subject removed - subjects are now managed through Syllabus and Topics
  // Batches are created based on Course + optional Syllabus selection
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  syllabus_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Syllabus",
    required: false,
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  schedule: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  // Legacy flags (kept for backward compatibility)
  archived: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
});

export default mongoose.model("Batches", batchesSchema);
