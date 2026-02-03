import mongoose from "mongoose";

const LectureSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batches",
    required: true,
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
  subtopic: {
    type: String,
    required: false,
  },
  // Reference to syllabus item (optional - allows using hardcoded values or syllabus)
  syllabus_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Syllabus.items",
    required: false,
  },
  date: {
    type: Date,
    required: true,
  },
  lecture_start: {
    type: Date,
    required: true,
  },
  lecture_end: {
    type: Date,
    required: true,
  },
  note: {
    type: String,
    required: false,
  },
  attendance_count: {
    type: Number,
    default: 0,
  },
  total_students: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["scheduled", "ongoing", "completed", "cancelled"],
    default: "scheduled",
  },
  // Archive functionality
  archived: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },

  // PHASE 1: Attendance finalization tracking
  finalized: {
    type: Boolean,
    default: false,
  },
  finalizedAt: {
    type: Date,
    required: false,
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

LectureSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Lecture = mongoose.model("Lecture", LectureSchema);
export default Lecture;
