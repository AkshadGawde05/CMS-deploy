import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false, // Will be set to true after migration
    index: true,
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batches",
    required: true,
  },
  exam_type: {
    type: String,
    enum: ["on_theory", "off_theory", "on_mcq", "off_mcq"],
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  duration: {
    type: String,
    required: false,
    default: null,
  },
  total_marks: {
    type: Number,
    required: true,
  },
  exam_link: {
    type: String,
    required: function () {
      return this.exam_type === "on_theory" || this.exam_type === "on_mcq";
    },
  },
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled"],
    default: "scheduled",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Exam", examSchema);
