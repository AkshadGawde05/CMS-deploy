import Syllabus from "../models/Syllabus.js";
import Batches from "../models/Batches.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import Parent from "../models/Parent.js";
import ExcelJS from "exceljs";

// Get syllabus for a batch
export const getSyllabus = async (req, res) => {
  try {
    const { batch_id, academic_year, course_id } = req.query; // Add course_id param
    const userId = req.user?.id;
    const userRole = req.user?.role?.toLowerCase();

    let query = {};

    // Authorization logic based on role
    if (userRole === "student") {
      const student = await Student.findOne({ user_id: userId });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Student record not found",
        });
      }
      query.batch_id = student.batch_id;
    } else if (userRole === "parent") {
      const parent = await Parent.findOne({ user_id: userId });
      if (!parent || !parent.student_id) {
        return res.json({
          success: true,
          data: [],
        });
      }
      const student = await Student.findById(parent.student_id);
      if (!student || !student.batch_id) {
        return res.json({
          success: true,
          data: [],
        });
      }
      query.batch_id = student.batch_id;
    } else if (userRole === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: "Teacher record not found",
        });
      }
      if (batch_id) {
        if (teacher.assigned_batches && teacher.assigned_batches.length > 0) {
          const hasAccess = teacher.assigned_batches.some(
            (batchObjectId) => batchObjectId.toString() === batch_id,
          );
          if (!hasAccess) {
            return res.status(403).json({
              success: false,
              message: "You don't have access to this batch's syllabus",
            });
          }
          query.batch_id = batch_id;
        } else {
          query.batch_id = { $in: [] };
        }
      } else {
        if (teacher.assigned_batches && teacher.assigned_batches.length > 0) {
          query.batch_id = { $in: teacher.assigned_batches };
        } else {
          query.batch_id = { $in: [] };
        }
      }
    } else if (userRole === "admin" || userRole === "superadmin") {
      // Admins can access all syllabi
      // ⭐ KEY FIX: Only filter by batch_id if explicitly provided
      if (batch_id) {
        query.batch_id = batch_id;
      }
      // ⭐ Add support for course_id filtering
      if (course_id) {
        query.course_id = course_id;
      }
      if (academic_year) {
        query.academic_year = academic_year;
      }
    } else {
      query.batch_id = { $in: [] };
    }

    // ⭐ IMPORTANT: If no batch_id specified for admin/superadmin, don't filter by it
    // This allows viewing course-level syllabi (batch_id: null/undefined)

    const syllabi = await Syllabus.find(query)
      .populate("batch_id", "name course_id")
      .populate("course_id", "name")
      .populate("created_by", "fname lname email")
      .populate("updated_by", "fname lname email");

    console.log(`✅ Found ${syllabi.length} syllabi`);

    res.json({
      success: true,
      data: syllabi,
    });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch syllabus",
      error: error.message,
    });
  }
};

// Get single syllabus by ID
export const getSyllabusById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role?.toLowerCase();

    const syllabus = await Syllabus.findById(id)
      .populate("batch_id", "name course_id")
      .populate("course_id", "name")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    // Authorization check
    if (userRole === "student") {
      const student = await Student.findOne({ user_id: userId });
      if (
        !student ||
        student.batch_id.toString() !== syllabus.batch_id._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this syllabus",
        });
      }
    } else if (userRole === "parent") {
      const parent = await Parent.findOne({ user_id: userId });
      if (!parent) {
        return res.status(403).json({
          success: false,
          message: "Parent record not found",
        });
      }
      const student = await Student.findById(parent.student_id);
      if (
        !student ||
        student.batch_id.toString() !== syllabus.batch_id._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this syllabus",
        });
      }
    } else if (userRole === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: "Teacher record not found",
        });
      }
      const hasAccess =
        teacher.assigned_batches &&
        teacher.assigned_batches.some(
          (batchId) => batchId.toString() === syllabus.batch_id._id.toString(),
        );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this syllabus",
        });
      }
    } else if (userRole !== "admin" && userRole !== "superadmin") {
      // For any other role, deny access
      return res.status(403).json({
        success: false,
        message: "You don't have access to this syllabus",
      });
    }

    res.json({
      success: true,
      data: syllabus,
    });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch syllabus",
      error: error.message,
    });
  }
};

