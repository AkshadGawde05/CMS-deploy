import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    // Normalized category keys; display names served via API
    enum: [
      "fixed_overhead",
      "administrative",
      "academic_teaching",
      "marketing_advertising",
      "hr_staff",
      "financial_compliance",
      "capital_expenditure",
      "miscellaneous",
    ],
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  payment_method: {
    type: String,
    enum: ["cash", "bank", "upi", "card", "cheque"],
    default: "cash",
  },
  vendor_name: String,
  invoice_number: String,
  receipt_url: String,
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["pending", "paid", "overdue"],
    default: "pending",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Expense = mongoose.model("Expense", ExpenseSchema);
export default Expense;
