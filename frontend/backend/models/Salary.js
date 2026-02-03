import mongoose from "mongoose";

const SalarySchema = new mongoose.Schema({
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  basic_salary: {
    type: Number,
    required: true
  },
  allowances: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  bonus: {
    type: Number,
    default: 0
  },
  total_salary: {
    type: Number,
    required: true
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  payment_date: Date,
  payment_method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque']
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  remarks: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

SalarySchema.pre('save', function(next) {
  // Calculate total
  this.total_salary = this.basic_salary + this.allowances + this.bonus - this.deductions;
  
  // Update status
  if (this.paid_amount >= this.total_salary) {
    this.status = 'paid';
  } else if (this.paid_amount > 0) {
    this.status = 'partial';
  }
  
  next();
});

const Salary = mongoose.model("Salary", SalarySchema);
export default Salary;
