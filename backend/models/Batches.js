import mongoose from "mongoose";

const batchesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false, // Will be set to true after migration
    index: true,
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

// Compound indexes for branch-scoped queries
batchesSchema.index({ branchId: 1, course_id: 1 }, { name: "branch_course_idx" });
batchesSchema.index({ branchId: 1, archived: 1 }, { name: "branch_archived_idx" });

export default mongoose.model("Batches", batchesSchema);
