import ExcelJS from "exceljs";
import Enquiry from "../models/Enquiry.js";

/**
 * Parse Excel file and extract enquiry data
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Array} Array of parsed row objects
 */
export const parseEnquiryExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet("Enquiries") || workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error("No valid worksheet found in file");
  }

  const allRows = [];
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  console.log("\n" + "=".repeat(80));
  console.log("📊 STARTING EXCEL PARSING");
  console.log("=".repeat(80));
  console.log(`📋 Worksheet name: "${worksheet.name}"`);
  console.log(`📋 Worksheet dimensions: rows ${worksheet.actualRowCount}, cols ${worksheet.actualColumnCount}`);

  let headerRowFound = false;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      headerRowFound = true;
      console.log(`\n📍 HEADER ROW (Row 1):`);
      const headers = [];
      for (let col = 1; col <= 8; col++) {
        const headerValue = row.getCell(col).value;
        headers.push(String(headerValue || ""));
        console.log(`  Col ${col}: "${headerValue}"`);
      }
      console.log(`✅ Headers detected: ${headers.join(" | ")}`);
      return;
    }

    // Skip header, process data rows
    const firstName = row.getCell(1).value;
    const lastName = row.getCell(2).value;
    const phone = row.getCell(3).value;
    const email = row.getCell(4).value;
    const source = row.getCell(5).value;
    const interest = row.getCell(6).value;
    const address = row.getCell(7).value;
    const location = row.getCell(8).value;

    // Log raw values with full debugging info
    const hasData = firstName || lastName || phone || source || interest;
    
    if (hasData) {
      // Log first 5 rows with full detail
      if (rowsProcessed < 5) {
        console.log(`\n📝 Row ${rowNumber} - RAW CELL VALUES (First 5 rows logged in detail):`);
        console.log(`  ├─ Col 1 (First Name): ${JSON.stringify(firstName)} [${typeof firstName}]`);
        console.log(`  ├─ Col 2 (Last Name): ${JSON.stringify(lastName)} [${typeof lastName}]`);
        console.log(`  ├─ Col 3 (Phone): ${JSON.stringify(phone)} [${typeof phone}]`);
        console.log(`  ├─ Col 4 (Email): ${JSON.stringify(email)} [${typeof email}]`);
        console.log(`  ├─ Col 5 (Source): ${JSON.stringify(source)} [${typeof source}]`);
        console.log(`  ├─ Col 6 (Interest): ${JSON.stringify(interest)} [${typeof interest}]`);
        console.log(`  ├─ Col 7 (Address): ${JSON.stringify(address)} [${typeof address}]`);
        console.log(`  └─ Col 8 (Location): ${JSON.stringify(location)} [${typeof location}]`);
      }

      allRows.push({
        rowNumber,
        firstName,
        lastName,
        phone,
        email,
        source,
        interest,
        address,
        location,
      });
      rowsProcessed++;
      
      // Log progress every 50 rows
      if (rowsProcessed % 50 === 0) {
        console.log(`⏳ Processed ${rowsProcessed} rows so far...`);
      }
    } else {
      rowsSkipped++;
    }
  });

  console.log(`\n` + "=".repeat(80));
  console.log(`📊 EXCEL PARSING COMPLETE`);
  console.log("=".repeat(80));
  console.log(`✅ Rows with data: ${rowsProcessed}`);
  console.log(`⏭️  Empty rows skipped: ${rowsSkipped}`);
  console.log(`📦 Total rows to process: ${allRows.length}`);
  if (!headerRowFound) {
    console.log(`⚠️  WARNING: Header row not detected!`);
  }
  console.log("=".repeat(80) + "\n");

  return allRows;
};

/**
 * Validate individual enquiry row for required fields and formats
 * @param {Object} row - Enquiry row object
 * @returns {Object} { isValid: boolean, error?: string }
 */
