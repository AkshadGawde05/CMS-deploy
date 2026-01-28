import mongoose from "mongoose";
import Counter from "./Counter.js";

const FeePaymentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  fee_plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeePlan",
    required: true,
  },
  installment_no: {
    type: Number,
    required: true,
  },
  paid_amount: {
    type: Number,
    required: true,
  },
  paid_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  payment_mode: {
    type: String,
    enum: [
      "cash",
      "card",
      "upi",
      "bank_transfer",
      "cheque",
      "credit_adjustment",
    ],
    default: "cash",
  },
  status: {
    type: String,
    enum: ["paid", "pending", "partial"],
    default: "paid",
  },
  receipt_no: {
    type: String,
    unique: true,
  },
  transaction_id: String,
  remarks: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Auto-generate receipt number
FeePaymentSchema.pre("save", async function (next) {
  try {
    if (!this.receipt_no) {
      const c = await Counter.findOneAndUpdate(
        { key: "receipt" },
        { $inc: { seq: 1 }, $set: { updated_at: new Date() } },
        { new: true, upsert: true },
      );
      const seq = c.seq;
      this.receipt_no = `RCP${String(seq).padStart(8, "0")}`;
    }
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("FeePayment", FeePaymentSchema);
