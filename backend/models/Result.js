import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  marks_obtained: {
    type: Number,
    required: true
  },
  grade: {
    type: String
  },
  remarks: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate results
resultSchema.index({ exam_id: 1, student_id: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);
