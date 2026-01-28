import mongoose from "mongoose";
import Payment from "../models/Payment.js";

mongoose
  .connect(
    "mongodb+srv://interntwo:interntwo@cluster0.izzxyqj.mongodb.net/college_management_system",
  )
  .then(async () => {
    console.log("Connected to MongoDB\n");

    // Check akshad's payments
    const akshadId = new mongoose.Types.ObjectId("69779f350e6f3b2c03a73f5d");
    const shivId = new mongoose.Types.ObjectId("6977b3bb743e87fd369d1e7c");

    console.log("Akshad g installments (Payment model):");
    const akshadPayments = await Payment.find({ student_id: akshadId })
      .sort({ installment_number: 1 })
      .lean();
    akshadPayments.forEach((p) =>
      console.log(
        `  Inst #${p.installment_number}: amount=₹${p.amount}, paid=₹${p.paid_amount || 0}, status=${p.status}`,
      ),
    );
    console.log(
      `  Total paid: ₹${akshadPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)}\n`,
    );

    console.log("Shiv k installments (Payment model):");
    const shivPayments = await Payment.find({ student_id: shivId })
      .sort({ installment_number: 1 })
      .lean();
    shivPayments.forEach((p) =>
      console.log(
        `  Inst #${p.installment_number}: amount=₹${p.amount}, paid=₹${p.paid_amount || 0}, status=${p.status}`,
      ),
    );
    console.log(
      `  Total paid: ₹${shivPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)}\n`,
    );

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
