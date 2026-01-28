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
    const { batch_id, academic_year } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role?.toLowerCase(); // Convert to lowercase for case-insensitive comparison

    let query = {};

    // Authorization logic based on role
    if (userRole === "student") {
      // Get student's batch
      const student = await Student.findOne({ user_id: userId });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Student record not found",
        });
      }
      // Force filter to student's batch only
      query.batch_id = student.batch_id;
    } else if (userRole === "parent") {
      // Get parent's children's batches
      const parent = await Parent.findOne({ user_id: userId });
      if (!parent || !parent.student_id) {
        // Parent has no linked student, return empty
        return res.json({
          success: true,
          data: []
        });
      }
      // Get the student linked to this parent
      const student = await Student.findById(parent.student_id);
      if (!student || !student.batch_id) {
        // Student not found or no batch assigned, return empty
        return res.json({
          success: true,
          data: []
        });
      }
      // Parent can only see their child's batch syllabus
      query.batch_id = student.batch_id;
    } else if (userRole === "teacher") {
      // Get teacher's assigned batches
      const teacher = await Teacher.findOne({ user_id: userId });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: "Teacher record not found",
        });
      }
      // If batch_id provided, verify teacher has access to it
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
          // Teacher has no assigned batches
          query.batch_id = { $in: [] }; // Return empty result
        }
      } else {
        // Return syllabi for all teacher's assigned batches
        if (teacher.assigned_batches && teacher.assigned_batches.length > 0) {
          query.batch_id = { $in: teacher.assigned_batches };
        } else {
          query.batch_id = { $in: [] }; // Return empty result
        }
      }
    } else if (userRole === "admin" || userRole === "superadmin") {
      // Admins can access all syllabi, apply filters if provided
      if (batch_id) query.batch_id = batch_id;
      if (academic_year) query.academic_year = academic_year;
    } else {
      // For any other authenticated user, return empty result instead of error
      // This prevents breaking the page for users without specific roles
      query.batch_id = { $in: [] };
    }

    if (academic_year) query.academic_year = academic_year;

    const syllabi = await Syllabus.find(query)
      .populate("batch_id", "name course_id")
      .populate("course_id", "name")
      .populate("created_by", "name email")
      .populate("updated_by", "name email");

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
    const userRole = req.user?.role?.toLowerCase(); // Convert to lowercase for case-insensitive comparison

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
    const existingSyllabus = await Syllabus.findOne({ course_id, academic_year });
    if (existingSyllabus) {
      return res.status(400).json({
        success: false,
        message: "Syllabus already exists for this course and academic year",
      });
    }

    // Handle empty batch_id string - convert to undefined so it doesn't try to cast empty string to ObjectId
    const processedBatchId = batch_id && batch_id.trim() !== '' ? batch_id : undefined;

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

