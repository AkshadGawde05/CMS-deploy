import mongoose from "mongoose";
import dotenv from "dotenv";
import Enquiry from "../models/Enquiry.js";

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

async function addTestEnquiries() {
  try {
    await connectDB();

    // Check existing enquiries count
    const existingCount = await Enquiry.countDocuments();
    console.log(`📊 Existing enquiries: ${existingCount}`);

    // Sample test enquiries with different statuses
    const testEnquiries = [
      {
        firstName: "John",
        lastName: "Doe",
        phone: "9876543210",
        email: "john.doe@example.com",
        source: "Website",
        interest: "Full Stack",
        status: "raw"
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        phone: "9876543211",
        email: "jane.smith@example.com",
        source: "Facebook",
        interest: "Data Science",
        status: "cold_lead"
      },
      {
        firstName: "Bob",
        lastName: "Johnson",
        phone: "9876543212",
        email: "bob.johnson@example.com",
        source: "Google Ads",
        interest: "UI/UX",
        status: "warm_lead"
      },
      {
        firstName: "Alice",
        lastName: "Brown",
        phone: "9876543213",
        email: "alice.brown@example.com",
        source: "Referral",
        interest: "Python",
        status: "hot_lead"
      },
      {
        firstName: "Charlie",
        lastName: "Wilson",
        phone: "9876543214",
        email: "charlie.wilson@example.com",
        source: "Walk-in",
        interest: "Java",
        status: "contacted"
      },
      {
        firstName: "Diana",
        lastName: "Davis",
        phone: "9876543215",
        email: "diana.davis@example.com",
        source: "Phone Call",
        interest: "Digital Marketing",
        status: "interested"
      },
      {
        firstName: "Eve",
        lastName: "Miller",
        phone: "9876543216",
        email: "eve.miller@example.com",
        source: "Website",
        interest: "Full Stack",
        status: "not_interested"
      },
      {
        firstName: "Frank",
        lastName: "Garcia",
        phone: "9876543217",
        email: "frank.garcia@example.com",
        source: "Facebook",
        interest: "Data Science",
        status: "enrolled"
      },
      {
        firstName: "Grace",
        lastName: "Martinez",
        phone: "9876543218",
        email: "grace.martinez@example.com",
        source: "Google Ads",
        interest: "UI/UX",
        status: "lost"
      }
    ];

    // Add enquiries only if they don't exist (check by phone)
    let addedCount = 0;
    for (const enquiryData of testEnquiries) {
      const existing = await Enquiry.findOne({ phone: enquiryData.phone });
      if (!existing) {
        await Enquiry.create(enquiryData);
        addedCount++;
        console.log(`✅ Added: ${enquiryData.firstName} ${enquiryData.lastName} (${enquiryData.status})`);
      } else {
        console.log(`⚠️  Skipped: ${enquiryData.firstName} ${enquiryData.lastName} (already exists)`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Added: ${addedCount} new enquiries`);
    console.log(`- Skipped: ${testEnquiries.length - addedCount} existing enquiries`);

    // Show current counts by status
    const statusCounts = await Enquiry.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log(`\n📈 Current counts by status:`);
    statusCounts.forEach(({ _id, count }) => {
      console.log(`- ${_id}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding test enquiries:", error);
    process.exit(1);
  }
}

addTestEnquiries();