import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  subjects: [
    {
      type: String,
      required: true,
    },
  ],
  emp_no: {
    type: String,
    unique: true,
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
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
  },
  p_address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
  },
  salary: {
    type: Number,
    required: true,
  },
  joining_date: {
    type: Date,
    default: Date.now,
  },
  // Employment documents
  pan_number: String,
  bank_account: String,
  bank_ifsc: String,
  highest_degree: String,
  degree_certificate: String, // file path
  // Additional fields
  assigned_batches: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
  ],
  monthly_logsheet_status: {
    type: String,
    enum: ["completed", "pending", "in_progress"],
    default: "pending",
  },
  syllabus_completion: {
    type: Number,
    default: 0, // percentage
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

// Enforce uniqueness for aadhar only when it's a non-empty string
// This prevents duplicate key errors for blank/undefined values
TeacherSchema.index(
  { aadhar: 1 },
  {
    name: "aadhar_unique_nonempty",
    unique: true,
    partialFilterExpression: { aadhar: { $exists: true, $type: "string", $ne: "" } },
  }
);

// Enforce uniqueness for pan_number only when it's a non-empty string
TeacherSchema.index(
  { pan_number: 1 },
  {
    name: "pan_number_unique_nonempty",
    unique: true,
    partialFilterExpression: { pan_number: { $exists: true, $type: "string", $ne: "" } },
  }
);

TeacherSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

const Teacher = mongoose.model("Teacher", TeacherSchema);
export default Teacher;