export const validateEnquiryRow = (row) => {
  // Safely extract and trim all fields
  const firstName = row.firstName ? String(row.firstName).trim() : "";
  const lastName = row.lastName ? String(row.lastName).trim() : "";
  const phone = row.phone ? String(row.phone).trim() : "";
  const source = row.source ? String(row.source).trim() : "";
  const interest = row.interest ? String(row.interest).trim() : "";

  // Log first 5 rows for debugging
  if (row.rowNumber <= 5) {
    console.log(`\n🔍 Row ${row.rowNumber} validation details:`);
    console.log(`  firstName: "${firstName}" (${firstName.length} chars, empty: ${!firstName})`);
    console.log(`  lastName: "${lastName}" (${lastName.length} chars, empty: ${!lastName})`);
    console.log(`  phone: "${phone}" (${phone.length} chars, empty: ${!phone})`);
    console.log(`  source: "${source}" (${source.length} chars, empty: ${!source})`);
    console.log(`  interest: "${interest}" (${interest.length} chars, empty: ${!interest})`);
  }

  // Check required fields
  if (!firstName || !lastName || !phone || !source || !interest) {
    const missing = [];
    if (!firstName) missing.push("First Name");
    if (!lastName) missing.push("Last Name");
    if (!phone) missing.push("Phone");
    if (!source) missing.push("Source");
    if (!interest) missing.push("Interest");
    
    const error = `Missing required fields: ${missing.join(", ")}`;
    if (row.rowNumber <= 5) {
      console.log(`  ❌ FAILED: ${error}`);
    }
    
    return {
      isValid: false,
      error,
    };
  }

  // Validate phone format (10 digits)
  const phoneStr = phone.replace(/\D/g, "");
  if (phoneStr.length !== 10) {
    const error = `Invalid phone: must be 10 digits, got "${phone}" (${phoneStr.length} digits after removing non-numeric)`;
    if (row.rowNumber <= 5) {
      console.log(`  ❌ FAILED: ${error}`);
    }
    return {
      isValid: false,
      error,
    };
  }

  // Validate source (case-insensitive)
  const validSources = [
    "Website",
    "Facebook",
    "Google Ads",
    "Referral",
    "Walk-in",
    "Phone Call",
  ];
  const sourceMatch = validSources.find(s => s.toLowerCase() === source.toLowerCase());
  if (!sourceMatch) {
    const error = `Invalid source: "${source}". Must be one of: ${validSources.join(", ")}`;
    if (row.rowNumber <= 5) {
      console.log(`  ❌ FAILED: ${error}`);
    }
    return {
      isValid: false,
      error,
    };
  }

  // Validate interest (case-insensitive)
  const validInterests = [
    "Full Stack",
    "Data Science",
    "Digital Marketing",
    "UI/UX",
    "Python",
    "Java",
  ];
  const interestMatch = validInterests.find(i => i.toLowerCase() === interest.toLowerCase());
  if (!interestMatch) {
    const error = `Invalid interest: "${interest}". Must be one of: ${validInterests.join(", ")}`;
    if (row.rowNumber <= 5) {
      console.log(`  ❌ FAILED: ${error}`);
    }
    return {
      isValid: false,
      error,
    };
  }

  if (row.rowNumber <= 5) {
    console.log(`  ✅ PASSED validation`);
  }

  return { 
    isValid: true,
    normalizedFirstName: firstName,
    normalizedLastName: lastName,
    normalizedPhone: phoneStr,
    normalizedSource: sourceMatch,
    normalizedInterest: interestMatch,
  };
};

/**
 * Normalize and categorize enquiry rows (PHASE 2: VALIDATION)
 * @param {Array} allRows - All rows from Excel
 * @returns {Object} { validRows, failedRows }
 */
