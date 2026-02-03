import mongoose from "mongoose";
import dotenv from "dotenv";
import FeePlan from "../models/FeePlan.js";
import FeeInstallment from "../models/FeeInstallment.js";

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/viki-gts");
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function generateInstallments() {
  try {
    await connectDB();

    // Find all fee plans
    const feePlans = await FeePlan.find({});
    console.log(`📊 Found ${feePlans.length} fee plans`);

    for (const plan of feePlans) {
      // Check if installments already exist
      const existingInstallments = await FeeInstallment.countDocuments({ plan_id: plan._id });
      
      if (existingInstallments > 0) {
        console.log(`⏭️  Plan ${plan._id} already has ${existingInstallments} installments, skipping...`);
        continue;
      }

      console.log(`\n🔧 Generating installments for plan ${plan._id}`);
      console.log(`   Total: ₹${plan.total_amount}`);
      console.log(`   Installments: ${plan.num_installments}`);

      // Auto-generate equal installments
      const installmentAmount = plan.total_amount / plan.num_installments;
      const installmentDocs = [];
      const startDate = new Date();
      
      for (let i = 1; i <= plan.num_installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i); // Each installment due 1 month apart
        
        installmentDocs.push({
          plan_id: plan._id,
          installment_no: i,
          due_date: dueDate,
          amount: installmentAmount,
        });
      }
      
      await FeeInstallment.insertMany(installmentDocs);
      console.log(`   ✅ Created ${plan.num_installments} installments`);
      
      // Show the created installments
      installmentDocs.forEach((inst) => {
        console.log(`      - Installment ${inst.installment_no}: ₹${inst.amount} due on ${inst.due_date.toLocaleDateString()}`);
      });
    }

    console.log("\n✅ All installments generated successfully!");
    
  } catch (error) {
    console.error("❌ Error generating installments:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

generateInstallments();
