import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: false, // Will be set to true after migration
    index: true,
  },
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

// Branch-scoped indexes
ExpenseSchema.index({ branchId: 1, date: -1 });
ExpenseSchema.index({ branchId: 1, category: 1 });

const Expense = mongoose.model("Expense", ExpenseSchema);
export default Expense;
