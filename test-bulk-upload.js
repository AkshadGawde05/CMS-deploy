import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import ExcelJS from "exceljs";

const API_BASE = "http://localhost:5000";

// Create sample test Excel file
async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Enquiries");

  // Add headers
  worksheet.addRow([
    "First Name",
    "Last Name",
    "Phone",
    "Email",
    "Source",
    "Interest",
    "Address",
    "Location",
  ]);

  // Add test data - 3 valid records
  worksheet.addRow([
    "John",
    "Doe",
    "9876543210",
    "john@test.com",
    "Website",
    "Full Stack",
    "123 Main St",
    "Mumbai",
  ]);
  worksheet.addRow([
    "Jane",
    "Smith",
    "9876543211",
    "jane@test.com",
    "Referral",
    "Frontend",
    "456 Oak St",
    "Bangalore",
  ]);
  worksheet.addRow([
    "Bob",
    "Johnson",
    "9876543212",
    "bob@test.com",
    "Social Media",
    "Backend",
    "789 Elm St",
    "Delhi",
  ]);

  // Add duplicate within file (same phone)
  worksheet.addRow([
    "Alice",
    "Brown",
    "9876543210", // Duplicate!
    "alice@test.com",
    "Website",
    "Full Stack",
    "321 Pine St",
    "Pune",
  ]);

  // Add invalid record (missing required field)
  worksheet.addRow([
    "Charlie",
    "White",
    "", // Missing phone
    "charlie@test.com",
    "Direct",
    "DevOps",
    "654 Birch St",
    "Hyderabad",
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync("/tmp/test-enquiries.xlsx", buffer);
  console.log("✅ Test Excel file created: /tmp/test-enquiries.xlsx");
  return buffer;
}

// Test bulk upload
async function testBulkUpload() {
  try {
    console.log("\n🔄 Starting bulk upload test...\n");

    const buffer = await createTestExcel();

    // Get auth token (you'll need to update this with real token)
    // For now, let's try with a mock token
    const form = new FormData();
    form.append("file", Buffer.from(buffer), "test-enquiries.xlsx");

    console.log("📤 Uploading file to /api/enquiries...");
    const response = await axios.post(`${API_BASE}/api/enquiries`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.test",
      },
      timeout: 60000,
    });

    console.log("\n📥 Response received:");
    console.log(JSON.stringify(response.data, null, 2));

    // Analyze results
    const { success, results } = response.data;
    console.log("\n🔍 Analysis:");
    console.log(`  - Overall Success: ${success}`);
    console.log(`  - Total Processed: ${results.summary?.totalProcessed || 0}`);
    console.log(`  - Successfully Created: ${results.summary?.successCount || 0}`);
    console.log(`  - Failed: ${results.summary?.failedCount || 0}`);

    if (results.failed && results.failed.length > 0) {
      console.log("\n❌ Failed Entries:");
      results.failed.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. Row ${entry.rowNumber}:`);
        console.log(
          `     - Name: ${entry.firstName || "N/A"} ${entry.lastName || "N/A"}`
        );
        console.log(`     - Error: ${entry.error}`);
      });
    }

    if (results.success && results.success.length > 0) {
      console.log(`\n✅ Successfully Created (${results.success.length} entries):`);
      results.success.slice(0, 3).forEach((entry, idx) => {
        console.log(
          `  ${idx + 1}. ${entry.firstName || entry.name} - ${entry.phone}`
        );
      });
    }

    console.log(
      "\n✨ Test completed! Check API response structure above.\n"
    );
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ API Error:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

// Run test
testBulkUpload();
