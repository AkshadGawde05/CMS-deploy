import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  installment_number: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  due_date: {
    type: Date,
    required: true
  },
  paid_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
    default: 'cash'
  },
  transaction_id: String,
  remarks: String,
  receipt_number: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

PaymentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Auto-update status
  if (this.paid_amount >= this.amount) {
    this.status = 'paid';
  } else if (this.paid_amount > 0) {
    this.status = 'partial';
  } else if (new Date() > this.due_date && this.paid_amount === 0) {
    this.status = 'overdue';
  }
  
  next();
});

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