// Generate syllabus template
export const getSyllabusTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Syllabi");

    // Define columns
    worksheet.columns = [
      { header: "Batch ID *", key: "batch_id", width: 20 },
      { header: "Course ID *", key: "course_id", width: 20 },
      { header: "Academic Year *", key: "academic_year", width: 15 },
      { header: "Subject *", key: "subject", width: 20 },
      { header: "Topic *", key: "topic", width: 25 },
      { header: "Subtopic", key: "subtopic", width: 25 },
      { header: "Description", key: "description", width: 30 },
      { header: "Duration (hours)", key: "duration_hours", width: 15 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    // Add sample row
    worksheet.addRow({
      batch_id: "BATCH_ID_HERE",
      course_id: "COURSE_ID_HERE",
      academic_year: "2024-2025",
      subject: "Mathematics",
      topic: "Algebra Fundamentals",
      subtopic: "Linear Equations",
      description: "Introduction to basic algebra",
      duration_hours: 2,
    });

    // Add notes sheet
    const notesSheet = workbook.addWorksheet("Instructions");
    notesSheet.getCell("A1").value = "Syllabus Bulk Upload Instructions";
    notesSheet.getCell("A1").font = { bold: true, size: 14 };

    notesSheet.getCell("A3").value = "Required Fields (marked with *)";
    notesSheet.getCell("A3").font = { bold: true };
    notesSheet.getCell("A4").value = "• Batch ID - Copy from batch records";
    notesSheet.getCell("A5").value = "• Course ID - Copy from course records";
    notesSheet.getCell("A6").value = "• Academic Year - Format like 2024-2025";
    notesSheet.getCell("A7").value = "• Subject - Name of the subject";
    notesSheet.getCell("A8").value = "• Topic - Topic name";

    notesSheet.getCell("A10").value = "Optional Fields";
    notesSheet.getCell("A10").font = { bold: true };
    notesSheet.getCell("A11").value = "• Subtopic - Sub-division of topic";
    notesSheet.getCell("A12").value = "• Description - Additional notes";
    notesSheet.getCell("A13").value = "• Duration (hours) - Number format";

    notesSheet.getColumn("A").width = 80;

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="syllabus_template.xlsx"',
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

// Bulk upload syllabi
export const bulkUploadSyllabi = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const ExcelJS = require("exceljs");
    const Course = require("../models/Course.js").default;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet("Syllabi");
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'No "Syllabi" worksheet found in file',
      });
    }

    const successItems = [];
    const failedItems = [];

    // Process each row
    for (let idx = 2; idx <= worksheet.rowCount; idx++) {
      const row = worksheet.getRow(idx);

      try {
        const data = {
          batch_id: row.getCell(1).value?.toString?.(),
          course_id: row.getCell(2).value?.toString?.(),
          academic_year: row.getCell(3).value?.toString?.(),
          subject: row.getCell(4).value?.toString?.(),
          topic: row.getCell(5).value?.toString?.(),
          subtopic: row.getCell(6).value?.toString?.() || "",
          description: row.getCell(7).value?.toString?.() || "",
          duration_hours: parseInt(row.getCell(8).value) || 1,
        };

        // Skip empty rows
        if (!data.batch_id && !data.course_id) {
          continue;
        }

        // Validate required fields
        if (!data.batch_id || !data.course_id || !data.academic_year) {
          failedItems.push({
            row: idx,
            data,
            error:
              "Missing required fields (Batch ID, Course ID, or Academic Year)",
          });
          continue;
        }

        if (!data.subject || !data.topic) {
          failedItems.push({
            row: idx,
            data,
            error: "Missing subject or topic",
          });
          continue;
        }

        // Check if batch exists
        const batch = await Batches.findById(data.batch_id);
        if (!batch) {
          failedItems.push({
            row: idx,
            data,
            error: `Batch not found with ID: ${data.batch_id}`,
          });
          continue;
        }

        // Check if course exists
        const course = await Course.findById(data.course_id);
        if (!course) {
          failedItems.push({
            row: idx,
            data,
            error: `Course not found with ID: ${data.course_id}`,
          });
          continue;
        }

        // Check if syllabus already exists
        const existing = await Syllabus.findOne({
          batch_id: data.batch_id,
          academic_year: data.academic_year,
        });

        if (existing) {
          // Add item to existing syllabus
          existing.items.push({
            subject: data.subject,
            topic: data.topic,
            subtopic: data.subtopic,
            description: data.description,
            duration_hours: data.duration_hours,
            created_at: new Date(),
          });
          await existing.save();

          successItems.push({
            row: idx,
            batch_name: batch.name,
            course_name: course.name,
            academic_year: data.academic_year,
            items_count: existing.items.length,
            action: "Updated",
          });
        } else {
          // Create new syllabus
          const newSyllabus = new Syllabus({
            batch_id: data.batch_id,
            course_id: data.course_id,
            academic_year: data.academic_year,
            items: [
              {
                subject: data.subject,
                topic: data.topic,
                subtopic: data.subtopic,
                description: data.description,
                duration_hours: data.duration_hours,
                created_at: new Date(),
              },
            ],
            created_by: req.user?._id,
            updated_by: req.user?._id,
          });

          await newSyllabus.save();

          successItems.push({
            row: idx,
            batch_name: batch.name,
            course_name: course.name,
            academic_year: data.academic_year,
            items_count: 1,
            action: "Created",
          });
        }
      } catch (error) {
        failedItems.push({
          row: idx,
          data: {},
          error: error.message,
        });
      }
    }

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
    console.error("Error in bulk upload:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk upload",
      error: error.message,
    });
  }
};
