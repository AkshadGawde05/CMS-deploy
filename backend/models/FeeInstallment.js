import mongoose from "mongoose";

const FeeInstallmentSchema = new mongoose.Schema({
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeePlan",
    required: true,
  },
  installment_no: {
    type: Number,
    required: true,
  },
  due_date: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  remarks: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("FeeInstallment", FeeInstallmentSchema);
