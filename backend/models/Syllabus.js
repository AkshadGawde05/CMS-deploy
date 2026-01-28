import mongoose from "mongoose";

const syllabusItemSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  subtopic: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  duration_hours: {
    type: Number,
    required: false,
    default: 1,
  },
  order: {
    type: Number,
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const syllabusSchema = new mongoose.Schema({
  // Batch is now optional - Syllabus can be created for a course without a specific batch
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batches",
    required: false,
  },
  // Course is required - starting point for workflow
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  academic_year: {
    type: String,
    required: true,
  },
  items: [syllabusItemSchema],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// ONE course-level syllabus per course + academic year (NO batch)
syllabusSchema.index(
  { course_id: 1, academic_year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      batch_id: { $exists: false },
    },
  }
);
// ONE batch-level syllabus per batch + academic year
syllabusSchema.index(
  { batch_id: 1, academic_year: 1 },
  {
    unique: true,
    partialFilterExpression: {
      batch_id: { $exists: true },
    },
  }
);


export default mongoose.model("Syllabus", syllabusSchema);