export const validateAndNormalizeRows = (allRows) => {
  const validRows = [];
  const failedRows = [];

  console.log(`\n🔍 Validating ${allRows.length} rows...`);

  allRows.forEach((item, index) => {
    const validation = validateEnquiryRow(item);

    if (!validation.isValid) {
      const failedRow = {
        rowNumber: item.rowNumber,
        firstName: item.firstName ? String(item.firstName).trim() : "",
        lastName: item.lastName ? String(item.lastName).trim() : "",
        phone: item.phone ? String(item.phone).trim() : "",
        email: item.email ? String(item.email).trim() : "",
        source: item.source ? String(item.source).trim() : "",
        interest: item.interest ? String(item.interest).trim() : "",
        error: validation.error,
      };
      failedRows.push(failedRow);
      
      // Log every 10th failure to avoid spam but still show progress
      if (failedRows.length % 10 === 0) {
        console.log(`  ⚠️ Failures so far: ${failedRows.length}`);
      }
      return;
    }

    // Normalize valid row using validated data
    validRows.push({
      rowNumber: item.rowNumber,
      firstName: validation.normalizedFirstName,
      lastName: validation.normalizedLastName,
      phone: validation.normalizedPhone,
      email: item.email ? String(item.email).toLowerCase().trim() : undefined,
      source: validation.normalizedSource,
      interest: validation.normalizedInterest,
      address: item.address ? String(item.address).trim() : undefined,
      location: item.location ? String(item.location).trim() : undefined,
    });
  });

  console.log(`✅ Validation complete: ${validRows.length} valid, ${failedRows.length} invalid`);
  
  return { validRows, failedRows };
};

/**
 * Remove internal duplicates (PHASE 3: DEDUPLICATION)
 * @param {Array} validRows - Validated rows
 * @returns {Object} { uniqueRows, internalDuplicates }
 */
export const removeInternalDuplicates = (validRows) => {
  const seenPhones = new Set();
  const uniqueRows = [];
  const internalDuplicates = [];

  validRows.forEach((item) => {
    if (seenPhones.has(item.phone)) {
      internalDuplicates.push({
        ...item,
        error: "Duplicate phone number within the uploaded file",
      });
    } else {
      seenPhones.add(item.phone);
      uniqueRows.push(item);
    }
  });

  return { uniqueRows, internalDuplicates };
};

/**
 * Check for database duplicates (PHASE 4: DATABASE CHECK)
 * @param {Array} uniqueRows - Unique rows from file
 * @returns {Object} { rowsToProcess, databaseDuplicates }
 */
export const checkDatabaseDuplicates = async (uniqueRows) => {
  const existingPhones = await Enquiry.find({
    phone: { $in: uniqueRows.map((item) => item.phone) },
  })
    .select("phone")
    .lean();

  const existingPhoneSet = new Set(existingPhones.map((e) => e.phone));
  const databaseDuplicates = [];
  const rowsToProcess = [];

  uniqueRows.forEach((item) => {
    if (existingPhoneSet.has(item.phone)) {
      databaseDuplicates.push({
        ...item,
        error: "Phone number already exists in database",
      });
    } else {
      rowsToProcess.push(item);
    }
  });

  return { rowsToProcess, databaseDuplicates };
};

/**
 * Insert enquiry rows into database (PHASE 5: INSERTION)
 * @param {Array} rowsToProcess - Rows ready for insertion
 * @param {String} userId - User ID creating the enquiries
 * @returns {Object} { successfulEnquiries, insertionErrors }
 */
export const insertEnquiries = async (rowsToProcess, userId) => {
  const successfulEnquiries = [];
  const insertionErrors = [];

  for (const item of rowsToProcess) {
    try {
      const enquiry = new Enquiry({
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.phone,
        email: item.email,
        source: item.source,
        interest: item.interest,
        address: item.address,
        location: item.location,
        status: "raw",
        createdBy: userId,
      });

      await enquiry.save();
      successfulEnquiries.push(enquiry);
    } catch (error) {
      insertionErrors.push({
        ...item,
        error: error.message || "Failed to save to database",
      });
    }
  }

  return { successfulEnquiries, insertionErrors };
};

