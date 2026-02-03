import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  course_start: {
    type: Date,
    required: true,
  },
  course_end: {
    type: Date,
    required: true,
  },
  duration_months: {
    type: Number,
    required: true,
  },
  batches: [
    {
      type: String,
    },
  ],
  students_count: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Active", "Pending"],
    default: "Pending",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  archived: {
    type: Boolean,
    default: false,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Course", courseSchema);