// Create new syllabus
export const createSyllabus = async (req, res) => {
  try {
    console.log("📚 Create Syllabus - Request received");
    console.log("📚 User:", req.user);
    console.log("📚 Body:", req.body);
    console.log("📚 Cookies:", req.cookies);

    const { batch_id, course_id, academic_year, items } = req.body;
    const userId = req.user?.id;

    if (!course_id || !academic_year) {
      return res.status(400).json({
        success: false,
        message: "course_id and academic_year are required",
      });
    }

    // Check if syllabus already exists for this course and academic year
    const existingSyllabus = await Syllabus.findOne({
      course_id,
      academic_year,
    });
    if (existingSyllabus) {
      return res.status(400).json({
        success: false,
        message: "Syllabus already exists for this course and academic year",
      });
    }

    // Handle empty batch_id string - convert to undefined so it doesn't try to cast empty string to ObjectId
    const processedBatchId =
      batch_id && batch_id.trim() !== "" ? batch_id : undefined;

    const newSyllabus = new Syllabus({
      batch_id: processedBatchId,
      course_id,
      academic_year,
      items: items || [],
      created_by: userId,
    });

    await newSyllabus.save();

    // Only populate batch_id if it exists
    if (newSyllabus.batch_id) {
      await newSyllabus.populate("batch_id", "name course_id");
    }
    await newSyllabus.populate("course_id", "name");
    await newSyllabus.populate("created_by", "fname lname email");

    console.log("✅ Syllabus created successfully:", newSyllabus._id);

    res.status(201).json({
      success: true,
      message: "Syllabus created successfully",
      data: newSyllabus,
    });
  } catch (error) {
    console.error("Error creating syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create syllabus",
      error: error.message,
    });
  }
};

// Update syllabus
export const updateSyllabus = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, academic_year } = req.body;
    const userId = req.user?.id;

    const syllabus = await Syllabus.findByIdAndUpdate(
      id,
      {
        ...(items && { items }),
        ...(academic_year && { academic_year }),
        updated_by: userId,
        updated_at: new Date(),
      },
      { new: true },
    )
      .populate("batch_id", "name course_id")
      .populate("course_id", "name")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    res.json({
      success: true,
      message: "Syllabus updated successfully",
      data: syllabus,
    });
  } catch (error) {
    console.error("Error updating syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update syllabus",
      error: error.message,
    });
  }
};

// Add item to syllabus
export const addSyllabusItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, topic, subtopic, description, duration_hours, order } =
      req.body;

    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        message: "subject and topic are required",
      });
    }

    const syllabus = await Syllabus.findById(id);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    const newItem = {
      subject,
      topic,
      subtopic,
      description,
      duration_hours: duration_hours || 1,
      order: order || syllabus.items.length + 1,
      created_at: new Date(),
    };

    syllabus.items.push(newItem);
    syllabus.updated_at = new Date();

    await syllabus.save();
    await syllabus.populate("batch_id", "name course_id");
    await syllabus.populate("course_id", "name");

    res.status(201).json({
      success: true,
      message: "Item added to syllabus successfully",
      data: syllabus,
    });
  } catch (error) {
    console.error("Error adding syllabus item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add syllabus item",
      error: error.message,
    });
  }
};

// Update syllabus item
export const updateSyllabusItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { subject, topic, subtopic, description, duration_hours, order } =
      req.body;

    const syllabus = await Syllabus.findById(id);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    const itemIndex = syllabus.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Syllabus item not found",
      });
    }

    const item = syllabus.items[itemIndex];
    if (subject) item.subject = subject;
    if (topic) item.topic = topic;
    if (subtopic) item.subtopic = subtopic;
    if (description) item.description = description;
    if (duration_hours) item.duration_hours = duration_hours;
    if (order) item.order = order;

    syllabus.updated_at = new Date();
    await syllabus.save();
    await syllabus.populate("batch_id", "name course_id");
    await syllabus.populate("course_id", "name");

    res.json({
      success: true,
      message: "Syllabus item updated successfully",
      data: syllabus,
    });
  } catch (error) {
    console.error("Error updating syllabus item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update syllabus item",
      error: error.message,
    });
  }
};

// Delete syllabus item
export const deleteSyllabusItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const syllabus = await Syllabus.findById(id);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    syllabus.items = syllabus.items.filter(
      (item) => item._id.toString() !== itemId,
    );
    syllabus.updated_at = new Date();

    await syllabus.save();
    await syllabus.populate("batch_id", "name course_id");
    await syllabus.populate("course_id", "name");

    res.json({
      success: true,
      message: "Syllabus item deleted successfully",
      data: syllabus,
    });
  } catch (error) {
    console.error("Error deleting syllabus item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete syllabus item",
      error: error.message,
    });
  }
};