/**
 * Process bulk enquiry upload (ORCHESTRATOR)
 * @param {Buffer} buffer - Excel file buffer
 * @param {String} userId - User creating enquiries
 * @returns {Object} Bulk upload result with summary
 */
export const processBulkEnquiryUpload = async (buffer, userId) => {
  console.log("\n🚀 Starting enquiry bulk upload processing...");

  // PHASE 1: PARSE
  const allRows = await parseEnquiryExcel(buffer);
  console.log(`\n📊 PHASE 1 COMPLETE - Parsed ${allRows.length} rows from Excel`);
  
  if (allRows.length === 0) {
    throw new Error("No data found in file");
  }

  // Log sample of first row for debugging
  if (allRows.length > 0) {
    console.log(`📋 Sample row 1:`, JSON.stringify(allRows[0], null, 2));
  }

  // PHASE 2: VALIDATE & NORMALIZE
  const { validRows, failedRows } = validateAndNormalizeRows(allRows);
  console.log(`\n📊 PHASE 2 COMPLETE - Validation results:`);
  console.log(`  ✅ Valid rows: ${validRows.length}`);
  console.log(`  ❌ Invalid rows: ${failedRows.length}`);
  
  if (failedRows.length > 0) {
    console.log(`\n  📋 Sample of first 3 failures:`);
    failedRows.slice(0, 3).forEach(row => {
      console.log(`    Row ${row.rowNumber}: ${row.error}`);
    });
    
    // Count failures by error reason
    const errorCounts = {};
    failedRows.forEach(row => {
      errorCounts[row.error] = (errorCounts[row.error] || 0) + 1;
    });
    console.log(`\n  📊 Failure breakdown:`);
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`    ${count}x: ${error}`);
    });
  }
  
  if (validRows.length === 0) {
    console.error(`\n❌ CRITICAL: No valid rows found after validation!`);
    
    // Create detailed failure breakdown
    const failureBreakdown = {};
    failedRows.forEach(row => {
      if (!failureBreakdown[row.error]) {
        failureBreakdown[row.error] = [];
      }
      if (failureBreakdown[row.error].length < 5) { // Keep first 5 examples of each error
        failureBreakdown[row.error].push({
          rowNumber: row.rowNumber,
          name: `${row.firstName} ${row.lastName}`.trim(),
          phone: row.phone,
          email: row.email,
          source: row.source,
          interest: row.interest,
        });
      }
    });
    
    // Log breakdown to console
    console.log(`\n📋 FAILURE BREAKDOWN BY ERROR TYPE:`);
    Object.entries(failureBreakdown).forEach(([error, examples]) => {
      console.log(`\n  ❌ ${error} (${failedRows.filter(r => r.error === error).length} entries)`);
      examples.slice(0, 3).forEach(ex => {
        console.log(`     • Row ${ex.rowNumber}: ${ex.name || "N/A"} | ${ex.phone || "no phone"} | ${ex.source || "no source"}`);
      });
    });
    
    return {
      success: false,
      message: "❌ All 182 entries failed validation. See failure details below.",
      results: {
        success: [],
        failed: failedRows.slice(0, 50), // Return first 50 failed rows with details
        total: allRows.length,
        failureBreakdown, // Return breakdown by error type
        summary: {
          totalProcessed: allRows.length,
          successCount: 0,
          failedCount: failedRows.length,
          failuresByType: Object.keys(failureBreakdown).map(error => ({
            error,
            count: failedRows.filter(r => r.error === error).length,
            examples: failureBreakdown[error].slice(0, 3),
          })),
        },
      },
    };
  }

  let allFailed = [...failedRows];

  // PHASE 3: REMOVE INTERNAL DUPLICATES
  const { uniqueRows, internalDuplicates } = removeInternalDuplicates(validRows);
  console.log(`\n📊 PHASE 3 COMPLETE - Deduplication results:`);
  console.log(`  ✅ Unique rows: ${uniqueRows.length}`);
  console.log(`  ⚠️ Internal duplicates removed: ${internalDuplicates.length}`);
  allFailed.push(...internalDuplicates);

  // PHASE 4: CHECK DATABASE DUPLICATES
  const { rowsToProcess, databaseDuplicates } = await checkDatabaseDuplicates(uniqueRows);
  console.log(`\n📊 PHASE 4 COMPLETE - Database check results:`);
  console.log(`  ✅ New rows to insert: ${rowsToProcess.length}`);
  console.log(`  ⚠️ Existing phone numbers: ${databaseDuplicates.length}`);
  allFailed.push(...databaseDuplicates);

  // PHASE 5: INSERT
  console.log(`\n📊 PHASE 5 - Starting insertion of ${rowsToProcess.length} rows...`);
  const { successfulEnquiries, insertionErrors } = await insertEnquiries(
    rowsToProcess,
    userId
  );
  console.log(`\n📊 PHASE 5 COMPLETE - Insertion results:`);
  console.log(`  ✅ Successfully inserted: ${successfulEnquiries.length}`);
  console.log(`  ❌ Insertion errors: ${insertionErrors.length}`);
  
  if (insertionErrors.length > 0) {
    console.warn(`\n  📋 Sample of insertion errors:`);
    insertionErrors.slice(0, 3).forEach(row => {
      console.log(`    Row ${row.rowNumber}: ${row.error}`);
    });
  }
  allFailed.push(...insertionErrors);

  const totalProcessed = allRows.length;
  const successCount = successfulEnquiries.length;
  const failedCount = allFailed.length;

  // Create detailed failure breakdown
  const failureBreakdown = {};
  allFailed.forEach(row => {
    if (!failureBreakdown[row.error]) {
      failureBreakdown[row.error] = [];
    }
    if (failureBreakdown[row.error].length < 3) {
      failureBreakdown[row.error].push({
        rowNumber: row.rowNumber,
        name: `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unknown",
        phone: row.phone,
        email: row.email,
      });
    }
  });

  console.log(`
╔══════════════════════════════════════╗
║      🎯 BULK UPLOAD COMPLETE 🎯     ║
╠══════════════════════════════════════╣
║ Total rows: ${String(totalProcessed).padEnd(26)} ║
║ ✅ Inserted: ${String(successCount).padEnd(28)} ║
║ ❌ Failed/Skipped: ${String(failedCount).padEnd(21)} ║
╚══════════════════════════════════════╝
  `);

  if (failedCount > 0) {
    console.log(`\n📋 FAILURES BREAKDOWN:`);
    Object.entries(failureBreakdown).forEach(([error, examples]) => {
      const count = allFailed.filter(r => r.error === error).length;
      console.log(`\n  ❌ ${error}`);
      console.log(`     Count: ${count}`);
      if (examples.length > 0) {
        console.log(`     Examples:`);
        examples.forEach(ex => {
          console.log(`       • Row ${ex.rowNumber}: ${ex.name} (${ex.phone || "no phone"})`);
        });
      }
    });
  }

  return {
    success: successCount > 0,
    message: successCount > 0 
      ? `✅ Upload complete: ${successCount} inserted, ${failedCount} skipped/failed` 
      : `❌ Upload failed: 0 inserted, ${failedCount} skipped`,
    results: {
      success: successfulEnquiries,
      failed: allFailed.slice(0, 50), // Return first 50 failures with details
      total: totalProcessed,
      summary: {
        totalProcessed,
        successCount,
        failedCount,
        failuresByType: Object.keys(failureBreakdown).map(error => ({
          error,
          count: allFailed.filter(r => r.error === error).length,
          examples: failureBreakdown[error],
        })),
      },
    },
  };
};
