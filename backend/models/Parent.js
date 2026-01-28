import mongoose from "mongoose";

const ParentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  aadhar: {
    type: String,
    validate: {
      validator: function (v) {
        return !v || /^\d{12}$/.test(v);
      },
      message: "Aadhar must be 12 digits",
    },
  },
  relation: {
    type: String,
    enum: ["father", "mother", "guardian"],
    required: true,
  },
  occupation: String,
  annual_income: Number,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
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
    type: Boolean,
    default: true,
  },
  device_user_id: {
    type: String,
    sparse: true,
    default: null,
  },
});

// Compound index to ensure one parent-student relationship per user per relation type
ParentSchema.index(
  { user_id: 1, student_id: 1, relation: 1 },
  { unique: true }
);

ParentSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Parent = mongoose.model("Parent", ParentSchema);
export default Parent;
