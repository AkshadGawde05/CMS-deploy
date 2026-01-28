import mongoose from "mongoose";

const DiscountTypeSubSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    discount_percent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const FeePlanSchema = new mongoose.Schema({
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batches",
    required: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses",
  },
  total_amount: {
    type: Number,
    required: true,
  },
  num_installments: {
    type: Number,
    required: true,
    min: 1,
  },
  discount_types: {
    type: [DiscountTypeSubSchema],
    default: [{ code: "full", name: "Full Payment", discount_percent: 0 }],
  },
  is_default: {
    type: Boolean,
    default: false,
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

FeePlanSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model("FeePlan", FeePlanSchema);
