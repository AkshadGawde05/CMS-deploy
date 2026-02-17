import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false, // Will be set to true after migration
    index: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: false,
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batches",
    required: false,
  },
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  admission_date: {
    type: Date,
    default: Date.now,
  },
  fee_status: {
    type: String,
    enum: ["paid", "pending", "partial", "overdue"],
    default: "pending",
  },
  // Payment plan chosen at admission; not the same as status above
  fee_plan: {
    type: String,
    enum: ["full", "early_bird", "sibling"],
    default: "full",
  },
  // Reference to the specific fee plan selected for this student
  fee_plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeePlan",
    required: false,
  },
  // Discount type selected from the fee plan's discount_types
  discount_type: {
    type: String,
    required: false,
  },
  dob: {
    type: Date,
    required: false, // Optional - admin fills later
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "male",
  },
  aadhar: {
    type: String,
    trim: true,
    // Normalize blank strings to undefined so they don't get indexed
    set: (v) => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim();
      return s.length ? s : undefined;
    },
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
StudentSchema.index(
  { aadhar: 1 },
  {
    name: "aadhar_unique_nonempty",
    unique: true,
    partialFilterExpression: { aadhar: { $exists: true, $type: "string" } },
  },
);

StudentSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Index to speed up queries that group/count students by course
StudentSchema.index({ course_id: 1 }, { name: "course_id_idx" });

// Compound index for branch-scoped queries
StudentSchema.index({ branchId: 1, course_id: 1 }, { name: "branch_course_idx" });
StudentSchema.index({ branchId: 1, batch_id: 1 }, { name: "branch_batch_idx" });

const Student = mongoose.model("Student", StudentSchema);
export default Student;