// Delete syllabus
export const deleteSyllabus = async (req, res) => {
  try {
    const { id } = req.params;

    const syllabus = await Syllabus.findByIdAndDelete(id);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }

    res.json({
      success: true,
      message: "Syllabus deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete syllabus",
      error: error.message,
    });
  }
};

// Generate syllabus template - CLIENT FORMAT with merged cells
export const getSyllabusTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Syllabus");

    // Define columns to match client format
    worksheet.columns = [
      { header: "Course", key: "course", width: 12 },
      { header: "Subject", key: "subject", width: 20 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Chapter No", key: "chapter", width: 12 },
      { header: "Topic", key: "topic", width: 40 },
      { header: "Subtopic", key: "subtopic", width: 100 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // ⚠️ NO SAMPLE DATA ROWS ADDED HERE - keep Syllabus sheet clean with only headers

    // Add instructions sheet WITH sample data in merged cell format
    const notesSheet = workbook.addWorksheet("Instructions");

    notesSheet.getCell("A1").value = "Syllabus Bulk Upload Instructions";
    notesSheet.getCell("A1").font = { bold: true, size: 14 };

    notesSheet.getCell("A3").value = "Template Format:";
    notesSheet.getCell("A3").font = { bold: true };
    notesSheet.getCell("A4").value =
      "• Course - Course/Class name (e.g., 11, 12, B.Tech, etc.)";
    notesSheet.getCell("A5").value =
      "• Subject - Subject name (e.g., Physics, Mathematics, etc.)";
    notesSheet.getCell("A6").value = "• Unit - Unit number (e.g., 1, 2, 3)";
    notesSheet.getCell("A7").value = "• Chapter No - Chapter number";
    notesSheet.getCell("A8").value = "• Topic - Main topic name";
    notesSheet.getCell("A9").value = "• Subtopic - Detailed content/subtopics";

    notesSheet.getCell("A11").value = "Important Notes:";
    notesSheet.getCell("A11").font = { bold: true };
    notesSheet.getCell("A12").value =
      "• The system will automatically handle merged cells";
    notesSheet.getCell("A13").value =
      "• You can leave Course, Subject, and Unit cells empty for continuation rows";
    notesSheet.getCell("A14").value =
      "• The Course name must exist in the system";
    notesSheet.getCell("A15").value =
      "• All topics will be grouped by Course and Academic Year automatically";
    notesSheet.getCell("A16").value =
      "• Duplicate entries (same Subject + Topic + Subtopic) will be skipped";

    // ADD EXAMPLE DATA WITH MERGED CELLS FORMAT HERE
    notesSheet.getCell("A18").value = "Example Data (with merged cells):";
    notesSheet.getCell("A18").font = { bold: true, size: 12 };

    // Set up columns for example section
    notesSheet.getColumn(1).width = 12; // Course
    notesSheet.getColumn(2).width = 20; // Subject
    notesSheet.getColumn(3).width = 10; // Unit
    notesSheet.getColumn(4).width = 12; // Chapter No
    notesSheet.getColumn(5).width = 40; // Topic
    notesSheet.getColumn(6).width = 100; // Subtopic

    // Header row for example data (row 20)
    const exampleHeaderRow = 20;
    notesSheet.getRow(exampleHeaderRow).values = [
      "Course",
      "Subject",
      "Unit",
      "Chapter No",
      "Topic",
      "Subtopic",
    ];
    notesSheet.getRow(exampleHeaderRow).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    notesSheet.getRow(exampleHeaderRow).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    notesSheet.getRow(exampleHeaderRow).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Add sample data rows (21-23)
    const sampleRows = [
      {
        class: "11",
        subject: "Physics",
        unit: "1",
        chapter: "1",
        topic: "Basic Mathematics",
        subtopic:
          "Physics-scope and excitement; nature of physical laws; Physics, technology and society.",
      },
      {
        class: "",
        subject: "",
        unit: "",
        chapter: "2",
        topic: "Units and Measurements",
        subtopic:
          "Need for measurement: Units of measurement; systems of units; SI units, fundamental and derived units. Length, mass and time measurements; accuracy and precision of measuring instruments; errors in measurement; significant figures.\nDimensions of physical quantities, dimensional analysis and its applications.",
      },
      {
        class: "",
        subject: "",
        unit: "",
        chapter: "3",
        topic: "Motion in a Straight Line (1-D)",
        subtopic:
          "Frame of reference, Motion in a straight line: Position-time graph, speed and velocity.\nElementary concepts of differentiation and integration for describing motion, uniform and non- uniform motion, average speed and instantaneous velocity, uniformly accelerated motion, velocity - time and position-time graphs.\nRelations for uniformly accelerated motion (graphical treatment).",
      },
    ];

    let currentRow = exampleHeaderRow + 1;
    sampleRows.forEach((rowData) => {
      notesSheet.getRow(currentRow).values = [
        rowData.class,
        rowData.subject,
        rowData.unit,
        rowData.chapter,
        rowData.topic,
        rowData.subtopic,
      ];
      currentRow++;
    });

    // Apply merged cell styling for demonstration (rows 21-23)
    // Merge Course cell for rows 21-23
    notesSheet.mergeCells("A21:A23");
    notesSheet.getCell("A21").value = "11";
    notesSheet.getCell("A21").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Merge Subject cell for rows 21-23
    notesSheet.mergeCells("B21:B23");
    notesSheet.getCell("B21").value = "Physics";
    notesSheet.getCell("B21").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Merge Unit cell for rows 21-23
    notesSheet.mergeCells("C21:C23");
    notesSheet.getCell("C21").value = "1";
    notesSheet.getCell("C21").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Apply borders to example data cells
    for (let r = exampleHeaderRow; r <= exampleHeaderRow + 3; r++) {
      for (let c = 1; c <= 6; c++) {
        const cell = notesSheet.getCell(r, c);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // Set text wrap for subtopic column in example
    notesSheet.getColumn(6).alignment = { wrapText: true, vertical: "top" };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="syllabus_template.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generating syllabus template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
};


// Bulk upload syllabi - PRODUCTION-GRADE with merged cell handling
export const bulkUploadSyllabi = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    console.log("📤 Starting syllabus bulk upload...");
    console.log("📁 File info:", {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "No worksheet found in file",
      });
    }

    // ==========================================
    // PHASE 1: PARSE & NORMALIZE EXCEL ROWS
    // ==========================================
    const normalizedRows = [];
    let currentCourse = null;
    let currentSubject = null;
    let currentUnit = null;

    console.log(`📊 Total rows in worksheet: ${worksheet.rowCount}`);
    console.log(`📋 First 5 rows preview:`);

    // Preview first 5 rows to understand structure
    for (let i = 1; i <= Math.min(5, worksheet.rowCount); i++) {
      const previewRow = worksheet.getRow(i);
      console.log(`   Row ${i}:`, {
        A: previewRow.getCell(1).value,
        B: previewRow.getCell(2).value,
        C: previewRow.getCell(3).value,
        D: previewRow.getCell(4).value,
        E: previewRow.getCell(5).value,
        F: previewRow.getCell(6).value
          ? String(previewRow.getCell(6).value).substring(0, 30) + "..."
          : null,
      });
    }

    // Start from row 2 (skip header)
    const startRow = 2;

    for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      // Read cell values (Column A=1, B=2, etc.)
      const cellCourse = row.getCell(1).value;
      const cellSubject = row.getCell(2).value;
      const cellUnit = row.getCell(3).value;
      const cellChapterNo = row.getCell(4).value;
      const cellTopic = row.getCell(5).value;
      const cellSubtopic = row.getCell(6).value;

      if (rowNum <= 5 || rowNum % 20 === 0) {
        console.log(`\n🔍 Row ${rowNum} raw values:`, {
          course: cellCourse,
          subject: cellSubject,
          unit: cellUnit,
          chapter: cellChapterNo,
          topic: cellTopic,
          subtopic: cellSubtopic
            ? String(cellSubtopic).substring(0, 50) + "..."
            : "",
        });
      }

      // Context carry-forward: Update tracked values only when non-empty
      if (cellCourse) {
        currentCourse = String(cellCourse).trim();
        console.log(`   ✅ Updated currentCourse: ${currentCourse}`);
      }
      if (cellSubject) {
        currentSubject = String(cellSubject).trim();
        console.log(`   ✅ Updated currentSubject: ${currentSubject}`);
      }
      if (cellUnit) {
        currentUnit = String(cellUnit).trim();
        console.log(`   ✅ Updated currentUnit: ${currentUnit}`);
      }

      // Skip row if no topic (empty row)
      if (!cellTopic) {
        console.log(`   ⏭️  Skipping row ${rowNum} - no topic`);
        continue;
      }

      const topic = String(cellTopic).trim();
      const subtopic = cellSubtopic ? String(cellSubtopic).trim() : "";

      console.log(
        `   📝 Using context: Course=${currentCourse}, Subject=${currentSubject}, Unit=${currentUnit}`,
      );

      // Normalize row data
      normalizedRows.push({
        rowNumber: rowNum,
        course: currentCourse,
        subject: currentSubject,
        unit: currentUnit,
        chapterNo: cellChapterNo ? String(cellChapterNo).trim() : "",
        topic: topic,
        subtopic: subtopic,
      });
    }

    console.log(`\n✅ Parsed ${normalizedRows.length} valid rows`);

    if (normalizedRows.length === 0) {
      return res.json({
        success: true,
        message: "No valid rows found to process",
        results: { success: [], failed: [], total: 0 },
      });
    }

    // ==========================================
    // PHASE 2: VALIDATE & GROUP DATA
    // ==========================================
    const validRows = [];
    const failedItems = [];

    // Group by course (for batch processing)
    const courseMap = new Map();

    for (const row of normalizedRows) {
      // Validate required fields
      if (!row.course || !row.subject || !row.topic) {
        console.log(`❌ Row ${row.rowNumber} validation failed:`, {
          course: row.course,
          subject: row.subject,
          topic: row.topic,
        });
        failedItems.push({
          row: row.rowNumber,
          error: "Missing required fields (Course, Subject, or Topic)",
          data: { course: row.course, subject: row.subject, topic: row.topic },
        });
        continue;
      }

      // Add to course map for grouped processing
      if (!courseMap.has(row.course)) {
        courseMap.set(row.course, []);
      }
      courseMap.get(row.course).push(row);
      validRows.push(row);
    }

    console.log(
      `\n✅ Validated: ${validRows.length} valid, ${failedItems.length} failed`,
    );
    console.log(
      `📚 Found ${courseMap.size} unique courses:`,
      Array.from(courseMap.keys()),
    );

    // ==========================================
    // PHASE 3: PERSIST TO DATABASE
    // ==========================================
    const successItems = [];
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    console.log(`\n📅 Using academic year: ${academicYear}`);
    console.log(
      `👤 Created by user: ${req.user?._id || "NOT SET - THIS IS A PROBLEM!"}`,
    );

    // Cache for DB lookups
    const courseCache = new Map();
    const syllabusCache = new Map();

    for (const [courseName, courseRows] of courseMap.entries()) {
      try {
        console.log(
          `\n\n🔄 Processing course: ${courseName} (${courseRows.length} items)`,
        );

        // ========== Lookup/Cache Course ==========
        let course = courseCache.get(courseName);

        if (!course) {
          console.log(`   🔍 Looking up course: ${courseName}`);

          // Try exact match first (case-insensitive)
          course = await Course.findOne({
            name: { $regex: new RegExp(`^${courseName}$`, "i") },
          });

          // If not found, try partial match (e.g., "11" matches "11 ICSE")
          if (!course) {
            console.log(`   🔍 Exact match not found, trying partial match...`);
            course = await Course.findOne({
              name: { $regex: new RegExp(`^${courseName}\\s`, "i") }, // "11 " matches "11 ICSE"
            });
          }

          // If still not found, try if courseName is contained in the name
          if (!course) {
            console.log(
              `   🔍 Partial match not found, trying contains match...`,
            );
            course = await Course.findOne({
              name: { $regex: new RegExp(courseName, "i") }, // "11" matches "11 ICSE", "JEE 11", etc.
            });
          }

          if (!course) {
            console.log(`   ❌ Course not found: ${courseName}`);
            // Course not found - fail all rows for this course
            for (const row of courseRows) {
              failedItems.push({
                row: row.rowNumber,
                error: `Course not found: "${courseName}". Available courses: ${Array.from(courseCache.keys()).join(", ") || "Check /api/courses"}`,
                data: { course: courseName },
              });
            }
            continue;
          }

          console.log(`   ✅ Found course:`, {
            id: course._id,
            name: course.name,
            matchType: course.name === courseName ? "exact" : "partial",
          });
          courseCache.set(courseName, course);
        } else {
          console.log(`   📋 Using cached course: ${course.name}`);
        }

        // ========== Lookup/Create Syllabus ==========
        let syllabus = syllabusCache.get(course._id.toString());

        if (!syllabus) {
          console.log(
            `   🔍 Looking up syllabus for course ${course._id}, year ${academicYear}`,
          );
          syllabus = await Syllabus.findOne({
            course_id: course._id,
            academic_year: academicYear,
          });

          if (!syllabus) {
            console.log(`   🆕 Creating new syllabus`);

            // Check if req.user exists
            if (!req.user || !req.user.id) {
              console.error(
                `   ❌ CRITICAL: req.user or req.user.id is missing!`,
              );
              throw new Error("User authentication required");
            }

            syllabus = new Syllabus({
              course_id: course._id,
              academic_year: academicYear,
              items: [],
              created_by: req.user.id,
            });
            console.log(`   ✅ New syllabus created (not saved yet)`);
          } else {
            console.log(
              `   ✅ Found existing syllabus with ${syllabus.items.length} items`,
            );
          }

          syllabusCache.set(course._id.toString(), syllabus);
        }

        // ========== Build unique key set for deduplication ==========
        const existingKeys = new Set(
          syllabus.items.map(
            (item) => `${item.subject}|||${item.topic}|||${item.subtopic}`,
          ),
        );

        console.log(`   📊 Existing unique items: ${existingKeys.size}`);

        // ========== Add items (with deduplication) ==========
        let addedCount = 0;
        let skippedCount = 0;

        for (const row of courseRows) {
          const uniqueKey = `${row.subject}|||${row.topic}|||${row.subtopic}`;

          // Skip if duplicate
          if (existingKeys.has(uniqueKey)) {
            console.log(
              `   ⏭️  Row ${row.rowNumber}: Duplicate - ${row.topic}`,
            );
            skippedCount++;

            successItems.push({
              row: row.rowNumber,
              course_name: course.name,
              subject: row.subject,
              topic: row.topic,
              academic_year: academicYear,
              action: "Skipped (Duplicate)",
            });
            continue;
          }

          // Add new item
          const newItem = {
            subject: row.subject,
            topic: row.topic,
            subtopic: row.subtopic,
            description: row.unit
              ? `Unit ${row.unit}${row.chapterNo ? ` - Chapter ${row.chapterNo}` : ""}`
              : "",
            duration_hours: 2,
            created_at: new Date(),
          };

          console.log(`   ➕ Adding item: ${row.topic}`);
          syllabus.items.push(newItem);
          existingKeys.add(uniqueKey);
          addedCount++;

          successItems.push({
            row: row.rowNumber,
            course_name: course.name,
            subject: row.subject,
            topic: row.topic,
            academic_year: academicYear,
            action: syllabus.items.length === 1 ? "Created" : "Added",
          });
        }

        // ========== Save syllabus ==========
        if (addedCount > 0) {
          console.log(`   💾 Saving syllabus with ${addedCount} new items...`);
          syllabus.updated_at = new Date();
          syllabus.updated_by = req.user?.id;

          const savedSyllabus = await syllabus.save();
          console.log(
            `   ✅ Syllabus saved successfully! ID: ${savedSyllabus._id}`,
          );
          console.log(
            `   📊 Total items in syllabus: ${savedSyllabus.items.length}`,
          );
        } else {
          console.log(
            `   ⏭️  No new items to save (${skippedCount} duplicates)`,
          );
        }
      } catch (error) {
        console.error(`\n💥 Error processing course ${courseName}:`, error);
        console.error("Stack trace:", error.stack);

        // Fail all rows for this course
        for (const row of courseRows) {
          failedItems.push({
            row: row.rowNumber,
            error: `Database error: ${error.message}`,
            data: { course: courseName, subject: row.subject },
          });
        }
      }
    }

    // ==========================================
    // PHASE 4: RETURN SUMMARY
    // ==========================================
    console.log("\n\n📊 ========== UPLOAD SUMMARY ==========");
    console.log(`   ✅ Success: ${successItems.length}`);
    console.log(`   ❌ Failed: ${failedItems.length}`);
    console.log(`   📝 Total: ${successItems.length + failedItems.length}`);
    console.log("=========================================\n");

    res.json({
      success: true,
      message: "Bulk upload completed",
      results: {
        success: successItems,
        failed: failedItems,
        total: successItems.length + failedItems.length,
      },
    });
  } catch (error) {
    console.error("\n💥 CRITICAL BULK UPLOAD ERROR:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk upload",
      error: error.message,
    });
  }
};
