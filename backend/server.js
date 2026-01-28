import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import cookieParser from "cookie-parser";
import { upload } from "./middleware/upload.js";
import { uploadReceipt } from "./middleware/uploadReceipt.js";
import { verifyAuth } from "./middlewares/jwtAuth.js";
import path from "path";

dotenv.config();

const app = express();

import User from "./models/User.js";
import Course from "./models/Course.js";
import Batches from "./models/Batches.js";
import Parent from "./models/Parent.js";
import Student from "./models/Student.js";
import Lecture from "./models/Lecture.js";
import Teacher from "./models/Teacher.js";
import Payment from "./models/Payment.js";
import Expense from "./models/Expense.js";
import Salary from "./models/Salary.js";
import FeePlan from "./models/FeePlan.js";
import FeeInstallment from "./models/FeeInstallment.js";
import FeePayment from "./models/FeePayment.js";
import Counter from "./models/Counter.js";

import Exam from "./models/Exam.js";
import Result from "./models/Result.js";
import Enquiry from "./models/Enquiry.js";
import RolePermissions from "./models/RolePermissions.js";

// const Course = require("../backend/models/Courses");
// const Lesson = require("../backend/models/Lessons");
// const Assignment = require("../backend/models/Assignments");
// const Submission = require("../backend/models/Submissions");
import attendanceRoutes from "./routes/attendance.js";
import deviceRoutes from "./routes/devices.js";
// ===== Middleware =====
app.use(express.json());
app.use(cookieParser());
const corsAllowList = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
if (!corsAllowList.length) {
  corsAllowList.push("http://localhost:3000", "https://cms-deploy-chi.vercel.app");
}
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // non-browser or same-origin
    const cleanOrigin = origin.replace(/\/$/, "");
    const allowed =
      corsAllowList.includes(cleanOrigin) ||
      process.env.ALLOW_ALL_ORIGINS === "true";
    if (allowed) return callback(null, true);
    return callback(new Error(`CORS blocked for origin ${cleanOrigin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Handle preflight requests

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.options("*", cors(corsOptions));

// ===== Routers (JWT auth, user, and protected examples) =====
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import protectedRouter from "./routes/protected.js";
import usersRouter from "./routes/users.js";
import featuresRouter from "./routes/features.js";
import lecturesRouter from "./routes/lectures.js";
import rolesRouter from "./routes/roles.js";
import syllabusRouter from "./routes/syllabus.js";
import dashboardRouter from "./routes/dashboard.js";

// ===== LECTURE TEMPLATE ROUTE (must be before router mount) =====
// Download Lecture template
app.get("/api/lectures/template", async (req, res) => {
  console.log("📥 Lecture template download requested");

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lectures");

    worksheet.columns = [
      { header: "Course Name *", key: "course_name", width: 25 },
      { header: "Batch Name *", key: "batch_name", width: 25 },
      { header: "Subject *", key: "subject", width: 20 },
      { header: "Teacher First Name *", key: "teacher_fname", width: 20 },
      { header: "Teacher Last Name *", key: "teacher_lname", width: 20 },
      { header: "Date (DD/MM/YYYY) *", key: "date", width: 18 },
      { header: "Start Time (HH:MM) *", key: "start_time", width: 18 },
      { header: "End Time (HH:MM) *", key: "end_time", width: 18 },
      { header: "Topic *", key: "topic", width: 30 },
      { header: "Subtopic", key: "subtopic", width: 30 },
      { header: "Note", key: "note", width: 40 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Add sample row
    worksheet.addRow({
      course_name: "Mathematics",
      batch_name: "Batch A",
      subject: "Mathematics",
      teacher_fname: "John",
      teacher_lname: "Doe",
      date: "20/10/2025",
      start_time: "10:00",
      end_time: "11:30",
      topic: "Calculus - Derivatives",
      subtopic: "Chain Rule and Product Rule",
      note: "Bring calculator and textbook",
      status: "scheduled",
    });

    // Add a second example
    worksheet.addRow({
      course_name: "Physics",
      batch_name: "Batch B",
      subject: "Physics",
      teacher_fname: "Jane",
      teacher_lname: "Smith",
      date: "22/10/2025",
      start_time: "14:00",
      end_time: "15:30",
      topic: "Mechanics - Laws of Motion",
      subtopic: "Newton's Laws",
      note: "Revise chapter 5",
      status: "scheduled",
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add notes sheet
    const notesSheet = workbook.addWorksheet("Instructions");
    notesSheet.getCell("A1").value = "INSTRUCTIONS FOR BULK LECTURE UPLOAD";
    notesSheet.getCell("A1").font = { bold: true, size: 14 };

    notesSheet.getCell("A3").value = "Required Fields (marked with *):";
    notesSheet.getCell("A3").font = { bold: true };

    notesSheet.getCell("A4").value =
      "• Course Name: Must exactly match a course name";
    notesSheet.getCell("A5").value =
      "• Batch Name: Must exactly match a batch under the course";
    notesSheet.getCell("A6").value = "• Subject: Name of the subject";
    notesSheet.getCell("A7").value =
      "• Teacher First Name: First name of the teacher";
    notesSheet.getCell("A8").value =
      "• Teacher Last Name: Last name of the teacher";
    notesSheet.getCell("A9").value =
      "• Date: Format DD/MM/YYYY (e.g., 20/10/2025)";
    notesSheet.getCell("A10").value =
      "• Start/End Time: Format HH:MM (24-hour clock)";
    notesSheet.getCell("A11").value = "• Topic: Lecture topic or title";
    notesSheet.getCell("A12").value =
      "• Total Marks: Number of marks (e.g., 100)";

    notesSheet.getCell("A13").value = "Optional Fields:";
    notesSheet.getCell("A13").font = { bold: true };
    notesSheet.getCell("A14").value =
      "• Exam Link: Required only for online exams (on_theory, on_mcq)";

    notesSheet.getCell("A16").value = "Valid Exam Types:";
    notesSheet.getCell("A16").font = { bold: true };
    notesSheet.getCell("A17").value = "• on_theory = Online Theory Exam";
    notesSheet.getCell("A18").value = "• off_theory = Offline Theory Exam";
    notesSheet.getCell("A19").value = "• on_mcq = Online MCQ Exam";
    notesSheet.getCell("A20").value = "• off_mcq = Offline MCQ Exam";

    notesSheet.getColumn("A").width = 80;

    const buffer = await workbook.xlsx.writeBuffer();

    console.log("✅ Lecture template generated, size:", buffer.length, "bytes");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="lecture_template.xlsx"',
    );
    res.send(buffer);
  } catch (error) {
    console.error("❌ Lecture template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
});

// ===== MOUNT ROUTERS =====
app.use("/auth", authRouter);
app.use("/api", userRouter);
app.use("/api", protectedRouter);
app.use("/api", usersRouter);
app.use("/api", featuresRouter);
app.use("/api/lectures", lecturesRouter);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/roles", rolesRouter);
app.use("/api/syllabus", syllabusRouter);
app.use("/api/dashboard", dashboardRouter);

// ===== FEE PLANS ROUTES =====

// Get fee plans list
app.get("/api/fee-plans", async (req, res) => {
  try {
    const { batch_id } = req.query;
    const filter = batch_id ? { batch_id } : {};

    const plans = await FeePlan.find(filter)
      .populate({
        path: "batch_id",
        select: "name course_id",
        populate: { path: "course_id", select: "name" },
      })
      .populate("course_id", "name")
      .sort({ created_at: -1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create fee plan
app.post("/api/fee-plans", async (req, res) => {
  try {
    console.log(
      "📝 Creating fee plan with data:",
      JSON.stringify(req.body, null, 2),
    );

    const {
      batch_id,
      course_id,
      total_amount,
      num_installments,
      discount_types,
      is_default,
      installments,
    } = req.body;

    // Validate required fields
    if (!batch_id || !total_amount || !num_installments) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: batch_id, total_amount, num_installments",
      });
    }

    // Build plan data
    const planData = {
      batch_id,
      total_amount: Number(total_amount),
      num_installments: Number(num_installments),
    };

    // Add optional fields
    if (course_id) planData.course_id = course_id;
    if (discount_types && Array.isArray(discount_types))
      planData.discount_types = discount_types;
    if (typeof is_default === "boolean") planData.is_default = is_default;

    console.log("💾 Saving plan with data:", JSON.stringify(planData, null, 2));

    const plan = new FeePlan(planData);
    await plan.save();

    console.log(
      `✅ Fee plan created with ${planData.num_installments} installments (calculated dynamically)`,
    );

    // Populate and return
    const populated = await FeePlan.findById(plan._id).populate({
      path: "batch_id",
      select: "name course_id",
      populate: { path: "course_id", select: "name" },
    });

    console.log("✅ Fee plan created successfully");
    res.status(201).json({ success: true, plan: populated });
  } catch (err) {
    console.error("❌ Error creating fee plan:", err.message);
    console.error("Full error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update fee plan
app.put("/api/fee-plans/:id", async (req, res) => {
  try {
    const update = { ...req.body, updated_at: new Date() };
    const plan = await FeePlan.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate({
      path: "batch_id",
      select: "name course_id",
      populate: { path: "course_id", select: "name" },
    });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete fee plan and its installments
app.delete("/api/fee-plans/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await FeeInstallment.deleteMany({ plan_id: id });
    await FeePlan.findByIdAndDelete(id);
    res.json({ success: true, message: "Fee plan deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== Health Check =====
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VikiTech Classroom Management API is running",
  });
});

// Debug endpoint to test JWT auth
app.get("/api/debug/auth", verifyAuth, (req, res) => {
  res.json({
    success: true,
    message: "JWT auth working",
    user: req.user,
    hasCookies: !!req.cookies?.access_token,
  });
});

// ===== EXPENSES ROUTES =====

// Meta: categories, statuses, payment modes
const EXPENSE_CATEGORIES = [
  { key: "fixed_overhead", label: "Fixed / Overhead Expenses" },
  { key: "administrative", label: "Administrative Expenses" },
  { key: "academic_teaching", label: "Academic / Teaching Expenses" },
  { key: "marketing_advertising", label: "Marketing & Advertising" },
  { key: "hr_staff", label: "Human Resource & Staff Expenses" },
  { key: "financial_compliance", label: "Financial / Compliance Expenses" },
  { key: "capital_expenditure", label: "Capital Expenditure (Assets)" },
  { key: "miscellaneous", label: "Miscellaneous / Others" },
];
const EXPENSE_STATUSES = ["paid", "pending", "overdue"];
const EXPENSE_PAYMENT_MODES = ["cash", "bank", "upi"];

app.get("/api/expenses/meta", (req, res) => {
  res.json({
    success: true,
    categories: EXPENSE_CATEGORIES,
    statuses: EXPENSE_STATUSES,
    payment_modes: EXPENSE_PAYMENT_MODES,
  });
});

// List expenses with filters
app.get("/api/expenses", async (req, res) => {
  try {
    const { category, status, from, to, q } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(String(from));
      if (to) filter.date.$lte = new Date(String(to));
    }
    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: "i" } },
        { description: { $regex: String(q), $options: "i" } },
        { vendor_name: { $regex: String(q), $options: "i" } },
        { invoice_number: { $regex: String(q), $options: "i" } },
      ];
    }
    const expenses = await Expense.find(filter).sort({
      date: -1,
      created_at: -1,
    });
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create expense (supports multipart for receipt)
app.post("/api/expenses", uploadReceipt.single("receipt"), async (req, res) => {
  try {
    const body = req.body;
    const payload = {
      category: body.category,
      title: body.title,
      description: body.description,
      amount: Number(body.amount),
      date: body.date ? new Date(body.date) : new Date(),
      payment_method: body.payment_method,
      vendor_name: body.vendor_name,
      invoice_number: body.invoice_number,
      status: body.status || "pending",
    };
    if (req.file) {
      const rel = `/uploads/receipts/${req.file.filename}`;
      payload.receipt_url = rel;
    }
    const expense = new Expense(payload);
    await expense.save();
    res.status(201).json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update expense (supports multipart for receipt)
app.put(
  "/api/expenses/:id",
  uploadReceipt.single("receipt"),
  async (req, res) => {
    try {
      const update = { ...req.body };
      if (typeof update.amount !== "undefined")
        update.amount = Number(update.amount);
      if (typeof update.date !== "undefined")
        update.date = new Date(update.date);
      if (req.file)
        update.receipt_url = `/uploads/receipts/${req.file.filename}`;
      const expense = await Expense.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!expense)
        return res
          .status(404)
          .json({ success: false, message: "Expense not found" });
      res.json({ success: true, expense });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
);

// Delete expense
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Expense stats
app.get("/api/expenses/stats", async (req, res) => {
  try {
    const agg = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
        },
      },
    ]);
    const byCategory = await Expense.aggregate([
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);
    const stats = {
      totalAmount: agg[0]?.totalAmount || 0,
      pending: agg[0]?.pending || 0,
      byCategory,
    };
    res.json({ success: true, stats });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== Test Route to Create Sample Course =====
app.post("/api/create-test-course", async (req, res) => {
  try {
    const existingCourse = await Course.findOne({ name: "Test Course" });
    if (existingCourse) {
      return res.json({
        success: true,
        message: "Test course already exists",
        course: existingCourse,
      });
    }

    const testCourse = new Course({
      name: "Test Course",
      description: "A test course for batch creation",
      course_start: new Date(),
      course_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      duration_months: 12,
      course_fee: 50000,
      status: "Active",
    });

    await testCourse.save();
    res.json({
      success: true,
      message: "Test course created",
      course: testCourse,
    });
  } catch (err) {
    console.error("Error creating test course:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Helper: generate a temporary password (pattern-based or random)
function generateTempPassword(phone) {
  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length >= 4) return `App@${digits.slice(-4)}`;
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
  let out = "";
  for (let i = 0; i < 10; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Helper: derive first and last names when only a full name is provided
function deriveNames(inputFName, inputLName) {
  let f = inputFName || "";
  let l = inputLName || "";
  if (f && !l) {
    const parts = String(f).trim().split(/\s+/);
    if (parts.length > 1) {
      f = parts[0];
      l = parts.slice(1).join(" ");
    } else {
      // No space provided — duplicate to satisfy required schema
      l = parts[0];
    }
  }
  // In case both missing, set safe placeholders
  if (!f && !l) {
    f = "User";
    l = "Name";
  } else if (!f) {
    f = l; // mirror
  } else if (!l) {
    l = f; // mirror
  }
  return { fname: f, lname: l };
}

// Helper: parse Excel date inputs consistently (supports dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, Date, and Excel serials)
function parseExcelDate(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input;
  // Excel serial (days since 1899-12-30)
  if (typeof input === "number") {
    const millis = Math.round((input - 25569) * 86400 * 1000);
    const d = new Date(millis);
    return isNaN(d) ? null : d;
  }
  const str = String(input).trim();
  if (!str) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  let m = str.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }
  // yyyy-mm-dd
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [_, yyyy, mm, dd] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

// ===== Batches API Routes =====
// GET /api/batches with pagination, supports archived filter
app.get("/api/batches", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const archivedParam = String(req.query.archived || "false").toLowerCase();
    const isArchivedReq = archivedParam === "true" || archivedParam === "1";
    const query = isArchivedReq
      ? { $or: [{ isArchived: true }, { archived: true }] }
      : {
          $and: [
            {
              $or: [
                { isArchived: { $ne: true } },
                { isArchived: { $exists: false } },
              ],
            },
            {
              $or: [
                { archived: { $ne: true } },
                { archived: { $exists: false } },
              ],
            },
          ],
        };

    const total = await Batches.countDocuments(query);
    const batchesRaw = await Batches.find(query)
      .populate("course_id", "name course_fee gst_percent")
      .populate("teacher_id", "fname lname")
      .skip(skip)
      .limit(limit);

    // Enrich with dynamic metrics: students_count, fees_collected, total_fees
    const enriched = await Promise.all(
      batchesRaw.map(async (b) => {
        const batchId = b._id;
        const courseId = b?.course_id?._id || b?.course_id;
        const round2 = (n) => Math.round((n || 0) * 100) / 100;

        // Count students in this batch and course
        const studentFilter = { batch_id: batchId };
        if (courseId) studentFilter["course_id"] = courseId;
        const students = await Student.find(studentFilter).lean();
        const studentIds = students.map((s) => s._id);
        const students_count = students.length;

        // Calculate total fees for all students with discounts + GST
        // Workflow: For EACH student: base_fee -> apply their discount -> add GST
        let total_fees = 0;
        const feePlan = await FeePlan.findOne({ batch_id: batchId }).lean();
        const gstPercent = b?.course_id?.gst_percent || 0;

        if (feePlan && feePlan.total_amount) {
          // For each student, calculate: (base - discount) + GST
          for (const student of students) {
            let studentFee = feePlan.total_amount; // Base fee

            // Step 1: Apply student's discount
            if (
              student.discount_type &&
              feePlan.discount_types &&
              Array.isArray(feePlan.discount_types)
            ) {
              const discountObj = feePlan.discount_types.find(
                (d) => d.code === student.discount_type,
              );
              if (discountObj && discountObj.discount_percent) {
                const discountAmount =
                  studentFee * (discountObj.discount_percent / 100);
                studentFee = studentFee - discountAmount;
              }
            }

            // Step 2: Add GST on discounted amount
            if (gstPercent > 0) {
              const gstAmount = studentFee * (gstPercent / 100);
              studentFee = studentFee + gstAmount;
            }

            total_fees += studentFee;
          }
        } else {
          // Fallback: use course fee + GST if no fee plan
          const courseFee = b?.course_id?.course_fee || 0;
          const feeWithGst = courseFee * (1 + gstPercent / 100);
          total_fees = students_count * feeWithGst;
        }

        total_fees = round2(total_fees);

        // Sum of all payments made by these students (installments paid)
        // IMPORTANT: Only count payments for THIS batch's fee plan to avoid counting
        // payments from when student was in a different batch
        let fees_collected = 0;
        if (studentIds.length && feePlan) {
          const sums = await FeePayment.aggregate([
            {
              $match: {
                student_id: { $in: studentIds },
                fee_plan_id: feePlan._id, // Only count payments for current batch's fee plan
              },
            },
            { $group: { _id: null, total: { $sum: "$paid_amount" } } },
          ]);
          fees_collected = round2(sums[0]?.total || 0);
        } else if (studentIds.length) {
          // Fallback: if no fee plan, count all payments (old behavior)
          const sums = await FeePayment.aggregate([
            { $match: { student_id: { $in: studentIds } } },
            { $group: { _id: null, total: { $sum: "$paid_amount" } } },
          ]);
          fees_collected = round2(sums[0]?.total || 0);
        }

        const asObj = b.toObject();
        asObj.students_count = students_count;
        asObj.fees_collected = fees_collected;
        asObj.total_fees = total_fees;
        return asObj;
      }),
    );

    res.json({ success: true, batches: enriched, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/batches (add new batch)
app.post("/api/batches", async (req, res) => {
  try {
    console.log("=== BATCH CREATION REQUEST ===");
    console.log("Raw body:", req.body);

    // Destructure required fields
    const { name, course_id, schedule } = req.body;
    const missing = [];
    if (!name) missing.push("name");
    if (!course_id) missing.push("course_id");
    if (!schedule) missing.push("schedule");
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Required fields missing: ${missing.join(", ")}`,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid course_id" });
    }
    if (
      req.body.teacher_id &&
      !mongoose.Types.ObjectId.isValid(req.body.teacher_id)
    ) {
      console.warn("Invalid teacher_id provided, removing from payload");
      delete req.body.teacher_id; // ignore invalid teacher_id
    }
    if (req.body.teacher_id === "") delete req.body.teacher_id;

    // Parse schedule if string
    let scheduleObj = schedule;
    try {
      if (typeof schedule === "string") scheduleObj = JSON.parse(schedule);
    } catch (e) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid schedule JSON" });
    }
    if (
      !scheduleObj.days ||
      !Array.isArray(scheduleObj.days) ||
      scheduleObj.days.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Schedule must include days[]" });
    }

    // Replace schedule string with structured schedule if desired (or keep as string to match schema)
    // Current schema stores 'schedule' as string, so we stringify again to ensure consistency
    req.body.schedule = JSON.stringify(scheduleObj);

    // Persist
    const batch = new Batches(req.body);
    await batch.save();
    console.log("Batch created with _id:", batch._id);
    res.json({ success: true, batch });
  } catch (err) {
    console.error("Batch creation failed:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/batches/:id (edit batch)
app.put("/api/batches/:id", async (req, res) => {
  try {
    const batch = await Batches.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/batches/:id (hard delete) - admin-only in future; retain for completeness
app.delete("/api/batches/:id", async (req, res) => {
  try {
    await Batches.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/batches/:id/archive (archive batch)
app.patch("/api/batches/:id/archive", async (req, res) => {
  try {
    const batch = await Batches.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: true, archived: true } },
      { new: true },
    );
    res.json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/batches/:id/restore (unarchive batch)
app.patch("/api/batches/:id/restore", async (req, res) => {
  try {
    const batch = await Batches.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: false, archived: false } },
      { new: true },
    );
    res.json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/batches/by-course - grouped batches mapped to course_id
app.get("/api/batches/by-course", async (req, res) => {
  try {
    const match = {
      $and: [
        {
          $or: [
            { isArchived: { $ne: true } },
            { isArchived: { $exists: false } },
          ],
        },
        {
          $or: [{ archived: { $ne: true } }, { archived: { $exists: false } }],
        },
      ],
    };

    const result = await Batches.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$course_id",
          batches: { $push: "$name" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, byCourse: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== Courses Routes =====

// ===== Courses API Routes =====
// GET /api/courses with pagination and archived filter
app.get("/api/courses", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const archivedParam = String(req.query.archived || "false").toLowerCase();
    const isArchivedReq = archivedParam === "true" || archivedParam === "1";
    const query = isArchivedReq
      ? { $or: [{ isArchived: true }, { archived: true }] }
      : {
          $and: [
            {
              $or: [
                { isArchived: { $ne: true } },
                { isArchived: { $exists: false } },
              ],
            },
            {
              $or: [
                { archived: { $ne: true } },
                { archived: { $exists: false } },
              ],
            },
          ],
        };

    const total = await Course.countDocuments(query);
    // Fetch the current page of courses
    const courses = await Course.find(query).skip(skip).limit(limit).lean();

    // Compute real-time student counts for the fetched course IDs
    const courseIds = courses.map((c) => c._id).filter(Boolean);
    let countsMap = new Map();
    if (courseIds.length) {
      const counts = await Student.aggregate([
        { $match: { course_id: { $in: courseIds } } },
        { $group: { _id: "$course_id", count: { $sum: 1 } } },
      ]);
      countsMap = new Map(counts.map((it) => [String(it._id), it.count]));
    }

    const enriched = courses.map((c) => ({
      ...c,
      // ensure key used by frontend is present and numeric
      students_count: countsMap.get(String(c._id)) || 0,
    }));

    res.json({ success: true, courses: enriched, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// DELETE /api/courses/:id
app.delete("/api/courses/:id", async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/courses/:id (edit)
app.put("/api/courses/:id", async (req, res) => {
  try {
    let { course_start, course_end, ...rest } = req.body;
    course_start = new Date(course_start);
    course_end = new Date(course_end);
    let duration_months = 0;
    if (
      course_start &&
      course_end &&
      !isNaN(course_start) &&
      !isNaN(course_end)
    ) {
      duration_months =
        (course_end.getFullYear() - course_start.getFullYear()) * 12 +
        (course_end.getMonth() - course_start.getMonth());
      if (duration_months < 0) duration_months = 0;
    }
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { ...rest, course_start, course_end, duration_months },
      { new: true },
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/courses/:id/archive (archive)
app.patch("/api/courses/:id/archive", async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: true, archived: true } },
      { new: true },
    );
    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/courses/:id/restore (unarchive)
app.patch("/api/courses/:id/restore", async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: false, archived: false } },
      { new: true },
    );
    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    let { course_start, course_end, ...rest } = req.body;
    course_start = new Date(course_start);
    course_end = new Date(course_end);
    // Calculate duration in months
    let duration_months = 0;
    if (
      course_start &&
      course_end &&
      !isNaN(course_start) &&
      !isNaN(course_end)
    ) {
      duration_months =
        (course_end.getFullYear() - course_start.getFullYear()) * 12 +
        (course_end.getMonth() - course_start.getMonth());
      if (duration_months < 0) duration_months = 0;
    }
    const course = new Course({
      ...rest,
      course_start,
      course_end,
      duration_months,
    });
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== MongoDB Connection =====
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("⚠️ No MongoDB URI found — starting server without database.");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    // Ensure indexes are in sync (important after changing unique/partial indexes)
    try {
      // Attempt to drop legacy aadhar_1 index if it exists to avoid conflicts
      try {
        const col = conn.connection.db.collection("students");
        const indexes = await col.indexes();
        const hasLegacy = indexes.some(
          (i) => i.name === "aadhar_1" && !i.partialFilterExpression,
        );
        if (hasLegacy) {
          await col.dropIndex("aadhar_1");
          console.log("🧹 Dropped legacy students.aadhar_1 index");
        }
      } catch (dropErr) {
        // best-effort cleanup; continue
      }
      await Promise.all([
        User.syncIndexes?.(),
        Course.syncIndexes?.(),
        Batches.syncIndexes?.(),
        Parent.syncIndexes?.(),
        Student.syncIndexes?.(),
      ]);
      console.log("✅ Mongoose indexes synchronized");
    } catch (idxErr) {
      console.warn("⚠️ Failed to sync indexes:", idxErr?.message || idxErr);
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.warn("⚠️ Continuing without MongoDB connection...");
  }
};

// Manual registration disabled — all users are created via admin flows
// app.post('/api/register', ...) // removed per "no register screen" policy

app.post("/api/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Update last_login and save
    user.last_login = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user._id, role: user.roleid, name: user.fname },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== STUDENT ROUTES =====

// Create a new student (Admin only) - Creates both User and Student in one transaction
// Admin adds an existing user to Students collection
// Create student with AUTO FEE SETUP
app.post("/api/students", async (req, res) => {
  console.log("📝 Creating new student with auto fee setup...");

  try {
    const {
      email,
      phone,
      fname,
      lname,
      dob,
      gender,
      aadhar,
      address,
      course_id,
      batch_id,
      fee_status = "pending",
      fee_plan,
      fee_plan_id,
      discount_type,
      guardians = [],
    } = req.body;

    console.log("📦 Received fee_plan_id:", fee_plan_id);
    console.log("📦 Received discount_type:", discount_type);

    // Normalize aadhar
    const normalizedAadhar =
      !aadhar || aadhar === null
        ? undefined
        : String(aadhar).trim()
          ? String(aadhar).trim()
          : undefined;

    // 1. Check or create user
    let user = null;
    let createdUser = false;
    let tempPassword;

    if (email || phone) {
      user = await User.findOne({
        $or: [email ? { email } : null, phone ? { phone } : null].filter(
          Boolean,
        ),
      });
    }

    if (!user) {
      tempPassword = generateTempPassword(phone);
      // For testing: log the auto-generated password to the server console
      // Remove this after verification to avoid leaking sensitive info.
      try {
        console.log(
          `🔐 [DEBUG] Generated temp password for new student (${
            email || phone || "no-contact"
          }):`,
          tempPassword,
        );
      } catch (_) {
        // noop
      }
      const newUser = new User({
        fname: fname,
        lname: lname,
        email,
        phone,
        passwordhash: tempPassword,
        roleid: "student",
        role: "Student",
        status: true,
      });

      try {
        user = await newUser.save();
        createdUser = true;
        console.log("✅ User created:", user._id);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e?.message || "Failed to create user",
        });
      }
    } else if (user.roleid !== "student") {
      return res
        .status(400)
        .json({ success: false, message: "User exists with a different role" });
    }

    const existingStudent = await Student.findOne({ user_id: user._id });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student profile already exists for this user",
      });
    }

    // 2. Create student profile
    const newStudent = new Student({
      user_id: user._id,
      fname: fname || user.fname,
      lname: lname || user.lname,
      dob,
      gender,
      aadhar: normalizedAadhar,
      address,
      course_id: course_id || null,
      batch_id: batch_id || null,
      fee_status,
      fee_plan: fee_plan || "full",
      fee_plan_id: fee_plan_id || null, // Save the selected fee plan ID
      discount_type: discount_type || null, // Save the selected discount type
      admission_date: new Date(),
    });

    await newStudent.save();
    console.log("✅ Student created:", newStudent._id);
    console.log("   - Fee Plan ID:", fee_plan_id);
    console.log("   - Discount Type:", discount_type);

    // 3. ===== AUTO-CREATE FEE INSTALLMENTS =====
    if (course_id && batch_id) {
      const course = await Course.findById(course_id);

      if (!course || !course.course_fee) {
        console.log("⚠️ Course fee not found, skipping fee setup");
      } else {
        console.log(`💰 Course fee: ₹${course.course_fee}`);

        // Check if fee plan exists for this batch
        let feePlan = await FeePlan.findOne({ batch_id });

        if (!feePlan) {
          // Create new fee plan for this batch
          const numInstallments = 3;

          feePlan = new FeePlan({
            batch_id,
            total_amount: course.course_fee,
            num_installments: numInstallments,
          });
          await feePlan.save();
          console.log("✅ Fee plan created:", feePlan._id);

          // Create installments
          const installmentAmount = course.course_fee / numInstallments;
          const admissionDate = new Date();

          for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date(admissionDate);
            dueDate.setMonth(dueDate.getMonth() + i * 3); // 0, 3, 6 months

            const installment = new FeeInstallment({
              plan_id: feePlan._id,
              installment_no: i + 1,
              due_date: dueDate,
              amount: installmentAmount,
            });
            await installment.save();
            console.log(
              `✅ Installment ${
                i + 1
              } created - Due: ${dueDate.toDateString()}, Amount: ₹${installmentAmount}`,
            );
          }
        } else {
          console.log("✅ Fee plan already exists for batch");
        }
      }
    }

    // 4. Create parent profiles (if provided)
    const createdParents = [];
    if (guardians && Array.isArray(guardians)) {
      for (const guardian of guardians) {
        if (guardian.name && guardian.phone && guardian.relationship) {
          try {
            let parentUser = await User.findOne({ phone: guardian.phone });

            if (!parentUser) {
              const defaultPassword = generateTempPassword(guardian.phone);
              parentUser = new User({
                fname: guardian.name.split(" ")[0],
                lname:
                  guardian.name.split(" ").slice(1).join(" ") ||
                  guardian.name.split(" ")[0],
                email: guardian.email || `${guardian.phone}@parent.temp`,
                phone: guardian.phone,
                passwordhash: defaultPassword,
                roleid: "parent",
                role: "Parent",
                status: true,
              });
              await parentUser.save();
            }

            const parentProfile = new Parent({
              user_id: parentUser._id,
              fname: parentUser.fname,
              lname: parentUser.lname,
              student_id: newStudent._id,
              aadhar: guardian.aadhar || null,
              relation: guardian.relationship,
            });
            await parentProfile.save();
            createdParents.push(parentProfile);
          } catch (parentErr) {
            console.error("Error creating parent:", parentErr);
          }
        }
      }
    }

    console.log("🎉 Student creation complete with fee setup");

    // Also echo to server logs for testing visibility
    if (createdUser && tempPassword) {
      console.log(
        `✅ Student created: ${newStudent._id} | User: ${user._id} | TempPassword: ${tempPassword}`,
      );
    }

    res.status(201).json({
      success: true,
      message: createdUser
        ? "Student and user account created with fees."
        : "Student profile created with fees.",
      student: newStudent,
      parents: createdParents,
      credentials: createdUser
        ? { email: user.email, phone: user.phone, tempPassword }
        : undefined,
    });
  } catch (err) {
    console.error("❌ Error creating student:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get all students with user details + batch/course/fees metadata (Admin/Teacher)
app.get("/api/students", async (req, res) => {
  console.log("📋 GET /api/students called");
  try {
    // Keep course_id and batch_id as raw IDs to avoid breaking frontend filters
    const students = await Student.find().populate(
      "user_id",
      "email phone status last_login",
    );
    console.log(`✅ Found ${students.length} students`);

    const round2 = (n) => Math.round((n || 0) * 100) / 100;
    const EPS = 0.005;

    // Collect unique IDs for batch/course and students
    const studentIds = students.map((s) => s._id);
    const batchIds = [
      ...new Set(
        students
          .map((s) => (s.batch_id ? String(s.batch_id) : null))
          .filter(Boolean),
      ),
    ];
    const courseIds = [
      ...new Set(
        students
          .map((s) => (s.course_id ? String(s.course_id) : null))
          .filter(Boolean),
      ),
    ];

    // Fetch aggregates and lookups in parallel
    const [batchesDocs, feePlansDocs, coursesDocs] = await Promise.all([
      batchIds.length
        ? Batches.find({ _id: { $in: batchIds } }).populate(
            "course_id",
            "name course_fee gst_percent",
          )
        : [],
      batchIds.length ? FeePlan.find({ batch_id: { $in: batchIds } }) : [],
      courseIds.length ? Course.find({ _id: { $in: courseIds } }) : [],
    ]);

    // Build maps for quick access
    const batchById = new Map(
      batchesDocs.map((b) => [
        String(b._id),
        { _id: String(b._id), name: b.name, course_id: b.course_id },
      ]),
    );
    const feePlanByBatch = new Map(
      feePlansDocs.map((fp) => [
        String(fp.batch_id),
        {
          _id: fp._id,
          total_amount: round2(fp.total_amount || 0),
          discount_types: fp.discount_types || [],
        },
      ]),
    );
    const courseById = new Map(
      coursesDocs.map((c) => [
        String(c._id),
        {
          _id: String(c._id),
          name: c.name,
          course_fee: round2(c.course_fee || 0),
          gst_percent: c.gst_percent || 0,
        },
      ]),
    );

    // Attach metadata per student
    const enriched = await Promise.all(
      students.map(async (s) => {
        const sid = String(s._id);
        const bid = s.batch_id ? String(s.batch_id) : undefined;
        const cid = s.course_id ? String(s.course_id) : undefined;

        // USE SAME LOGIC AS /account PAGE:
        // 1. Get student's fee_plan_id (stored on student record)
        // 2. Calculate: base -> apply student's discount -> add 18% GST
        // 3. Count payments for that specific fee_plan_id

        let total = 0;
        let paid = 0;
        let feePlan = null;

        // First try to get fee plan from student record (like /account page does)
        if (s.fee_plan_id) {
          feePlan = feePlansDocs.find(
            (fp) => String(fp._id) === String(s.fee_plan_id),
          );
        }

        // Fallback to batch fee plan if student doesn't have one assigned
        if (!feePlan && bid) {
          feePlan = feePlanByBatch.get(bid);
        }

        if (feePlan && feePlan.total_amount) {
          // Calculate student's total fee (same as /account page)
          let studentTotalFee = feePlan.total_amount;

          // Apply student's individual discount
          if (
            s.discount_type &&
            feePlan.discount_types &&
            Array.isArray(feePlan.discount_types)
          ) {
            const selectedDiscount = feePlan.discount_types.find(
              (d) => d.code === s.discount_type,
            );
            if (selectedDiscount && selectedDiscount.discount_percent) {
              const discountAmount =
                studentTotalFee * (selectedDiscount.discount_percent / 100);
              studentTotalFee = studentTotalFee - discountAmount;
            }
          }

          // Add 18% GST to discounted amount (hardcoded like /account page)
          const tax = studentTotalFee * 0.18;
          studentTotalFee = studentTotalFee + tax;

          total = round2(studentTotalFee);

          // Get payments for THIS student's fee plan (same filter as /account page)
          const paymentSum = await FeePayment.aggregate([
            {
              $match: {
                student_id: s._id,
                fee_plan_id: feePlan._id,
              },
            },
            { $group: { _id: null, total: { $sum: "$paid_amount" } } },
          ]);
          paid = round2(paymentSum[0]?.total || 0);
        } else {
          // Fallback: no fee plan
          const course = cid ? courseById.get(cid) : undefined;
          if (course && course.course_fee) {
            const courseFee = course.course_fee;
            const gstPercent = course.gst_percent || 0;
            total = round2(courseFee * (1 + gstPercent / 100));
          }

          // Count all payments if no fee plan
          const paymentSum = await FeePayment.aggregate([
            { $match: { student_id: s._id } },
            { $group: { _id: null, total: { $sum: "$paid_amount" } } },
          ]);
          paid = round2(paymentSum[0]?.total || 0);
        }

        // Compute percentage safely (capped at 100)
        const percentage_paid_raw =
          total > EPS ? Math.round((paid / total) * 100) : 0;
        const percentage_paid = Math.min(100, Math.max(0, percentage_paid_raw));

        const metadata = {
          batch_info:
            bid && batchById.has(bid) ? batchById.get(bid) : undefined,
          course_info:
            cid && courseById.has(cid)
              ? { _id: cid, name: courseById.get(cid).name }
              : undefined,
          fee_info: {
            total: round2(total),
            paid: round2(paid),
            percentage_paid,
          },
        };

        // Return plain object with metadata field appended
        const obj = s.toObject();
        obj.metadata = metadata;
        return obj;
      }),
    );

    res.json({ success: true, students: enriched });
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== BULK UPLOAD ROUTES =====

// Download Excel template with debugging
app.get("/api/students/template", async (req, res) => {
  console.log("📥 Template download requested");

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");

    // Define columns
    worksheet.columns = [
      { header: "First Name *", key: "fname", width: 15 },
      { header: "Last Name *", key: "lname", width: 15 },
      { header: "Email *", key: "email", width: 25 },
      { header: "Phone *", key: "phone", width: 15 },
      { header: "Date of Birth (DD/MM/YYYY)", key: "dob", width: 24 },
      { header: "Gender (male/female/other) *", key: "gender", width: 25 },
      { header: "Aadhar (12 digits)", key: "aadhar", width: 15 },
      { header: "Address", key: "address", width: 30 },
      { header: "Course Name *", key: "course_name", width: 25 },
      { header: "Batch Name *", key: "batch_name", width: 25 },
      { header: "Guardian 1 Name", key: "g1_name", width: 20 },
      { header: "Guardian 1 Phone", key: "g1_phone", width: 15 },
      {
        header: "Guardian 1 Relation (father/mother/guardian)",
        key: "g1_relation",
        width: 45,
      },
      { header: "Guardian 2 Name", key: "g2_name", width: 20 },
      { header: "Guardian 2 Phone", key: "g2_phone", width: 15 },
      { header: "Guardian 2 Relation", key: "g2_relation", width: 35 },
    ];

    // Add sample row
    worksheet.addRow({
      fname: "John",
      lname: "Doe",
      email: "john.doe@example.com",
      phone: "9876543210",
      dob: "15/01/2005",
      gender: "male",
      aadhar: "123456789012",
      address: "123 Main Street, City",
      course_name: "Web Dev", // Example course name
      batch_name: "Batch A", // Example batch name
      g1_name: "Jane Doe",
      g1_phone: "9876543211",
      g1_relation: "mother",
      g2_name: "",
      g2_phone: "",
      g2_relation: "",
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    console.log("✅ Template generated, size:", buffer.length, "bytes");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="student_template.xlsx"',
    );
    res.send(buffer);
  } catch (error) {
    console.error("❌ Template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
});

// Bulk upload students with comprehensive debugging
app.post(
  "/api/students/bulk-upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    console.log("📤 Bulk upload started");
    console.log(
      "👤 Authenticated user:",
      req.user?.email,
      "Role:",
      req.user?.role,
    );
    console.log("🍪 Cookies received:", req.cookies);
    console.log("🔑 Authorization header:", req.headers.authorization);

    try {
      if (!req.file) {
        console.log("❌ No file uploaded");
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      console.log(
        "📄 File received:",
        req.file.originalname,
        "- Size:",
        req.file.size,
        "bytes",
      );

      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet("Students");
      if (!worksheet) {
        console.log('❌ No "Students" worksheet found');
        return res.status(400).json({
          success: false,
          message: 'No "Students" worksheet found in file',
        });
      }

      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header
          data.push({
            rowNumber,
            "First Name *": row.getCell(1).value,
            "Last Name *": row.getCell(2).value,
            "Email *": row.getCell(3).value,
            "Phone *": row.getCell(4).value,
            "Date of Birth (DD/MM/YYYY)": row.getCell(5).value,
            "Gender (male/female/other) *": row.getCell(6).value,
            "Aadhar (12 digits)": row.getCell(7).value,
            Address: row.getCell(8).value,
            "Course Name *": row.getCell(9).value,
            "Batch Name *": row.getCell(10).value,
            "Guardian 1 Name": row.getCell(11).value,
            "Guardian 1 Phone": row.getCell(12).value,
            "Guardian 1 Relation (father/mother/guardian)":
              row.getCell(13).value,
            "Guardian 2 Name": row.getCell(14).value,
            "Guardian 2 Phone": row.getCell(15).value,
            "Guardian 2 Relation": row.getCell(16).value,
          });
        }
      });

      console.log(`📊 Parsed ${data.length} rows from Excel`);
      console.log("📋 First row sample:", JSON.stringify(data[0], null, 2));

      const results = {
        success: [],
        failed: [],
        total: data.length,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = row.rowNumber;

        console.log(`\n🔄 Processing row ${rowNumber}...`);

        try {
          // Validate required fields
          const fname = row["First Name *"];
          const lname = row["Last Name *"];
          const email = row["Email *"];
          const phone = String(row["Phone *"]);
          const gender =
            row["Gender (male/female/other) *"] ||
            row["Gender (male/female/guardian) *"];

          if (!fname || !lname || !email || !phone || !gender) {
            throw new Error(
              "Missing required fields (First Name, Last Name, Email, Phone, or Gender)",
            );
          }

          console.log(`   👤 Creating user: ${fname} ${lname}`);

          // Check if user exists
          let user = await User.findOne({ $or: [{ email }, { phone }] });

          const tempPassword = user ? null : generateTempPassword(phone);

          if (!user) {
            // Create user
            user = new User({
              fname: fname,
              lname: lname,
              email,
              phone,
              passwordhash: tempPassword,
              roleid: "student",
              role: "Student",
              status: true,
            });
            await user.save();
            console.log(`   ✅ User created:`, user._id);
          } else {
            console.log(`   ℹ️  User exists:`, user._id);
          }

          // Create student profile
          const studentData = {
            user_id: user._id,
            fname,
            lname,
            // parse dob from dd/mm/yyyy or other common formats
            dob:
              parseExcelDate(
                row["Date of Birth (DD/MM/YYYY)"] ||
                  row["Date of Birth (YYYY-MM-DD)"],
              ) || undefined,
            gender: gender.toLowerCase(),
            fee_status: "pending",
            admission_date: new Date(),
          };

          // Add optional fields only if not empty
          if (row["Aadhar (12 digits)"]) {
            studentData.aadhar = String(row["Aadhar (12 digits)"]);
          }
          if (row["Address"]) {
            studentData.address = { street: row["Address"] };
          }

          // Lookup course by name
          let courseDoc = null;
          if (row["Course Name *"]) {
            courseDoc = await Course.findOne({ name: row["Course Name *"] });
            if (courseDoc) {
              studentData.course_id = courseDoc._id;
            } else {
              throw new Error(`Course not found: ${row["Course Name *"]}`);
            }
          }

          // Lookup batch by name and course
          let batchDoc = null;
          if (row["Batch Name *"] && courseDoc) {
            batchDoc = await Batches.findOne({
              name: row["Batch Name *"],
              course_id: courseDoc._id,
            });
            if (batchDoc) {
              studentData.batch_id = batchDoc._id;
            } else {
              throw new Error(
                `Batch not found: ${row["Batch Name *"]} (Course: ${courseDoc.name})`,
              );
            }
          }

          const student = new Student(studentData);
          await student.save();
          console.log(`   ✅ Student created:`, student._id);

          // Create guardians
          const guardians = [];
          for (let g = 1; g <= 2; g++) {
            const gName = row[`Guardian ${g} Name`];
            const gPhone = row[`Guardian ${g} Phone`]
              ? String(row[`Guardian ${g} Phone`])
              : null;
            const gRelation =
              row[`Guardian ${g} Relation (father/mother/guardian)`] ||
              row[`Guardian ${g} Relation`];

            if (gName && gPhone && gRelation) {
              console.log(`   👨‍👩‍👧 Creating guardian ${g}: ${gName}`);

              let parentUser = await User.findOne({ phone: gPhone });
              const parentTempPwd = parentUser
                ? null
                : generateTempPassword(gPhone);

              if (!parentUser) {
                const nameParts = gName.trim().split(" ");

                parentUser = new User({
                  fname: nameParts[0],
                  lname: nameParts.slice(1).join(" ") || nameParts[0],
                  email: `${gPhone}@parent.temp`,
                  phone: gPhone,
                  passwordhash: parentTempPwd,
                  roleid: "parent",
                  role: "Parent",
                  status: true,
                });
                await parentUser.save();
                console.log(`     ✅ Parent user created:`, parentUser._id);
              }

              // Check for existing parent relationship
              const existingParent = await Parent.findOne({
                user_id: parentUser._id,
                student_id: student._id,
                relation: gRelation.toLowerCase(),
              });

              if (!existingParent) {
                const parentProfile = new Parent({
                  user_id: parentUser._id,
                  fname: parentUser.fname,
                  lname: parentUser.lname,
                  student_id: student._id,
                  relation: gRelation.toLowerCase(),
                });
                await parentProfile.save();
                console.log(
                  `     ✅ Parent profile created:`,
                  parentProfile._id,
                );
                guardians.push({
                  name: gName,
                  phone: gPhone,
                  relation: gRelation,
                });
              } else {
                console.log(`     ℹ️  Parent relationship already exists`);
              }
            }
          }

          results.success.push({
            row: rowNumber,
            name: `${fname} ${lname}`,
            email,
            phone,
            studentId: student._id,
            userId: user._id,
            tempPassword: tempPassword,
            guardians: guardians.length,
          });

          console.log(`✅ Row ${rowNumber} completed successfully`);
        } catch (error) {
          console.error(`❌ Row ${rowNumber} failed:`, error.message);
          results.failed.push({
            row: rowNumber,
            data: row,
            error: error.message,
          });
        }
      }

      console.log(
        `\n📈 STUDENTS Upload complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
      );
      console.log(
        "✅ SUCCESS Student IDs:",
        results.success.map((s) => s.studentId),
      );
      if (results.failed.length > 0) {
        console.log(
          "❌ FAILED rows:",
          results.failed.map((f) => `Row ${f.row}: ${f.error}`),
        );
      }

      res.json({
        success: true,
        message: `Processed ${results.total} rows. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        results,
      });

      console.log("📤 Student bulk upload response sent successfully");
    } catch (err) {
      console.error("💥 Bulk upload error:", err);
      console.error("💥 Error stack:", err.stack);
      res.status(500).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
      console.log("📤 Error response sent to client");
    }
  },
);

// Send (and reset) login credentials to student
// For testing and reliability of first-time login, we generate a fresh temporary password,
// update the user's password to this temp one, and log it to the console.
app.post("/api/students/:id/send-credentials", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("user_id");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Generate a fresh temporary password and set it for the user's account
    const user = await User.findById(student.user_id?._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found for student" });
    }

    const tempPassword = generateTempPassword(user.phone || user.email);
    user.passwordhash = tempPassword; // Will be hashed by User pre-save hook
    await user.save();

    const credentials = {
      email: user.email,
      phone: user.phone,
      name: `${student.fname} ${student.lname}`,
      tempPassword, // include plaintext only in server logs; do not expose to client in production
    };

    // Log to console so you can see the actual password when triggering from /students page
    console.log("\n📧 ===== SEND CREDENTIALS =====");
    console.log("   To:", credentials.name);
    console.log("   Email:", credentials.email);
    console.log("   Phone:", credentials.phone);
    console.log("   Temp Password:", tempPassword);
    console.log("   Note: Implement email/SMS service here");
    console.log("================================\n");

    res.json({
      success: true,
      message:
        "Credentials generated and logged to console (email not sent - TODO)",
      // For security, do NOT send tempPassword in API response. It is only logged server-side.
      credentials: {
        email: credentials.email,
        phone: credentials.phone,
        name: credentials.name,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single student by ID
app.get("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      "user_id",
      "email phone status last_login",
    );

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, student });
  } catch (err) {
    // FIX: previously missing handler caused a syntax error
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update student
app.put("/api/students/:id", async (req, res) => {
  try {
    const {
      fname,
      lname,
      email,
      phone,
      dob,
      gender,
      aadhar,
      address,
      course_id,
      batch_id,
      fee_status,
      fee_plan_id,
      discount_type,
      guardians = [],
    } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Update student fields only if provided
    if (fname !== undefined) student.fname = fname;
    if (lname !== undefined) student.lname = lname;
    if (dob !== undefined) student.dob = dob;
    if (gender !== undefined) student.gender = gender;
    if (aadhar !== undefined) {
      const norm =
        aadhar === null || aadhar === undefined
          ? undefined
          : String(aadhar).trim() === ""
            ? undefined
            : String(aadhar).trim();
      student.aadhar = norm;
    }
    if (address !== undefined) student.address = address;
    if (course_id !== undefined) student.course_id = course_id;
    if (batch_id !== undefined) student.batch_id = batch_id;
    if (fee_status !== undefined) student.fee_status = fee_status;
    if (fee_plan_id !== undefined) student.fee_plan_id = fee_plan_id;
    if (discount_type !== undefined) student.discount_type = discount_type;

    await student.save();

    // Update user details if provided
    const userUpdates = {};
    if (email !== undefined) userUpdates.email = email;
    if (phone !== undefined) userUpdates.phone = phone;
    if (fname !== undefined) userUpdates.fname = fname;
    if (lname !== undefined) userUpdates.lname = lname;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(student.user_id, userUpdates);
    }

    // Handle guardians/parents updates
    if (guardians && Array.isArray(guardians) && guardians.length > 0) {
      // Get existing parents for this student
      const existingParents = await Parent.find({ student_id: student._id });
      const existingParentPhones = existingParents.map((p) =>
        p.user_id ? User.findById(p.user_id).then((u) => u?.phone) : null,
      );

      // Process each guardian from the form
      const updatedParents = [];
      for (const guardian of guardians) {
        if (guardian.name && guardian.phone && guardian.relationship) {
          try {
            // Check if parent already exists for this student
            let existingParent = null;
            for (const parent of existingParents) {
              const parentUser = await User.findById(parent.user_id);
              if (parentUser && parentUser.phone === guardian.phone) {
                existingParent = parent;
                break;
              }
            }

            if (existingParent) {
              // Update existing parent
              const parentUser = await User.findById(existingParent.user_id);
              if (parentUser) {
                parentUser.fname = guardian.name.split(" ")[0];
                parentUser.lname =
                  guardian.name.split(" ").slice(1).join(" ") ||
                  guardian.name.split(" ")[0];
                await parentUser.save();
              }

              existingParent.fname = guardian.name.split(" ")[0];
              existingParent.lname =
                guardian.name.split(" ").slice(1).join(" ") ||
                guardian.name.split(" ")[0];
              existingParent.relation = guardian.relationship;
              await existingParent.save();
              updatedParents.push(existingParent);
            } else {
              // Create new parent
              let parentUser = await User.findOne({ phone: guardian.phone });

              if (!parentUser) {
                const defaultPassword = generateTempPassword(guardian.phone);
                parentUser = new User({
                  fname: guardian.name.split(" ")[0],
                  lname:
                    guardian.name.split(" ").slice(1).join(" ") ||
                    guardian.name.split(" ")[0],
                  email: guardian.email || `${guardian.phone}@parent.temp`,
                  phone: guardian.phone,
                  passwordhash: defaultPassword,
                  roleid: "parent",
                  role: "Parent",
                  status: true,
                });
                await parentUser.save();
              }

              const parentProfile = new Parent({
                user_id: parentUser._id,
                fname: parentUser.fname,
                lname: parentUser.lname,
                student_id: student._id,
                relation: guardian.relationship,
              });
              await parentProfile.save();
              updatedParents.push(parentProfile);
            }
          } catch (parentErr) {
            console.error("Error updating/creating parent:", parentErr);
          }
        }
      }

      // Remove parents that are no longer in the guardians list
      const updatedPhones = guardians.map((g) => g.phone);
      for (const parent of existingParents) {
        const parentUser = await User.findById(parent.user_id);
        if (parentUser && !updatedPhones.includes(parentUser.phone)) {
          await Parent.findByIdAndDelete(parent._id);
        }
      }
    }

    res.json({ success: true, message: "Student updated", student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete student (also deletes associated user)
app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Note: User account is NOT deleted - they can still login
    // If you want to delete user too, uncomment:
    // await User.findByIdAndDelete(student.user_id);

    res.json({ success: true, message: "Student profile deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== TEACHER ROUTES =====

// Create teacher (Admin only) - check or create user, then profile
app.post("/api/teachers", async (req, res) => {
  try {
    const {
      fname,
      lname,
      email,
      phone,
      subjects,
      emp_no,
      aadhar,
      address,
      p_address,
      salary,
      joining_date,
      pan_number,
      bank_account,
      bank_ifsc,
      highest_degree,
      batch_id, // ADD THIS - single batch from form
      assigned_batches, // ADD THIS - array of batch IDs if sending multiple
    } = req.body;

    // 1) Check or create user
    let user = null;
    let createdUser = false;
    let tempPassword;
    if (email || phone) {
      user = await User.findOne({
        $or: [email ? { email } : null, phone ? { phone } : null].filter(
          Boolean,
        ),
      });
    }
    if (!user) {
      const names = deriveNames(fname, lname);
      tempPassword = generateTempPassword(phone);
      const newUser = new User({
        fname: names.fname,
        lname: names.lname,
        email,
        phone,
        passwordhash: tempPassword,
        roleid: "teacher",
        role: "Teacher",
        status: true,
      });
      try {
        user = await newUser.save();
        createdUser = true;
        // TODO: Send email/SMS with login credentials to the user
        console.log("[TEACHER] Created user; credentials placeholder:", {
          email,
          phone,
          tempPassword,
        });
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e?.message || "Failed to create user",
        });
      }
    } else if (user.roleid !== "teacher") {
      return res
        .status(400)
        .json({ success: false, message: "User exists with a different role" });
    }

    const existingTeacher = await Teacher.findOne({ user_id: user._id });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: "Teacher profile already exists for this user",
      });
    }

    // Generate employee number if not provided
    const empNo =
      emp_no ||
      `TCH${String((await Teacher.countDocuments()) + 1).padStart(4, "0")}`;

    // Prepare assigned batches array
    let batchesArray = [];
    if (batch_id) {
      batchesArray = [batch_id]; // Single batch from form
    } else if (assigned_batches && Array.isArray(assigned_batches)) {
      batchesArray = assigned_batches; // Multiple batches
    }

    const newTeacher = new Teacher({
      user_id: user._id,
      fname: user.fname,
      lname: user.lname,
      subjects,
      emp_no: empNo,
      aadhar: aadhar && aadhar.trim() ? aadhar.trim() : undefined,
      address,
      p_address,
      salary,
      joining_date: joining_date || new Date(),
      pan_number:
        pan_number && pan_number.trim() ? pan_number.trim() : undefined,
      bank_account:
        bank_account && bank_account.trim() ? bank_account.trim() : undefined,
      bank_ifsc: bank_ifsc && bank_ifsc.trim() ? bank_ifsc.trim() : undefined,
      highest_degree:
        highest_degree && highest_degree.trim()
          ? highest_degree.trim()
          : undefined,
      assigned_batches: batchesArray,
    });

    await newTeacher.save();

    res.status(201).json({
      success: true,
      message: createdUser
        ? "Teacher and user account created. Login info will be sent by email."
        : "Teacher profile created successfully",
      teacher: newTeacher,
      credentials: createdUser
        ? { email: user.email, phone: user.phone, tempPassword }
        : undefined,
    });
  } catch (err) {
    console.error("Error creating teacher:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// Get all teachers with metadata
// Get all teachers with metadata
app.get("/api/teachers", async (req, res) => {
  console.log("📋 GET /api/teachers called");
  try {
    const teachers = await Teacher.find()
      .populate("user_id", "fname lname email phone status lastlogin")
      .populate({
        path: "assigned_batches",
        select: "name",
        model: "Batches", // ADD THIS - specifies to use the Batches model
      });

    // Enrich with metadata
    const enrichedTeachers = teachers.map((teacher) => ({
      ...teacher.toObject(),
      metadata: {
        assigned_batches_info: teacher.assigned_batches || [],
        monthly_logsheet_status: teacher.monthly_logsheet_status || "pending",
        syllabus_completion: teacher.syllabus_completion || 0,
      },
    }));

    res.json({ success: true, teachers: enrichedTeachers });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== TEACHER BULK UPLOAD ROUTES =====

// Download Teacher template
app.get("/api/teachers/template", async (req, res) => {
  console.log("📥 Teacher template download requested");

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Teachers");

    worksheet.columns = [
      { header: "First Name *", key: "fname", width: 15 },
      { header: "Last Name *", key: "lname", width: 15 },
      { header: "Email *", key: "email", width: 25 },
      { header: "Phone *", key: "phone", width: 15 },
      { header: "Date of Birth (DD/MM/YYYY)", key: "dob", width: 24 },
      { header: "Subject", key: "subject", width: 20 },
      { header: "Employee Number", key: "emp_no", width: 15 },
      { header: "Aadhar (12 digits)", key: "aadhar", width: 15 },
      { header: "PAN Number", key: "pan_number", width: 15 },
      { header: "Address", key: "address", width: 30 },
      { header: "Permanent Address", key: "p_address", width: 30 },
      { header: "Salary", key: "salary", width: 12 },
      { header: "Bank Account", key: "bank_account", width: 20 },
      { header: "Bank IFSC", key: "bank_ifsc", width: 15 },
      { header: "Highest Degree", key: "highest_degree", width: 20 },
      { header: "Batch Name", key: "batch_name", width: 25 },
    ];

    worksheet.addRow({
      fname: "Rajesh",
      lname: "Kumar",
      email: "rajesh.kumar@example.com",
      phone: "9876543210",
      dob: "15/05/1985",
      subject: "Mathematics",
      emp_no: "TCH001",
      aadhar: "123456789012",
      pan_number: "ABCDE1234F",
      address: "123 MG Road, Bangalore",
      p_address: "456 Main Street, Delhi",
      salary: "50000",
      bank_account: "1234567890",
      bank_ifsc: "HDFC0001234",
      highest_degree: "M.Sc Mathematics",
      batch_name: "Batch A", // Example batch name
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    console.log("✅ Teacher template generated, size:", buffer.length, "bytes");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="teacher_template.xlsx"',
    );
    res.send(buffer);
  } catch (error) {
    console.error("❌ Teacher template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
});

// Bulk upload teachers
app.post(
  "/api/teachers/bulk-upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    console.log("📤 Teacher bulk upload started");
    console.log(
      "👤 Authenticated user:",
      req.user?.email,
      "Role:",
      req.user?.role,
    );
    console.log("🍪 Cookies received:", req.cookies);
    console.log("🔑 Authorization header:", req.headers.authorization);

    try {
      if (!req.file) {
        console.log("❌ No file uploaded");
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      console.log(
        "📄 File received:",
        req.file.originalname,
        "- Size:",
        req.file.size,
        "bytes",
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet("Teachers");
      if (!worksheet) {
        console.log('❌ No "Teachers" worksheet found');
        return res.status(400).json({
          success: false,
          message: 'No "Teachers" worksheet found in file',
        });
      }

      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          data.push({
            rowNumber,
            "First Name *": row.getCell(1).value,
            "Last Name *": row.getCell(2).value,
            "Email *": row.getCell(3).value,
            "Phone *": row.getCell(4).value,
            "Date of Birth (DD/MM/YYYY)": row.getCell(5).value,
            Subject: row.getCell(6).value,
            "Employee Number": row.getCell(7).value,
            "Aadhar (12 digits)": row.getCell(8).value,
            "PAN Number": row.getCell(9).value,
            Address: row.getCell(10).value,
            "Permanent Address": row.getCell(11).value,
            Salary: row.getCell(12).value,
            "Bank Account": row.getCell(13).value,
            "Bank IFSC": row.getCell(14).value,
            "Highest Degree": row.getCell(15).value,
            "Batch Name": row.getCell(16).value,
          });
        }
      });

      console.log(`📊 Parsed ${data.length} teacher rows from Excel`);
      console.log("📋 First row sample:", JSON.stringify(data[0], null, 2));

      const results = {
        success: [],
        failed: [],
        total: data.length,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = row.rowNumber;

        console.log(`\n🔄 Processing teacher row ${rowNumber}...`);

        try {
          const fname = row["First Name *"];
          const lname = row["Last Name *"];
          const email = row["Email *"];
          const phone = String(row["Phone *"]);

          if (!fname || !lname || !email || !phone) {
            throw new Error(
              "Missing required fields (First Name, Last Name, Email, or Phone)",
            );
          }

          console.log(`   👤 Creating teacher: ${fname} ${lname}`);

          // Check if user exists
          let user = await User.findOne({ $or: [{ email }, { phone }] });

          const tempPassword = user ? null : generateTempPassword(phone);

          if (!user) {
            // Create user
            user = new User({
              fname: fname,
              lname: lname,
              email,
              phone,
              passwordhash: tempPassword,
              roleid: "teacher",
              role: "Teacher",
              status: true,
            });
            await user.save();
            console.log(`   ✅ User created:`, user._id);
          } else {
            console.log(`   ℹ️  User exists:`, user._id);
          }

          // Generate employee number if not provided
          const empNo =
            row["Employee Number"] ||
            `TCH${String((await Teacher.countDocuments()) + 1).padStart(
              4,
              "0",
            )}`;

          // Prepare batch assignment by name
          let batchesArray = [];
          if (row["Batch Name"]) {
            const batchDoc = await Batches.findOne({ name: row["Batch Name"] });
            if (batchDoc) {
              batchesArray = [batchDoc._id];
            } else {
              throw new Error(`Batch not found: ${row["Batch Name"]}`);
            }
          }

          const teacherData = {
            user_id: user._id,
            fname: user.fname,
            lname: user.lname,
            subjects: row["Subject"] ? [row["Subject"]] : [],
            emp_no: empNo,
            joining_date: new Date(),
            salary: parseFloat(row["Salary"]) || 0,
          };

          // Add optional fields
          if (
            row["Aadhar (12 digits)"] &&
            String(row["Aadhar (12 digits)"]).trim()
          )
            teacherData.aadhar = String(row["Aadhar (12 digits)"]).trim();
          if (row["PAN Number"] && String(row["PAN Number"]).trim())
            teacherData.pan_number = String(row["PAN Number"]).trim();
          if (row["Address"]) teacherData.address = { street: row["Address"] };
          if (row["Permanent Address"])
            teacherData.p_address = { street: row["Permanent Address"] };
          if (row["Bank Account"] && String(row["Bank Account"]).trim())
            teacherData.bank_account = String(row["Bank Account"]).trim();
          if (row["Bank IFSC"] && String(row["Bank IFSC"]).trim())
            teacherData.bank_ifsc = String(row["Bank IFSC"]).trim();
          if (row["Highest Degree"] && String(row["Highest Degree"]).trim())
            teacherData.highest_degree = String(row["Highest Degree"]).trim();
          if (batchesArray.length > 0)
            teacherData.assigned_batches = batchesArray;

          const teacher = new Teacher(teacherData);
          await teacher.save();
          console.log(`   ✅ Teacher created:`, teacher._id);

          results.success.push({
            row: rowNumber,
            name: `${fname} ${lname}`,
            email,
            phone,
            teacherId: teacher._id,
            userId: user._id,
            tempPassword: tempPassword,
            empNo: empNo,
          });

          console.log(`✅ Teacher row ${rowNumber} completed successfully`);
        } catch (error) {
          console.error(`❌ Row ${rowNumber} failed:`, error.message);
          results.failed.push({
            row: rowNumber,
            data: row,
            error: error.message,
          });
        }
      }

      console.log(
        `\n📈 TEACHERS Upload complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
      );
      console.log(
        "✅ SUCCESS Teacher IDs:",
        results.success.map((s) => s.teacherId),
      );
      if (results.failed.length > 0) {
        console.log(
          "❌ FAILED rows:",
          results.failed.map((f) => `Row ${f.row}: ${f.error}`),
        );
      }

      res.json({
        success: true,
        message: `Processed ${results.total} rows. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        results,
      });

      console.log("📤 Teacher bulk upload response sent successfully");
    } catch (err) {
      console.error("💥 Teacher bulk upload error:", err);
      console.error("💥 Error stack:", err.stack);
      res.status(500).json({
        success: false,
        message: err.message,
      });
      console.log("📤 Error response sent to client");
    }
  },
);

// Send (and reset) credentials to teacher
// Mirrors student send-credentials: generate a fresh temporary password,
// set it for the teacher's user account, and log the plaintext to console.
app.post("/api/teachers/:id/send-credentials", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate("user_id");

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    const user = await User.findById(teacher.user_id?._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found for teacher" });
    }

    const tempPassword = generateTempPassword(user.phone || user.email);
    user.passwordhash = tempPassword; // Will be hashed by User pre-save hook
    await user.save();

    console.log("\n📧 ===== SEND TEACHER CREDENTIALS =====");
    console.log("   Employee:", teacher.emp_no);
    console.log("   Email:", user.email);
    console.log("   Phone:", user.phone);
    console.log("   Temp Password:", tempPassword);
    console.log("   Note: Implement email/SMS service here");
    console.log("========================================\n");

    res.json({
      success: true,
      message: "Teacher credentials generated and logged to console",
      credentials: {
        email: user.email,
        phone: user.phone,
        empNo: teacher.emp_no,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single teacher (clean)
app.get("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate("user_id", "f_name l_name email phone status")
      .populate({
        path: "assigned_batches",
        select: "name",
        model: "Batches",
      });

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, teacher });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update teacher
// Update teacher
app.put("/api/teachers/:id", async (req, res) => {
  try {
    const {
      subjects,
      aadhar,
      address,
      p_address,
      salary,
      pan_number,
      bank_account,
      bank_ifsc,
      highest_degree,
      batch_id,
      assigned_batches,
      monthly_logsheet_status,
      syllabus_completion,
    } = req.body;

    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    // Update fields if provided
    if (subjects !== undefined) teacher.subjects = subjects;
    if (aadhar !== undefined)
      teacher.aadhar = aadhar && aadhar.trim() ? aadhar.trim() : undefined;
    if (address !== undefined) teacher.address = address;
    if (p_address !== undefined) teacher.p_address = p_address;
    if (salary !== undefined) teacher.salary = salary;
    if (pan_number !== undefined)
      teacher.pan_number =
        pan_number && pan_number.trim() ? pan_number.trim() : undefined;
    if (bank_account !== undefined)
      teacher.bank_account =
        bank_account && bank_account.trim() ? bank_account.trim() : undefined;
    if (bank_ifsc !== undefined)
      teacher.bank_ifsc =
        bank_ifsc && bank_ifsc.trim() ? bank_ifsc.trim() : undefined;
    if (highest_degree !== undefined)
      teacher.highest_degree =
        highest_degree && highest_degree.trim()
          ? highest_degree.trim()
          : undefined;
    if (monthly_logsheet_status !== undefined)
      teacher.monthly_logsheet_status = monthly_logsheet_status;
    if (syllabus_completion !== undefined)
      teacher.syllabus_completion = syllabus_completion;

    // Handle batch assignment
    if (batch_id) {
      teacher.assigned_batches = [batch_id];
    } else if (assigned_batches !== undefined) {
      teacher.assigned_batches = assigned_batches;
    }

    await teacher.save();

    res.json({ success: true, message: "Teacher updated", teacher });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete teacher
app.delete("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, message: "Teacher profile deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== PARENT ROUTES =====

// Get all parents with details
app.get("/api/parents", async (req, res) => {
  try {
    const parents = await Parent.find()
      .populate("user_id", "fname lname email phone status")
      .populate({
        path: "student_id",
        select: "fname lname user_id",
        populate: {
          path: "user_id",
          select: "email",
        },
      });

    res.json({ success: true, parents });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get parents by student ID
app.get("/api/parents/student/:studentId", async (req, res) => {
  try {
    const parents = await Parent.find({
      student_id: req.params.studentId,
    }).populate("user_id", "fname lname email phone");

    res.json({ success: true, parents });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get single parent
app.get("/api/parents/:id", async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id)
      .populate("user_id", "fname lname email phone status")
      .populate("student_id", "fname lname");

    if (!parent) {
      return res
        .status(404)
        .json({ success: false, message: "Parent not found" });
    }

    res.json({ success: true, parent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create parent profile
app.post("/api/parents", async (req, res) => {
  try {
    const {
      email,
      phone,
      fname,
      lname,
      student_id,
      aadhar,
      relation,
      occupation,
      annual_income,
      address,
    } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Check if student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find or create user
    let user = null;
    let createdUser = false;
    let tempPassword;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    // If user doesn't exist, create one
    if (!user) {
      tempPassword = generateTempPassword(phone);
      user = new User({
        fname: fname,
        lname: lname,
        email,
        phone,
        passwordhash: tempPassword,
        roleid: "parent",
        role: "Parent",
        status: true,
      });
      await user.save();
      createdUser = true;
      // TODO: Send email/SMS with login credentials to the user
      console.log("[PARENT] Created user; credentials placeholder:", {
        email,
        phone,
        tempPassword,
      });
    } else {
      // Check if user has parent role
      if (user.roleid !== "parent") {
        return res.status(400).json({
          success: false,
          message: "User must have parent role",
        });
      }
    }

    // Check if parent relationship already exists
    const existingParent = await Parent.findOne({
      user_id: user._id,
      student_id,
      relation,
    });

    if (existingParent) {
      return res.status(400).json({
        success: false,
        message: `${relation} relationship already exists for this student`,
      });
    }

    // Create parent profile
    const newParent = new Parent({
      user_id: user._id,
      fname: user.fname,
      lname: user.lname,
      student_id,
      aadhar,
      relation,
      occupation,
      annual_income,
      address,
    });

    await newParent.save();

    res.status(201).json({
      success: true,
      message: createdUser
        ? "Parent and user account created. Login info will be sent by email."
        : "Parent profile created successfully",
      parent: newParent,
      credentials: createdUser
        ? { email: user.email, phone: user.phone, tempPassword }
        : undefined,
    });
  } catch (err) {
    console.error("Error creating parent:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// Update parent
app.put("/api/parents/:id", async (req, res) => {
  try {
    const updates = req.body;

    const parent = await Parent.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!parent) {
      return res
        .status(404)
        .json({ success: false, message: "Parent not found" });
    }

    res.json({ success: true, message: "Parent updated", parent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete parent
app.delete("/api/parents/:id", async (req, res) => {
  try {
    const parent = await Parent.findByIdAndDelete(req.params.id);

    if (!parent) {
      return res
        .status(404)
        .json({ success: false, message: "Parent not found" });
    }

    res.json({ success: true, message: "Parent profile deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== LECTURES API ROUTES =====

// Get all lectures with pagination and filters
app.get("/api/lectures", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Archive filter - show archived only if explicitly requested
    const showArchived = req.query.archived === "true";
    if (showArchived) {
      filter.$or = [{ archived: true }, { isArchived: true }];
    } else {
      filter.archived = { $ne: true };
      filter.isArchived = { $ne: true };
    }

    // Add filters
    if (req.query.course_id) filter.course_id = req.query.course_id;
    if (req.query.batch_id) filter.batch_id = req.query.batch_id;
    if (req.query.teacher_id) filter.teacher_id = req.query.teacher_id;
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(req.query.date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const lectures = await Lecture.find(filter)
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "fname lname email")
      .sort({ date: -1, lecture_start: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Lecture.countDocuments(filter);

    // Calculate attendance for each lecture
    const enrichedLectures = await Promise.all(
      lectures.map(async (lecture) => {
        let totalStudents = 0;
        let attendedStudents = 0;
        let attendancePercentage = null;
        let lectureState = "pending";

        // Only calculate if batch exists
        if (lecture.batch_id && lecture.batch_id._id) {
          // Get total students enrolled in this batch
          totalStudents = await Student.countDocuments({
            batch_id: lecture.batch_id._id,
          });

          // Get attendance for this specific lecture
          // Count students who are present or late
          // Explicitly: auto_absent, absent, and excused are NOT counted as attended
          const lectureDate = new Date(lecture.date);
          const startOfDay = new Date(lectureDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(lectureDate.setHours(23, 59, 59, 999));

          attendedStudents = await Attendance.countDocuments({
            lectureId: lecture._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            userType: "Student",
            status: { $in: ["present", "late"] },
          });

          // Determine lecture state and calculate percentage
          const now = new Date();
          const lectureStart = new Date(lecture.lecture_start);
          const lectureEnd = new Date(lecture.lecture_end);

          if (now < lectureStart) {
            // Before lecture starts
            lectureState = "pending";
            attendancePercentage = null;
          } else if (now >= lectureStart && now <= lectureEnd) {
            // During lecture (live)
            lectureState = "live";
            if (totalStudents > 0) {
              attendancePercentage = Math.round(
                (attendedStudents / totalStudents) * 100,
              );
            } else {
              // Edge case: 0/0 - batch has zero students
              attendancePercentage = null;
            }
          } else {
            // After lecture ends (final)
            lectureState = "final";
            if (totalStudents > 0) {
              attendancePercentage = Math.round(
                (attendedStudents / totalStudents) * 100,
              );
            } else {
              // Edge case: 0/0 - batch has zero students
              attendancePercentage = null;
            }
          }
        }

        return {
          ...lecture.toObject(),
          total_students: totalStudents,
          attended_students: attendedStudents,
          attendance: {
            attended_students: attendedStudents,
            total_students: totalStudents,
            percentage: attendancePercentage,
            state: lectureState,
          },
          metadata: {
            attendance_percentage: attendancePercentage,
            duration_minutes:
              lecture.lecture_end && lecture.lecture_start
                ? Math.round(
                    (new Date(lecture.lecture_end) -
                      new Date(lecture.lecture_start)) /
                      (1000 * 60),
                  )
                : 0,
          },
        };
      }),
    );

    res.json({
      success: true,
      lectures: enrichedLectures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk upload lectures
app.post(
  "/api/lectures/bulk-upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    console.log("📤 Lecture bulk upload started");
    console.log(
      "👤 Authenticated user:",
      req.user?.email,
      "Role:",
      req.user?.role,
    );
    console.log("🍪 Cookies received:", req.cookies);
    console.log("🔑 Authorization header:", req.headers.authorization);

    try {
      if (!req.file) {
        console.log("❌ No file uploaded");
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      console.log(
        "📄 File received:",
        req.file.originalname,
        "- Size:",
        req.file.size,
        "bytes",
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet("Lectures");
      if (!worksheet) {
        console.log('❌ No "Lectures" worksheet found');
        return res.status(400).json({
          success: false,
          message: 'No "Lectures" worksheet found in file',
        });
      }

      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          data.push({
            rowNumber,
            "Course Name *": row.getCell(1).value,
            "Batch Name *": row.getCell(2).value,
            "Subject *": row.getCell(3).value,
            "Teacher First Name *": row.getCell(4).value,
            "Teacher Last Name *": row.getCell(5).value,
            "Date (DD/MM/YYYY) *": row.getCell(6).value,
            "Start Time (HH:MM) *": row.getCell(7).value,
            "End Time (HH:MM) *": row.getCell(8).value,
            "Topic *": row.getCell(9).value,
            Subtopic: row.getCell(10).value,
            Note: row.getCell(11).value,
            Status: row.getCell(12).value,
          });
        }
      });

      console.log(`📊 Parsed ${data.length} lecture rows from Excel`);

      const results = {
        success: [],
        failed: [],
        total: data.length,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = row.rowNumber;

        console.log(`\n🔄 Processing lecture row ${rowNumber}...`);

        try {
          const course_name = row["Course Name *"];
          const batch_name = row["Batch Name *"];
          const subject = row["Subject *"];
          const teacher_fname = row["Teacher First Name *"];
          const teacher_lname = row["Teacher Last Name *"];
          const date = row["Date (DD/MM/YYYY) *"];
          const start_time = row["Start Time (HH:MM) *"];
          const end_time = row["End Time (HH:MM) *"];
          const topic = row["Topic *"];

          if (
            !course_name ||
            !batch_name ||
            !subject ||
            !teacher_fname ||
            !teacher_lname ||
            !date ||
            !start_time ||
            !end_time ||
            !topic
          ) {
            throw new Error("Missing required fields");
          }

          // Parse date and time
          const lectureDate = parseExcelDate(date);
          if (!lectureDate) throw new Error("Invalid Date (use DD/MM/YYYY)");

          // Convert time to string if it's an Excel time (decimal or Date object)
          let startTimeStr = start_time;
          let endTimeStr = end_time;

          // If time is a number (Excel decimal time format)
          if (typeof start_time === "number") {
            const hours = Math.floor(start_time * 24);
            const minutes = Math.floor((start_time * 24 * 60) % 60);
            startTimeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          } else if (start_time instanceof Date) {
            // If time is a Date object
            startTimeStr = `${String(start_time.getHours()).padStart(2, "0")}:${String(start_time.getMinutes()).padStart(2, "0")}`;
          } else {
            startTimeStr = String(start_time);
          }

          if (typeof end_time === "number") {
            const hours = Math.floor(end_time * 24);
            const minutes = Math.floor((end_time * 24 * 60) % 60);
            endTimeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
          } else if (end_time instanceof Date) {
            endTimeStr = `${String(end_time.getHours()).padStart(2, "0")}:${String(end_time.getMinutes()).padStart(2, "0")}`;
          } else {
            endTimeStr = String(end_time);
          }

          const [startHour, startMinute] = startTimeStr.split(":");
          const [endHour, endMinute] = endTimeStr.split(":");

          const lecture_start = new Date(lectureDate);
          lecture_start.setHours(parseInt(startHour), parseInt(startMinute), 0);

          const lecture_end = new Date(lectureDate);
          lecture_end.setHours(parseInt(endHour), parseInt(endMinute), 0);

          console.log(
            `   📖 Creating lecture: ${topic} on ${lectureDate.toDateString()}`,
          );

          // Resolve course and batch by name
          const courseDoc = await Course.findOne({ name: course_name });
          if (!courseDoc) throw new Error(`Course not found: ${course_name}`);
          const batchDoc = await Batches.findOne({
            name: batch_name,
            course_id: courseDoc._id,
          });
          if (!batchDoc)
            throw new Error(
              `Batch not found: ${batch_name} (Course: ${courseDoc.name})`,
            );

          // Look up teacher by first and last name
          const teacherDoc = await Teacher.findOne({
            fname: teacher_fname,
            lname: teacher_lname,
          });

          if (!teacherDoc) {
            throw new Error(
              `Teacher not found: ${teacher_fname} ${teacher_lname}`,
            );
          }

          console.log(
            `   ✅ Found teacher: ${teacherDoc.fname} ${teacherDoc.lname} (${teacherDoc._id})`,
          );

          const lectureData = {
            course_id: courseDoc._id,
            batch_id: batchDoc._id,
            subject,
            teacher_id: teacherDoc.user_id,
            date: lectureDate,
            lecture_start,
            lecture_end,
            topic,
            subtopic: row["Subtopic"] || "",
            note: row["Note"] || "",
            status: row["Status"] || "scheduled",
          };

          const lecture = new Lecture(lectureData);
          await lecture.save();

          console.log("Lecture created:", lecture._id);

          results.success.push({
            row: rowNumber,
            topic,
            subject,
            date: lectureDate.toLocaleDateString(),
            time: `${start_time} - ${end_time}`,
            lectureId: lecture._id,
          });

          console.log("Lecture row", rowNumber, "completed successfully");
        } catch (error) {
          console.error("Row", rowNumber, "failed:", error.message);
          results.failed.push({
            row: rowNumber,
            data: row,
            error: error.message,
          });
        }
      }

      console.log(
        `\n📈 LECTURES Upload complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
      );
      console.log(
        "✅ SUCCESS Lecture IDs:",
        results.success.map((s) => s.lectureId),
      );
      if (results.failed.length > 0) {
        console.log(
          "❌ FAILED rows:",
          results.failed.map((f) => `Row ${f.row}: ${f.error}`),
        );
      }

      res.json({
        success: true,
        message: `Processed ${results.total} rows. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        results,
      });

      console.log("📤 Lecture bulk upload response sent successfully");
    } catch (err) {
      console.error("💥 Lecture bulk upload error:", err);
      console.error("💥 Error stack:", err.stack);
      res.status(500).json({
        success: false,
        message: err.message,
      });
      console.log("📤 Error response sent to client");
    }
  },
);

// Get archived lectures (MUST be before /:id route)
app.get("/api/lectures/archived", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ archived: true }, { isArchived: true }],
    };

    const lectures = await Lecture.find(filter)
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "fname lname email")
      .sort({ date: -1, lecture_start: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Lecture.countDocuments(filter);

    // Calculate attendance for each archived lecture
    // Archived lectures MUST always show final state - never recalculated as live
    const enrichedLectures = await Promise.all(
      lectures.map(async (lecture) => {
        let totalStudents = 0;
        let attendedStudents = 0;
        let attendancePercentage = null;
        const lectureState = "final"; // Archived lectures are always final

        // Only calculate if batch exists
        if (lecture.batch_id && lecture.batch_id._id) {
          // Get total students enrolled in this batch
          totalStudents = await Student.countDocuments({
            batch_id: lecture.batch_id._id,
          });

          // Get attendance for this specific lecture
          // Count students who are present or late
          // Explicitly: auto_absent, absent, and excused are NOT counted as attended
          const lectureDate = new Date(lecture.date);
          const startOfDay = new Date(lectureDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(lectureDate.setHours(23, 59, 59, 999));

          attendedStudents = await Attendance.countDocuments({
            lectureId: lecture._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            userType: "Student",
            status: { $in: ["present", "late"] },
          });

          // Calculate final percentage
          if (totalStudents > 0) {
            attendancePercentage = Math.round(
              (attendedStudents / totalStudents) * 100,
            );
          } else {
            // Edge case: 0/0 - batch has zero students
            attendancePercentage = null;
          }
        }

        return {
          ...lecture.toObject(),
          total_students: totalStudents,
          attended_students: attendedStudents,
          attendance: {
            attended_students: attendedStudents,
            total_students: totalStudents,
            percentage: attendancePercentage,
            state: lectureState,
          },
          metadata: {
            attendance_percentage: attendancePercentage,
            duration_minutes:
              lecture.lecture_end && lecture.lecture_start
                ? Math.round(
                    (new Date(lecture.lecture_end) -
                      new Date(lecture.lecture_start)) /
                      (1000 * 60),
                  )
                : 0,
          },
        };
      }),
    );

    res.json({
      success: true,
      lectures: enrichedLectures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get lecture by ID
app.get("/api/lectures/:id", async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    let totalStudents = 0;
    let attendedStudents = 0;
    let attendancePercentage = null;
    let lectureState = "pending";

    // Calculate attendance if batch exists
    if (lecture.batch_id && lecture.batch_id._id) {
      // Get total students enrolled in this batch
      totalStudents = await Student.countDocuments({
        batch_id: lecture.batch_id._id,
      });

      // Get attendance for this specific lecture
      // Count students who are present or late
      // Explicitly: auto_absent, absent, and excused are NOT counted as attended
      const lectureDate = new Date(lecture.date);
      const startOfDay = new Date(lectureDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(lectureDate.setHours(23, 59, 59, 999));

      attendedStudents = await Attendance.countDocuments({
        lectureId: lecture._id,
        date: { $gte: startOfDay, $lte: endOfDay },
        userType: "Student",
        status: { $in: ["present", "late"] },
      });

      // Determine lecture state and calculate percentage
      const now = new Date();
      const lectureStart = new Date(lecture.lecture_start);
      const lectureEnd = new Date(lecture.lecture_end);

      if (now < lectureStart) {
        // Before lecture starts
        lectureState = "pending";
        attendancePercentage = null;
      } else if (now >= lectureStart && now <= lectureEnd) {
        // During lecture (live)
        lectureState = "live";
        if (totalStudents > 0) {
          attendancePercentage = Math.round(
            (attendedStudents / totalStudents) * 100,
          );
        } else {
          // Edge case: 0/0 - batch has zero students
          attendancePercentage = null;
        }
      } else {
        // After lecture ends (final)
        lectureState = "final";
        if (totalStudents > 0) {
          attendancePercentage = Math.round(
            (attendedStudents / totalStudents) * 100,
          );
        } else {
          // Edge case: 0/0 - batch has zero students
          attendancePercentage = null;
        }
      }
    }

    const enrichedLecture = {
      ...lecture.toObject(),
      total_students: totalStudents,
      attended_students: attendedStudents,
      attendance: {
        attended_students: attendedStudents,
        total_students: totalStudents,
        percentage: attendancePercentage,
        state: lectureState,
      },
      metadata: {
        attendance_percentage: attendancePercentage,
        duration_minutes:
          lecture.lecture_end && lecture.lecture_start
            ? Math.round(
                (new Date(lecture.lecture_end) -
                  new Date(lecture.lecture_start)) /
                  (1000 * 60),
              )
            : 0,
      },
    };

    res.json({ success: true, lecture: enrichedLecture });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new lecture
app.post("/api/lectures", async (req, res) => {
  try {
    const lectureData = req.body;

    // Validate that course exists
    if (lectureData.course_id) {
      const courseExists = await Course.findById(lectureData.course_id);
      if (!courseExists) {
        return res.status(400).json({
          success: false,
          message: "Course does not exist. Please create the course first.",
        });
      }
    }

    // Validate that batch exists and is linked to the course
    if (lectureData.batch_id) {
      const batchExists = await Batches.findById(lectureData.batch_id);
      if (!batchExists) {
        return res.status(400).json({
          success: false,
          message: "Batch does not exist. Please create the batch first.",
        });
      }

      // Verify batch is linked to the course
      if (
        lectureData.course_id &&
        batchExists.course_id.toString() !== lectureData.course_id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Batch is not linked to the specified course.",
        });
      }
    }

    // Calculate total students in the batch
    const studentsInBatch = await Student.countDocuments({
      batch_id: lectureData.batch_id,
    });
    lectureData.total_students = studentsInBatch;

    const lecture = new Lecture(lectureData);
    await lecture.save();

    const populatedLecture = await Lecture.findById(lecture._id)
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    res.status(201).json({ success: true, lecture: populatedLecture });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update lecture
app.put("/api/lectures/:id", async (req, res) => {
  try {
    const update = { ...req.body };
    // Recompute total_students if batch_id provided
    if (update.batch_id) {
      try {
        const studentsInBatch = await Student.countDocuments({
          batch_id: update.batch_id,
        });
        update.total_students = studentsInBatch;
      } catch (e) {
        // ignore counting failure and continue
      }
    }
    update.updated_at = new Date();

    const lecture = await Lecture.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    res.json({ success: true, lecture });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete lecture
app.delete("/api/lectures/:id", async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndDelete(req.params.id);

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    res.json({ success: true, message: "Lecture deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update attendance for a lecture
app.patch("/api/lectures/:id/attendance", async (req, res) => {
  try {
    const { attendance_count } = req.body;

    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { attendance_count },
      { new: true },
    )
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    res.json({ success: true, lecture });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Archive lecture
app.patch("/api/lectures/:id/archive", async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archived: true },
      { new: true },
    )
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    res.json({ success: true, lecture });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Restore lecture
app.patch("/api/lectures/:id/restore", async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { isArchived: false, archived: false },
      { new: true },
    )
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .populate("teacher_id", "f_name l_name email");

    if (!lecture) {
      return res
        .status(404)
        .json({ success: false, message: "Lecture not found" });
    }

    res.json({ success: true, lecture });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== PAYMENT ROUTES =====

// Get all payments with filters
app.get("/api/payments", async (req, res) => {
  try {
    const { course, batch, student, status } = req.query;

    let filter = {};
    if (course && course !== "all") filter.course_id = course;
    if (batch && batch !== "all") filter.batch_id = batch;
    if (student && student !== "all") filter.student_id = student;
    if (status && status !== "all") filter.status = status;

    const payments = await Payment.find(filter)
      .populate({
        path: "student_id",
        populate: { path: "user_id", select: "f_name l_name email phone" },
      })
      .populate("course_id", "name")
      .populate("batch_id", "name")
      .sort({ due_date: -1 });

    res.json({ success: true, payments });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get payment statistics for dashboard
app.get("/api/payments/stats", async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const paidPayments = await Payment.countDocuments({ status: "paid" });
    const pendingPayments = await Payment.countDocuments({ status: "pending" });
    const overduePayments = await Payment.countDocuments({ status: "overdue" });

    const totalAmount = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const collectedAmount = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$paid_amount" } } },
    ]);

    // Get upcoming installments (due in next 10 days)
    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const upcomingInstallments = await FeeInstallment.find({
      due_date: {
        $gte: now,
        $lte: tenDaysFromNow,
      },
    })
      .populate({
        path: "plan_id",
        populate: {
          path: "batch_id",
          select: "name course_id",
          populate: {
            path: "course_id",
            select: "name",
          },
        },
      })
      .sort({ due_date: 1 })
      .limit(20);

    // For each installment, find students and calculate remaining amount
    const installmentsWithDetails = await Promise.all(
      upcomingInstallments.map(async (installment) => {
        if (!installment.plan_id) return null;

        // Find students with this fee plan
        const students = await Student.find({
          fee_plan_id: installment.plan_id._id,
        }).select("f_name l_name course_id");

        // For each student, calculate how much of this installment is paid
        const studentDetails = await Promise.all(
          students.map(async (student) => {
            // Get payments for this student and this installment
            const payments = await FeePayment.find({
              student_id: student._id,
              installment_id: installment._id,
            });

            const paidAmount = payments.reduce(
              (sum, p) => sum + (p.paid_amount || 0),
              0,
            );
            const remainingAmount = installment.amount - paidAmount;

            // Only include if there's a remaining balance
            if (remainingAmount > 0.01) {
              const courseName =
                installment.plan_id.batch_id?.course_id?.name || "";

              return {
                student_id: student._id,
                student_name:
                  `${student.f_name} ${student.l_name || ""}`.trim(),
                course_name: courseName,
                installment_no: installment.installment_no,
                due_date: installment.due_date,
                installment_amount: installment.amount,
                paid_amount: paidAmount,
                remaining_amount: Math.round(remainingAmount * 100) / 100,
                batch_name: installment.plan_id.batch_id?.name || "",
              };
            }
            return null;
          }),
        );

        return studentDetails.filter((detail) => detail !== null);
      }),
    );

    // Flatten array and remove nulls
    const upcomingFees = installmentsWithDetails
      .flat()
      .filter((item) => item !== null)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    res.json({
      success: true,
      stats: {
        total: totalPayments,
        paid: paidPayments,
        pending: pendingPayments,
        overdue: overduePayments,
        totalAmount: totalAmount[0]?.total || 0,
        collectedAmount: collectedAmount[0]?.total || 0,
      },
      upcomingFees: upcomingFees,
    });
  } catch (err) {
    console.error("Error in /api/payments/stats:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create payment
app.post("/api/payments", async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.json({ success: true, payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update payment
app.put("/api/payments/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete payment
app.delete("/api/payments/:id", async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Payment deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== EXPENSE ROUTES =====

// Get all expenses
app.get("/api/expenses", async (req, res) => {
  try {
    const { category, status } = req.query;

    let filter = {};
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;

    const expenses = await Expense.find(filter)
      .populate("approved_by", "fname lname")
      .sort({ date: -1 });

    res.json({ success: true, expenses });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get expense statistics
app.get("/api/expenses/stats", async (req, res) => {
  try {
    const totalExpenses = await Expense.countDocuments();
    const pendingExpenses = await Expense.countDocuments({ status: "pending" });
    const approvedExpenses = await Expense.countDocuments({
      status: "approved",
    });

    const totalAmount = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const categoryWise = await Expense.aggregate([
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        total: totalExpenses,
        pending: pendingExpenses,
        approved: approvedExpenses,
        totalAmount: totalAmount[0]?.total || 0,
        byCategory: categoryWise,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create expense
app.post("/api/expenses", async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update expense
app.put("/api/expenses/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete expense
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== SALARY ROUTES =====

// Get all salaries
app.get("/api/salaries", async (req, res) => {
  try {
    const { month, year, status } = req.query;

    let filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status && status !== "all") filter.status = status;

    const salaries = await Salary.find(filter)
      .populate({
        path: "teacher_id",
        populate: { path: "user_id", select: "f_name l_name email phone" },
      })
      .sort({ year: -1, month: -1 });

    res.json({ success: true, salaries });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== STUDENT PAYMENT RECORDS ENDPOINT =====
app.get("/api/student-payments", verifyAuth, async (req, res) => {
  console.log("📊 Fetching student payment records...");

  try {
    const { course, batch, student, status } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Build filter
    let studentFilter = {};

    // If user is a student, only show their own payments
    if (userRole === "Student") {
      const studentRecord = await Student.findOne({ user_id: userId });
      if (!studentRecord) {
        return res.json({ success: true, paymentRecords: [], total: 0 });
      }
      studentFilter._id = studentRecord._id;
    }
    // If user is a parent, only show their linked student's payments
    else if (userRole === "Parent") {
      const parentRecord = await Parent.findOne({ user_id: userId });
      if (!parentRecord || !parentRecord.student_id) {
        return res.json({ success: true, paymentRecords: [], total: 0 });
      }
      studentFilter._id = parentRecord.student_id;
    }
    // Admin/SuperAdmin can filter by any criteria
    else {
      if (course && course !== "all") studentFilter.course_id = course;
      if (batch && batch !== "all") studentFilter.batch_id = batch;
      if (student && student !== "all") studentFilter._id = student;
    }

    // Find students matching filter
    const students = await Student.find(studentFilter)
      .populate("user_id", "fname lname email phone")
      .populate("course_id", "name")
      .populate("batch_id", "name");

    console.log(`📋 Found ${students.length} students`);

    // For each student, get their payment details
    const paymentRecords = [];

    for (const student of students) {
      // Get fee plan for student (try student-specific first, then batch default)
      console.log(`\n👤 Processing student: ${student.fname} ${student.lname}`);
      console.log(`   - Student ID: ${student._id}`);
      console.log(`   - Batch ID: ${student.batch_id?._id}`);
      console.log(
        `   - Fee Plan ID (stored): ${student.fee_plan_id || "NOT SET"}`,
      );
      console.log(
        `   - Discount Type (stored): ${student.discount_type || "NOT SET"}`,
      );

      let feePlan = null;

      if (student.fee_plan_id) {
        feePlan = await FeePlan.findById(student.fee_plan_id);
        if (!feePlan) {
          console.log(
            `   ⚠️ Fee plan ${student.fee_plan_id} not found! Will use batch default.`,
          );
        } else {
          console.log(`   ✅ Found student's fee plan`);
        }
      }

      if (!feePlan && student.batch_id) {
        // Fallback to batch-level fee plan if student doesn't have one assigned
        feePlan = await FeePlan.findOne({ batch_id: student.batch_id }).sort({
          createdAt: -1,
        });
        if (feePlan) {
          console.log(`   ℹ️  Using batch default fee plan: ${feePlan._id}`);
        }
      }

      if (!feePlan) {
        console.log(`⚠️ No fee plan for student ${student._id}, skipping...`);
        continue;
      }

      console.log(`📋 Student ${student.fname} ${student.lname}:`);
      console.log(`   - Fee Plan ID: ${feePlan._id}`);
      console.log(`   - Fee Plan Total: ₹${feePlan.total_amount}`);
      console.log(`   - Installments: ${feePlan.num_installments}`);
      console.log(
        `   - Student's Discount Type: ${student.discount_type || "None"}`,
      );

      // Calculate student's actual fee after applying their selected discount
      let studentTotalFee = feePlan.total_amount;
      let discountPercent = 0;

      if (student.discount_type && feePlan.discount_types) {
        const selectedDiscount = feePlan.discount_types.find(
          (dt) => dt.code === student.discount_type,
        );
        if (selectedDiscount) {
          discountPercent = selectedDiscount.discount_percent;
          const discountAmount = studentTotalFee * (discountPercent / 100);
          studentTotalFee = studentTotalFee - discountAmount;
          console.log(
            `   - Discount: ${selectedDiscount.name} (${discountPercent}%)`,
          );
          console.log(`   - After Discount: ₹${studentTotalFee.toFixed(2)}`);
        }
      }

      // Add 18% GST to the discounted amount
      const tax = studentTotalFee * 0.18;
      studentTotalFee = studentTotalFee + tax;
      console.log(`   - Tax (18%): ₹${tax.toFixed(2)}`);
      console.log(`   - Final Total: ₹${studentTotalFee.toFixed(2)}`);

      // Calculate student's per-installment amount
      const studentInstallmentAmount =
        studentTotalFee / feePlan.num_installments;
      console.log(
        `   - Per Installment: ₹${studentInstallmentAmount.toFixed(2)}`,
      );

      // Generate installments dynamically (no FeeInstallment collection needed)
      const startDate = new Date();

      // Track cumulative totals across all installments
      let cumulativeDue = 0; // Total amount due so far
      let cumulativePaid = 0; // Total amount paid so far
      let carryForwardBalance = 0; // Balance carried from previous installments (+ for underpay, - for overpay)

      // For each installment, calculate details and get payment details
      for (let i = 1; i <= feePlan.num_installments; i++) {
        // Calculate due date (1 month apart starting from next month)
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Get payments for this installment number
        const payments = await FeePayment.find({
          student_id: student._id,
          fee_plan_id: feePlan._id,
          installment_no: i,
        }).sort({ paid_date: -1 });

        const round2 = (n) => Math.round((n || 0) * 100) / 100;
        const EPS = 0.005;

        // Base installment amount (with discount + tax) - same for all installments
        const baseInstallmentAmount = round2(studentInstallmentAmount);

        const totalPaid = round2(
          payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
        );

        // Calculate this installment's balance (considering any carry-forward from previous)
        const amountDueWithCarryForward = round2(
          baseInstallmentAmount + carryForwardBalance,
        );
        const installmentBalance = round2(
          amountDueWithCarryForward - totalPaid,
        );

        // Update cumulative totals (using base amount for display consistency)
        cumulativeDue = round2(cumulativeDue + baseInstallmentAmount);
        cumulativePaid = round2(cumulativePaid + totalPaid);

        // Calculate global remaining (across all installments processed so far)
        const globalRemaining = round2(cumulativeDue - cumulativePaid);

        // Display amount is always the base (for summing purposes)
        let displayAmount = baseInstallmentAmount;

        // Remaining amount shows what's actually left to pay (including carry-forward)
        // If there's an overpayment credit, this could be 0 or negative
        let remainingAmount = round2(
          Math.max(0, amountDueWithCarryForward - totalPaid),
        );

        // Carry forward the balance to next installment
        if (i < feePlan.num_installments) {
          carryForwardBalance = installmentBalance;
        }

        // Calculate payment status based on remaining amount
        let paymentStatus = "pending";
        if (remainingAmount <= EPS) {
          // Fully paid
          paymentStatus = "paid";
        } else if (totalPaid > EPS) {
          // Has some payment but not fully paid
          paymentStatus = "partial";
        } else if (new Date() > dueDate) {
          // No payment and past due date
          paymentStatus = "overdue";
        }

        // Filter by status if provided
        if (status && status !== "all" && paymentStatus !== status) {
          continue;
        }

        // Skip zero-amount phantom installments (cleanup safety)
        const amtForCheck = round2(displayAmount);
        if (amtForCheck <= EPS && totalPaid <= EPS) {
          continue;
        }

        // Get last payment date
        const lastPayment = payments.length > 0 ? payments[0] : null;

        paymentRecords.push({
          // Student details
          student_id: student._id,
          student_name: `${student.fname} ${student.lname}`,
          student_email: student.user_id?.email || "",
          student_phone: student.user_id?.phone || "",

          // Course & Batch details
          course_id: student.course_id?._id,
          course_name: student.course_id?.name || "",
          batch_id: student.batch_id?._id,
          batch_name: student.batch_id?.name || "",

          // Fee plan details (use student's actual total with discount + tax)
          fee_plan_id: feePlan._id,
          fee_plan_amount: round2(studentTotalFee),

          // Installment details (calculated dynamically, no installment_id)
          installment_no: i,
          due_date: dueDate,
          amount: displayAmount, // Always show base installment amount

          // Payment details
          paid_amount: totalPaid,
          remaining_amount: remainingAmount,
          overall_remaining: round2(studentTotalFee - cumulativePaid), // Total remaining across all installments
          status: paymentStatus,
          last_paid_date: lastPayment?.paid_date,
          receipt_no: lastPayment?.receipt_no,

          // Additional info
          payments: payments,
          plan_id: feePlan._id,
          total_installments: feePlan.num_installments,
        });
      }
    }

    console.log(`✅ Generated ${paymentRecords.length} payment records`);

    res.json({
      success: true,
      paymentRecords,
      total: paymentRecords.length,
    });
  } catch (err) {
    console.error("❌ Error fetching student payments:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Record a payment against a specific installment for a student
app.post("/api/record-payment", async (req, res) => {
  try {
    const {
      student_id,
      fee_plan_id,
      installment_no,
      paid_amount,
      paid_date,
      payment_mode,
      transaction_id,
      receipt_no,
      remarks,
    } = req.body || {};

    // Basic validations
    if (!student_id || !fee_plan_id || !installment_no) {
      return res.status(400).json({
        success: false,
        message: "student_id, fee_plan_id, and installment_no are required",
      });
    }
    if (
      typeof paid_amount !== "number" ||
      isNaN(paid_amount) ||
      paid_amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "paid_amount must be a number greater than 0",
      });
    }

    if (paid_date) {
      const pd = new Date(paid_date);
      const now = new Date();
      if (isNaN(pd.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "paid_date is invalid" });
      }
      if (pd > now) {
        return res.status(400).json({
          success: false,
          message: "Payment date cannot be in the future",
        });
      }
    }

    // Ensure student and fee plan exist
    const [studentDoc, feePlan] = await Promise.all([
      Student.findById(student_id),
      FeePlan.findById(fee_plan_id),
    ]);
    if (!studentDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    if (!feePlan) {
      return res
        .status(404)
        .json({ success: false, message: "Fee plan not found" });
    }

    // Validate installment number
    if (installment_no < 1 || installment_no > feePlan.num_installments) {
      return res.status(400).json({
        success: false,
        message: `Invalid installment number. Must be between 1 and ${feePlan.num_installments}`,
      });
    }

    // Receipt uniqueness (if provided)
    if (receipt_no) {
      const existingReceipt = await FeePayment.findOne({ receipt_no });
      if (existingReceipt) {
        return res
          .status(409)
          .json({ success: false, message: "Receipt number already exists" });
      }
    }

    // Calculate overall remaining balance for student
    const round2 = (n) => Math.round((n || 0) * 100) / 100;
    const EPS = 0.005;

    // Calculate student's actual total fee (with discount + tax)
    let studentTotalFee = feePlan.total_amount;

    if (studentDoc.discount_type && feePlan.discount_types) {
      const selectedDiscount = feePlan.discount_types.find(
        (dt) => dt.code === studentDoc.discount_type,
      );
      if (selectedDiscount) {
        const discountAmount =
          studentTotalFee * (selectedDiscount.discount_percent / 100);
        studentTotalFee = studentTotalFee - discountAmount;
      }
    }

    // Add 18% GST
    const tax = studentTotalFee * 0.18;
    studentTotalFee = round2(studentTotalFee + tax);

    // Calculate per-installment amount for this student
    const studentInstallmentAmount = round2(
      studentTotalFee / feePlan.num_installments,
    );

    // Calculate total expected for this student (with their discount + tax)
    const totalExpected = round2(studentTotalFee);

    // Calculate total paid across ALL installments for this student
    let totalPaidAcrossAll = 0;
    for (let i = 1; i <= feePlan.num_installments; i++) {
      const instPayments = await FeePayment.find({
        student_id,
        fee_plan_id: feePlan._id,
        installment_no: i,
      });
      totalPaidAcrossAll += instPayments.reduce(
        (sum, p) => sum + (p.paid_amount || 0),
        0,
      );
    }

    totalPaidAcrossAll = round2(totalPaidAcrossAll);
    const globalRemaining = round2(totalExpected - totalPaidAcrossAll);
    const paidAmountRounded = round2(paid_amount);

    console.log("\n💰 Payment Validation:");
    console.log(`   Student: ${studentDoc.fname} ${studentDoc.lname}`);
    console.log(`   Total Expected (with discount + tax): ₹${totalExpected}`);
    console.log(`   Total Paid (all installments): ₹${totalPaidAcrossAll}`);
    console.log(`   Global Remaining: ₹${globalRemaining}`);
    console.log(`   Attempting to pay: ₹${paidAmountRounded}`);
    console.log(
      `   Validation: ${paidAmountRounded} <= ${globalRemaining} ? ${paidAmountRounded <= globalRemaining + 0.02}\n`,
    );

    // Validate payment doesn't exceed what's remaining globally
    if (paidAmountRounded > globalRemaining + 0.02) {
      return res.status(400).json({
        success: false,
        message: `Cannot record payment. Total remaining: ₹${globalRemaining.toFixed(
          2,
        )}. Please enter an amount ≤ ₹${globalRemaining.toFixed(2)}`,
      });
    }

    // Payment is valid - proceed to record it
    // Calculate what was remaining for this specific installment before payment
    const existingPayments = await FeePayment.find({
      student_id,
      fee_plan_id: feePlan._id,
      installment_no,
    });
    const alreadyPaidThisInst = round2(
      existingPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
    );
    const remainingBefore = round2(
      Math.max(0, studentInstallmentAmount - alreadyPaidThisInst),
    );
    const paidRounded = round2(paid_amount);

    // Calculate payment adjustment (overpayment or underpayment)
    let adjustment = {
      type: "none",
      amount: 0,
      next_installment_no: null,
    };

    if (paidRounded - remainingBefore > EPS) {
      // OVERPAYMENT - excess will be deducted from next installment's amount
      const excess = round2(paidRounded - remainingBefore);
      const nextInstNo =
        installment_no < feePlan.num_installments ? installment_no + 1 : null;
      adjustment = {
        type: "overpayment",
        amount: excess,
        next_installment_no: nextInstNo,
      };
    } else if (remainingBefore - paidRounded > EPS) {
      // UNDERPAYMENT - balance will carry forward to next installment
      const shortfall = round2(remainingBefore - paidRounded);
      const nextInstNo =
        installment_no < feePlan.num_installments ? installment_no + 1 : null;
      adjustment = {
        type: "underpayment",
        amount: shortfall,
        next_installment_no: nextInstNo,
      };
    }

    // Normalize payment mode
    const allowedModes = ["cash", "card", "upi", "bank_transfer", "cheque"];
    const modeNorm = String(payment_mode || "cash").toLowerCase();
    const finalMode = allowedModes.includes(modeNorm) ? modeNorm : "cash";

    // Determine status for this payment record
    const willRemain = Math.max(0, round2(remainingBefore - paidRounded));
    const paymentStatus = willRemain <= 0 ? "paid" : "partial";
    const payment = new FeePayment({
      student_id,
      fee_plan_id: feePlan._id,
      installment_no,
      paid_amount,
      paid_date: paid_date ? new Date(paid_date) : new Date(),
      payment_mode: finalMode,
      transaction_id,
      receipt_no, // pre-save hook will auto-generate if not provided
      remarks,
      status: paymentStatus,
    });

    await payment.save();

    console.log("\n✅ Payment recorded successfully:");
    console.log(`   Receipt: ${payment.receipt_no}`);
    console.log(`   Amount: ₹${payment.paid_amount}`);
    console.log(`   Installment: #${installment_no}`);
    if (adjustment.type !== "none") {
      console.log(
        `   Adjustment: ${adjustment.type} - ₹${adjustment.amount.toFixed(2)}`,
      );
    }

    // Note: In the new simplified system, overpayments/underpayments are handled automatically
    // through cumulative calculation in /api/student-payments endpoint.
    // No need to modify future installments - the system calculates remaining amounts dynamically.

    // Build updated installment summary (for response)
    const totalPaidNow = round2(alreadyPaidThisInst + paidRounded);
    const remainingNow = Math.max(
      0,
      round2(studentInstallmentAmount - totalPaidNow),
    );

    let currentStatus = "pending";
    if (remainingNow <= EPS) {
      currentStatus = "paid";
    } else if (totalPaidNow > EPS) {
      currentStatus = "partial";
    } else {
      const startDate = new Date();
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + installment_no);
      if (new Date() > dueDate) {
        currentStatus = "overdue";
      }
    }

    const updated_installment = {
      installment_no: installment_no,
      amount: studentInstallmentAmount,
      paid_amount: totalPaidNow,
      remaining_amount: remainingNow,
      status: currentStatus,
      last_paid_date: payment.paid_date,
      last_receipt_no: payment.receipt_no,
    };

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      payment,
      updated_installment,
    });
  } catch (err) {
    // Handle duplicate key error for unique receipt number
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Receipt number already exists" });
    }
    return res.status(400).json({
      success: false,
      message: err?.message || "Failed to record payment",
    });
  }
});

// ===== EXAMS ROUTES =====

// Get all exams with filters
app.get("/api/exams", verifyAuth, async (req, res) => {
  try {
    const { batch_id, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (batch_id) filter.batch_id = batch_id;
    if (status) filter.status = status;

    // Role-based filtering
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "Student") {
      // Find student's batch
      const student = await Student.findOne({ user_id: userId });
      if (student && student.batch_id) {
        filter.batch_id = student.batch_id;
      } else {
        // Student has no batch, return empty
        return res.json({
          success: true,
          exams: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    } else if (userRole === "Parent") {
      // Find all parent records for this user (parent can have multiple children)
      const parents = await Parent.find({ user_id: userId });
      if (parents && parents.length > 0) {
        const childrenIds = parents.map((p) => p.student_id).filter(Boolean);

        if (childrenIds.length > 0) {
          const students = await Student.find({ _id: { $in: childrenIds } });
          const batchIds = students.map((s) => s.batch_id).filter(Boolean);

          if (batchIds.length > 0) {
            filter.batch_id = { $in: batchIds };
          } else {
            // No children with batches, return empty
            return res.json({
              success: true,
              exams: [],
              total: 0,
              page: parseInt(page),
              totalPages: 0,
            });
          }
        } else {
          // Parent has no children, return empty
          return res.json({
            success: true,
            exams: [],
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          });
        }
      } else {
        // Parent record not found, return empty
        return res.json({
          success: true,
          exams: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }
    // For Admin, SuperAdmin, Teacher - show all exams (no additional filter)

    const total = await Exam.countDocuments(filter);
    const exams = await Exam.find(filter)
      .populate("batch_id", "name course_id")
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      success: true,
      exams,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching exams:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== EXAM BULK UPLOAD ROUTES =====

// Download exam template
app.get("/api/exams/template", async (req, res) => {
  console.log("Exam template download requested");
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Exams");

    // Define columns
    worksheet.columns = [
      { header: "Batch ID *", key: "batch_id", width: 25 },
      { header: "Exam Type *", key: "exam_type", width: 20 },
      { header: "Subject *", key: "subject", width: 20 },
      { header: "Topic *", key: "topic", width: 30 },
      { header: "Date (YYYY-MM-DD) *", key: "date", width: 18 },
      { header: "Total Marks *", key: "total_marks", width: 15 },
      { header: "Exam Link (for online)", key: "exam_link", width: 40 },
    ];

    // Add sample row with instructions
    worksheet.addRow({
      batch_id: "672d9afc4f4bd24df0c3e4b9",
      exam_type: "on_theory",
      subject: "Mathematics",
      topic: "Algebra - Final Exam",
      date: "2025-11-15",
      total_marks: 100,
      exam_link: "https://example.com/exam-link",
    });

    // Add a second example
    worksheet.addRow({
      batch_id: "672d9afc4f4bd24df0c3e4b9",
      exam_type: "off_mcq",
      subject: "Physics",
      topic: "Mechanics - Unit Test",
      date: "2025-11-20",
      total_marks: 50,
      exam_link: "",
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add notes sheet
    const notesSheet = workbook.addWorksheet("Instructions");
    notesSheet.getCell("A1").value = "INSTRUCTIONS FOR BULK EXAM UPLOAD";
    notesSheet.getCell("A1").font = { bold: true, size: 14 };

    notesSheet.getCell("A3").value = "Required Fields (marked with *):";
    notesSheet.getCell("A3").font = { bold: true };

    notesSheet.getCell("A4").value =
      "• Batch ID: Get this from your batches list";
    notesSheet.getCell("A5").value =
      "• Exam Type: Must be one of: on_theory, off_theory, on_mcq, off_mcq";
    notesSheet.getCell("A6").value = "• Subject: Name of the subject";
    notesSheet.getCell("A7").value = "• Topic: Exam topic or title";
    notesSheet.getCell("A8").value =
      "• Date: Format YYYY-MM-DD (e.g., 2025-11-15)";
    notesSheet.getCell("A9").value =
      "• Total Marks: Number of marks (e.g., 100)";

    notesSheet.getCell("A11").value = "Optional Fields:";
    notesSheet.getCell("A11").font = { bold: true };
    notesSheet.getCell("A12").value =
      "• Exam Link: Required only for online exams (on_theory, on_mcq)";

    notesSheet.getCell("A14").value = "Valid Exam Types:";
    notesSheet.getCell("A14").font = { bold: true };
    notesSheet.getCell("A15").value = "• on_theory = Online Theory Exam";
    notesSheet.getCell("A16").value = "• off_theory = Offline Theory Exam";
    notesSheet.getCell("A17").value = "• on_mcq = Online MCQ Exam";
    notesSheet.getCell("A18").value = "• off_mcq = Offline MCQ Exam";

    notesSheet.getColumn("A").width = 80;

    const buffer = await workbook.xlsx.writeBuffer();

    console.log("Exam template generated, size:", buffer.length, "bytes");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="exam_template.xlsx"',
    );
    res.send(buffer);
  } catch (error) {
    console.error("Exam template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
});

// Bulk upload exams
app.post(
  "/api/exams/bulk-upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    console.log("Exam bulk upload started");
    try {
      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log(
        "File received:",
        req.file.originalname,
        "- Size:",
        req.file.size,
        "bytes",
      );

      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet("Exams");

      if (!worksheet) {
        console.log('No "Exams" worksheet found');
        return res.status(400).json({
          success: false,
          message: 'No "Exams" worksheet found in file',
        });
      }

      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header
          data.push({
            rowNumber,
            "Batch ID *": row.getCell(1).value,
            "Exam Type *": row.getCell(2).value,
            "Subject *": row.getCell(3).value,
            "Topic *": row.getCell(4).value,
            "Date (YYYY-MM-DD) *": row.getCell(5).value,
            "Total Marks *": row.getCell(6).value,
            "Exam Link (for online)": row.getCell(7).value,
          });
        }
      });

      console.log("Parsed", data.length, "exam rows from Excel");

      const results = {
        success: [],
        failed: [],
        total: data.length,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = row.rowNumber;
        console.log("Processing exam row", rowNumber, "...");

        try {
          // Extract and validate fields
          const batch_id = row["Batch ID *"];
          const exam_type = String(row["Exam Type *"]).toLowerCase().trim();
          const subject = row["Subject *"];
          const topic = row["Topic *"];
          const date = row["Date (YYYY-MM-DD) *"];
          const total_marks = row["Total Marks *"];
          const exam_link = row["Exam Link (for online)"] || "";

          // Validation
          if (
            !batch_id ||
            !exam_type ||
            !subject ||
            !topic ||
            !date ||
            !total_marks
          ) {
            throw new Error("Missing required fields");
          }

          // Validate exam type
          const validTypes = ["on_theory", "off_theory", "on_mcq", "off_mcq"];
          if (!validTypes.includes(exam_type)) {
            throw new Error(
              `Invalid exam type: ${exam_type}. Must be one of: ${validTypes.join(
                ", ",
              )}`,
            );
          }

          // Validate online exam has link
          const isOnline = exam_type === "on_theory" || exam_type === "on_mcq";
          if (isOnline && !exam_link) {
            throw new Error("Exam link is required for online exams");
          }

          // Parse date
          let examDate;
          if (date instanceof Date) {
            examDate = date;
          } else {
            examDate = new Date(date);
          }

          if (isNaN(examDate.getTime())) {
            throw new Error("Invalid date format. Use YYYY-MM-DD");
          }

          // Validate total marks
          const marks = parseInt(total_marks);
          if (isNaN(marks) || marks <= 0) {
            throw new Error("Total marks must be a positive number");
          }

          // Verify batch exists
          const batchExists = await Batches.findById(batch_id);
          if (!batchExists) {
            throw new Error("Invalid Batch ID");
          }

          console.log("Creating exam:", topic, "on", examDate.toDateString());

          // Create exam
          const examData = {
            batch_id,
            exam_type,
            subject,
            topic,
            date: examDate,
            total_marks: marks,
            status: "scheduled",
          };

          if (isOnline && exam_link) {
            examData.exam_link = exam_link;
          }

          const exam = new Exam(examData);
          await exam.save();

          console.log("Exam created:", exam._id);

          results.success.push({
            row: rowNumber,
            topic,
            subject,
            date: examDate.toLocaleDateString(),
            examId: exam._id,
          });

          console.log("Exam row", rowNumber, "completed successfully");
        } catch (error) {
          console.error("Row", rowNumber, "failed:", error.message);
          results.failed.push({
            row: rowNumber,
            data: row,
            error: error.message,
          });
        }
      }

      console.log(
        "Upload complete:",
        results.success.length,
        "succeeded,",
        results.failed.length,
        "failed",
      );

      res.json({
        success: true,
        message: `Processed ${results.total} rows. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        results,
      });
    } catch (err) {
      console.error("Exam bulk upload error:", err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// Get exam by ID
app.get("/api/exams/:id", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "batch_id",
      "name course_id",
    );

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    res.json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create exam
app.post("/api/exams", async (req, res) => {
  try {
    const { batch_id, exam_type, subject, topic, date, total_marks } = req.body;

    // Validate required fields
    if (
      !batch_id ||
      !exam_type ||
      !subject ||
      !topic ||
      !date ||
      !total_marks
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const exam = new Exam(req.body);
    await exam.save();

    const populated = await Exam.findById(exam._id).populate(
      "batch_id",
      "name course_id",
    );
    res.status(201).json({ success: true, exam: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update exam
app.put("/api/exams/:id", async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("batch_id", "name course_id");

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    res.json({ success: true, exam });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete exam
app.delete("/api/exams/:id", async (req, res) => {
  try {
    // Also delete all related results
    await Result.deleteMany({ exam_id: req.params.id });
    await Exam.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Exam and related results deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Mark exam as completed (moves to results section)
app.patch("/api/exams/:id/complete", async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { status: "completed" },
      { new: true },
    ).populate("batch_id", "name course_id");

    res.json({ success: true, exam });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ===== RESULTS ROUTES =====

// Get results with filters
app.get("/api/results", verifyAuth, async (req, res) => {
  try {
    const { exam_id, student_id, batch_id, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (exam_id) filter.exam_id = exam_id;
    if (student_id) filter.student_id = student_id;

    // Role-based filtering
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "Student") {
      // Filter results for this student only
      const student = await Student.findOne({ user_id: userId });
      if (student) {
        filter.student_id = student._id;
      } else {
        // Student record not found, return empty
        return res.json({
          success: true,
          results: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    } else if (userRole === "Parent") {
      // Find all parent records for this user (parent can have multiple children)
      const parents = await Parent.find({ user_id: userId });
      if (parents && parents.length > 0) {
        const childrenIds = parents.map((p) => p.student_id).filter(Boolean);

        if (childrenIds.length > 0) {
          filter.student_id = { $in: childrenIds };
        } else {
          // Parent has no children, return empty
          return res.json({
            success: true,
            results: [],
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          });
        }
      } else {
        // Parent record not found, return empty
        return res.json({
          success: true,
          results: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }
    // For Admin, SuperAdmin, Teacher - show all results (no additional filter)

    // If filtering by batch, first get exams for that batch
    if (batch_id) {
      const exams = await Exam.find({ batch_id }).select("_id");
      filter.exam_id = { $in: exams.map((e) => e._id) };
    }

    const total = await Result.countDocuments(filter);
    const results = await Result.find(filter)
      .populate({
        path: "exam_id",
        select: "subject topic date total_marks batch_id",
        populate: { path: "batch_id", select: "name" },
      })
      .populate("student_id", "f_name l_name user_id")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get results for a specific exam
app.get("/api/results/exam/:examId", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate(
      "batch_id",
      "name",
    );

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    // Get all students in the batch
    const students = await Student.find({ batch_id: exam.batch_id }).populate(
      "user_id",
      "fname lname",
    );

    // Get existing results
    const results = await Result.find({ exam_id: exam._id });
    const resultMap = new Map(results.map((r) => [r.student_id.toString(), r]));

    // Combine student list with their results
    const studentsWithResults = students.map((student) => ({
      student_id: student._id,
      student_name: `${student.fname} ${student.lname}`,
      marks_obtained:
        resultMap.get(student._id.toString())?.marks_obtained || null,
      grade: resultMap.get(student._id.toString())?.grade || null,
      result_id: resultMap.get(student._id.toString())?._id || null,
    }));

    res.json({
      success: true,
      exam,
      students: studentsWithResults,
      total_students: students.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add/Update single result
app.post("/api/results", verifyAuth, async (req, res) => {
  try {
    // Role-based access control - only Admin, SuperAdmin, and authorized Teachers can add results
    const userRole = req.user?.role;

    if (userRole === "Student" || userRole === "Parent") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add results",
      });
    }

    const { exam_id, student_id, marks_obtained, grade, remarks } = req.body;

    if (!exam_id || !student_id || marks_obtained === undefined) {
      return res.status(400).json({
        success: false,
        message: "exam_id, student_id, and marks_obtained are required",
      });
    }

    // Check if result already exists
    let result = await Result.findOne({ exam_id, student_id });

    if (result) {
      // Update existing result
      result.marks_obtained = marks_obtained;
      result.grade = grade;
      result.remarks = remarks;
      await result.save();
    } else {
      // Create new result
      result = new Result({
        exam_id,
        student_id,
        marks_obtained,
        grade,
        remarks,
      });
      await result.save();
    }

    const populated = await Result.findById(result._id)
      .populate("exam_id", "subject topic total_marks")
      .populate("student_id", "fname lname");

    res.json({ success: true, result: populated });
  } catch (err) {
    console.error("Error adding result:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Bulk upload results
app.post("/api/results/bulk", verifyAuth, async (req, res) => {
  try {
    // Role-based access control - only Admin, SuperAdmin, and authorized Teachers can bulk upload
    const userRole = req.user?.role;

    if (userRole === "Student" || userRole === "Parent") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to upload results",
      });
    }

    const { exam_id, results } = req.body;

    if (!exam_id || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "exam_id and results array required",
      });
    }

    const successfulResults = [];
    const failedResults = [];

    for (const item of results) {
      try {
        const { student_id, marks_obtained, grade } = item;

        let result = await Result.findOne({ exam_id, student_id });

        if (result) {
          result.marks_obtained = marks_obtained;
          result.grade = grade;
          await result.save();
        } else {
          result = new Result({ exam_id, student_id, marks_obtained, grade });
          await result.save();
        }

        successfulResults.push(result);
      } catch (error) {
        failedResults.push({ ...item, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${successfulResults.length} results saved, ${failedResults.length} failed`,
      successful: successfulResults.length,
      failed: failedResults,
    });
  } catch (err) {
    console.error("Error in bulk upload results:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Download results template for Excel upload
app.get("/api/results/template/:examId", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate(
      "batch_id",
      "name",
    );

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    const students = await Student.find({ batch_id: exam.batch_id }).populate(
      "user_id",
      "fname lname",
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Results");

    worksheet.columns = [
      { header: "Student ID *", key: "student_id", width: 25 },
      { header: "Student Name", key: "student_name", width: 30 },
      { header: "Marks Obtained *", key: "marks_obtained", width: 18 },
      { header: "Grade", key: "grade", width: 10 },
    ];

    // Add students
    students.forEach((student) => {
      worksheet.addRow({
        student_id: student._id.toString(),
        student_name: `${student.fname} ${student.lname}`,
        marks_obtained: "",
        grade: "",
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="results_${exam._id}.xlsx"`,
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload results from Excel
app.post("/api/results/upload", upload.single("file"), async (req, res) => {
  try {
    const { exam_id } = req.body;

    if (!req.file || !exam_id) {
      return res.status(400).json({
        success: false,
        message: "File and exam_id required",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet("Results");

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'No "Results" worksheet found',
      });
    }

    const results = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        results.push({
          student_id: row.getCell(1).value,
          marks_obtained: row.getCell(3).value,
          grade: row.getCell(4).value,
        });
      }
    });

    const successfulResults = [];
    const failedResults = [];

    for (const item of results) {
      try {
        if (!item.student_id || item.marks_obtained === null) continue;

        let result = await Result.findOne({
          exam_id,
          student_id: item.student_id,
        });

        if (result) {
          result.marks_obtained = item.marks_obtained;
          result.grade = item.grade || "";
          await result.save();
        } else {
          result = new Result({
            exam_id,
            student_id: item.student_id,
            marks_obtained: item.marks_obtained,
            grade: item.grade || "",
          });
          await result.save();
        }

        successfulResults.push(result);
      } catch (error) {
        failedResults.push({ ...item, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${successfulResults.length} results uploaded successfully`,
      successful: successfulResults.length,
      failed: failedResults,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ROLE PERMISSIONS ROUTES =====

// Get all role permissions
app.get("/api/roles/permissions", verifyAuth, async (req, res) => {
  try {
    // Only SuperAdmin can view all role permissions
    if (req.user?.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin can view role permissions",
      });
    }

    const roles = await RolePermissions.find().sort({ role: 1 });
    res.json({ success: true, roles });
  } catch (err) {
    console.error("Error fetching role permissions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update role permissions
app.put("/api/roles/:role/permissions", verifyAuth, async (req, res) => {
  try {
    // Only SuperAdmin can update role permissions
    if (req.user?.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin can update role permissions",
      });
    }

    const { role } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: "Permissions object is required",
      });
    }

    // Validate role
    const allowedRoles = ["Admin", "Teacher", "Student", "Parent"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${allowedRoles.join(", ")}`,
      });
    }

    const updatedRole = await RolePermissions.findOneAndUpdate(
      { role },
      { permissions, updated_at: new Date() },
      { new: true, upsert: true },
    );

    res.json({
      success: true,
      message: `${role} permissions updated successfully`,
      role: updatedRole,
    });
  } catch (err) {
    console.error("Error updating role permissions:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ENQUIRY MANAGEMENT ROUTES =====

// Get all enquiries with filtering
app.get("/api/enquiries", verifyAuth, async (req, res) => {
  try {
    const {
      status,
      source,
      interest,
      assignedTo,
      page = 1,
      limit = 50,
    } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (interest) filter.interest = interest;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (page - 1) * limit;

    const enquiries = await Enquiry.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: enquiries.length,
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("Get enquiries error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ENQUIRY TEMPLATE DOWNLOAD (Must be before :status route) =====
app.get("/api/enquiries/template", async (req, res) => {
  console.log("📥 Enquiry template download requested");

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Enquiries");

    // ✅ Define columns (IMPORTANT)
    worksheet.columns = [
      { header: "First Name *", key: "fname", width: 15 },
      { header: "Last Name *", key: "lname", width: 15 },
      { header: "Phone *", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Source *", key: "source", width: 20 },
      { header: "Interest *", key: "interest", width: 20 },
      { header: "Address", key: "address", width: 30 },
      { header: "Location", key: "location", width: 15 },
    ];

    // ✅ Sample row (object-based, same as Students)
    worksheet.addRow({
      fname: "John",
      lname: "Doe",
      phone: "9876543210",
      email: "john@example.com",
      source: "Website",
      interest: "Full Stack",
      address: "123 Main Street, Apt 4B",
      location: "Mumbai",
    });

    // ✅ Header styling (same pattern)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // ✅ Write buffer (same as Students)
    const buffer = await workbook.xlsx.writeBuffer();
    console.log("✅ Enquiry template generated:", buffer.length, "bytes");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="enquiry_template.xlsx"'
    );

    res.send(buffer);
  } catch (error) {
    console.error("❌ Enquiry template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate enquiry template",
      error: error.message,
    });
  }
});

// Get enquiries by status (for different tabs)
app.get("/api/enquiries/:status", verifyAuth, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 50, search, source, interest } = req.query;

    console.log(`📊 Fetching enquiries with status: ${status}`);

    let filter = { status };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (source) filter.source = source;
    if (interest) filter.interest = interest;

    const skip = (page - 1) * limit;

    const enquiries = await Enquiry.find(filter)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    console.log(`📊 Found ${enquiries.length} enquiries, total: ${total}`);

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: enquiries.length,
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("Get enquiries by status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new enquiry
app.post("/api/enquiries", verifyAuth, async (req, res) => {
  try {
    console.log("� JWT Auth passed, user:", req.user);
    console.log("�📝 Creating new enquiry with data:", req.body);
    const {
      firstName,
      lastName,
      name, // For backward compatibility
      phone,
      email,
      source,
      interest,
      address,
      location,
      notes,
    } = req.body;

    // Handle both new format (firstName/lastName) and old format (name) for backward compatibility
    let fName, lName;
    if (firstName && lastName) {
      fName = firstName;
      lName = lastName;
    } else if (name) {
      // Split full name into first and last name
      const nameParts = name.trim().split(" ");
      fName = nameParts[0];
      lName = nameParts.slice(1).join(" ") || "Unknown";
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: firstName and lastName (or name), phone, source, or interest",
      });
    }

    // Validate required fields
    if (!fName || !phone || !source || !interest) {
      console.log("❌ Missing required fields:", {
        firstName: !!fName,
        phone: !!phone,
        source: !!source,
        interest: !!interest,
      });
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: firstName, lastName, phone, source, or interest",
      });
    }

    // Validate phone format
    if (!/^\d{10}$/.test(phone)) {
      console.log("❌ Invalid phone format:", phone);
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    // Check for duplicate phone
    const existingEnquiry = await Enquiry.findOne({ phone });
    if (existingEnquiry) {
      console.log("❌ Duplicate phone number:", phone);
      return res.status(400).json({
        success: false,
        message: "Enquiry with this phone number already exists",
      });
    }

    const enquiry = new Enquiry({
      firstName: fName.trim(),
      lastName: lName.trim(),
      phone,
      email: email && email.trim() ? email.toLowerCase().trim() : undefined,
      source,
      interest,
      address: address ? address.trim() : undefined,
      location: location ? location.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      createdBy: req.user.id,
    });

    console.log("💾 Saving enquiry:", enquiry);
    await enquiry.save();
    // Increment global lead counter (non-blocking)
    try {
      await Counter.findOneAndUpdate(
        { key: "lead" },
        { $inc: { seq: 1 }, $set: { updated_at: new Date() } },
        { new: true, upsert: true },
      );
    } catch (e) {
      console.error("Failed to increment lead counter:", e);
    }
    console.log("✅ Enquiry created successfully:", enquiry._id);

    res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: enquiry,
    });
  } catch (err) {
    console.error("💥 Create enquiry error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update enquiry
app.put("/api/enquiries/:id", verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate phone if provided
    if (updates.phone && !/^\d{10}$/.test(updates.phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    // Check for duplicate phone (exclude current enquiry)
    if (updates.phone) {
      const existingEnquiry = await Enquiry.findOne({
        phone: updates.phone,
        _id: { $ne: id },
      });
      if (existingEnquiry) {
        return res.status(400).json({
          success: false,
          message: "Another enquiry with this phone number already exists",
        });
      }
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true },
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Enquiry updated successfully",
      data: enquiry,
    });
  } catch (err) {
    console.error("Update enquiry error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete enquiry
app.delete("/api/enquiries/:id", verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (err) {
    console.error("Delete enquiry error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update enquiry status
app.patch("/api/enquiries/:id/status", verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo } = req.body;

    const updates = {
      status,
      updatedAt: Date.now(),
    };

    if (assignedTo) updates.assignedTo = assignedTo;
    if (notes) updates.notes = notes;

    // Update last contacted if moving to contacted status
    if (["contacted", "interested", "not_interested"].includes(status)) {
      updates.lastContactedAt = Date.now();
    }

    // Set conversion date if enrolled
    if (status === "enrolled") {
      updates.convertedDate = Date.now();
    }

    const enquiry = await Enquiry.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // Recalculate lead score
    enquiry.calculateLeadScore();
    await enquiry.save();

    res.json({
      success: true,
      message: "Enquiry status updated successfully",
      data: enquiry,
    });
  } catch (err) {
    console.error("Update enquiry status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add contact attempt
app.post("/api/enquiries/:id/contact", verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { method, response, notes, nextFollowUp } = req.body;

    const enquiry = await Enquiry.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const contactAttempt = {
      date: Date.now(),
      method,
      response,
      notes,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
    };

    enquiry.contactAttempts.push(contactAttempt);
    enquiry.lastContactedAt = Date.now();

    if (nextFollowUp) {
      enquiry.nextFollowUpDate = new Date(nextFollowUp);
    }

    // Recalculate lead score based on contact attempt
    enquiry.calculateLeadScore();

    await enquiry.save();

    res.json({
      success: true,
      message: "Contact attempt recorded successfully",
      data: enquiry,
    });
  } catch (err) {
    console.error("Add contact attempt error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk upload enquiries
app.post(
  "/api/enquiries/bulk-upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("📤 Enquiry bulk upload started by user:", req.user?.id);
      console.log("📤 Request headers:", {
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"],
        authorization: req.headers["authorization"] ? "Present" : "None",
      });

      if (!req.file) {
        console.log("❌ No file uploaded - req.file is:", req.file);
        console.log("❌ Request body:", req.body);
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log(
        "📄 File received:",
        req.file.originalname,
        "- Size:",
        req.file.size,
        "bytes",
      );

      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet =
        workbook.getWorksheet("Enquiries") || workbook.getWorksheet(1);
      if (!worksheet) {
        console.log("❌ No worksheet found");
        return res.status(400).json({
          success: false,
          message: "No valid worksheet found in file",
        });
      }

      const data = [];
      const errors = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header
          // Column mapping: Sr no | First name | Last name | Phone | Email | Source | Interest | Address | Location
          const srNo = row.getCell(1).value;
          const firstName = row.getCell(2).value;
          const lastName = row.getCell(3).value;
          const phone = row.getCell(4).value;
          const email = row.getCell(5).value;
          const source = row.getCell(6).value;
          const interest = row.getCell(7).value;
          const address = row.getCell(8).value;
          const location = row.getCell(9).value;

          // Validate required fields
          if (!firstName || !lastName || !phone || !source || !interest) {
            errors.push({
              row: rowNumber,
              error:
                "Missing required fields: firstName, lastName, phone, source, or interest",
            });
            return;
          }

          // Validate phone format
          const phoneStr = String(phone).replace(/\D/g, "");
          if (phoneStr.length !== 10) {
            errors.push({
              row: rowNumber,
              error: "Phone number must be 10 digits",
            });
            return;
          }

          data.push({
            rowNumber,
            srNo: srNo ? parseInt(String(srNo)) : undefined,
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            phone: phoneStr,
            email: email ? String(email).toLowerCase().trim() : undefined,
            source: String(source).trim(),
            interest: String(interest).trim(),
            address: address ? String(address).trim() : undefined,
            location: location ? String(location).trim() : undefined,
          });
        }
      });

      console.log(`📊 Parsed ${data.length} rows, ${errors.length} errors`);

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid data found in file",
          results: { success: [], failed: errors, total: 0 },
        });
      }

      // Check for duplicate phone numbers within the uploaded file
      const phoneMap = new Map();
      const internalDuplicates = [];

      data.forEach((item, index) => {
        if (phoneMap.has(item.phone)) {
          internalDuplicates.push({
            ...item,
            error: `Duplicate phone number within file (also found at row ${phoneMap.get(
              item.phone,
            )})`,
          });
          // Also mark the first occurrence as duplicate
          const firstOccurrenceIndex = phoneMap.get(item.phone) - 2; // -2 because phoneMap stores rowNumber which is 1-based and skips header
          if (firstOccurrenceIndex >= 0) {
            const firstItem = data[firstOccurrenceIndex];
            if (
              firstItem &&
              !internalDuplicates.find(
                (d) => d.rowNumber === firstItem.rowNumber,
              )
            ) {
              internalDuplicates.push({
                ...firstItem,
                error: `Duplicate phone number within file (also found at row ${item.rowNumber})`,
              });
            }
          }
        } else {
          phoneMap.set(item.phone, item.rowNumber);
        }
      });

      if (internalDuplicates.length > 0) {
        console.log(
          `❌ Found ${internalDuplicates.length} internal duplicates`,
        );
        return res.status(400).json({
          success: false,
          message: `File contains ${internalDuplicates.length} duplicate phone numbers. Please remove duplicates and try again.`,
          results: {
            success: [],
            failed: [...errors, ...internalDuplicates],
            total: 0,
            duplicatesCount: internalDuplicates.length,
          },
        });
      }

      // Check for existing phone numbers in database
      const existingPhones = await Enquiry.find({
        phone: { $in: data.map((item) => item.phone) },
      })
        .select("phone")
        .lean();

      const existingPhoneSet = new Set(existingPhones.map((e) => e.phone));
      const databaseDuplicates = [];

      data.forEach((item) => {
        if (existingPhoneSet.has(item.phone)) {
          databaseDuplicates.push({
            ...item,
            error: "Phone number already exists in database",
          });
        }
      });

      if (databaseDuplicates.length > 0) {
        console.log(
          `❌ Found ${databaseDuplicates.length} database duplicates`,
        );
        return res.status(400).json({
          success: false,
          message: `File contains ${databaseDuplicates.length} phone numbers that already exist in database. Please remove them and try again.`,
          results: {
            success: [],
            failed: [...errors, ...databaseDuplicates],
            total: 0,
            duplicatesCount: databaseDuplicates.length,
          },
        });
      }

      const successfulEnquiries = [];
      const failedEnquiries = [];

      // Process each enquiry (duplicates already checked)
      for (const item of data) {
        try {
          // Validate source and interest values
          const validSources = [
            "Website",
            "Facebook",
            "Google Ads",
            "Referral",
            "Walk-in",
            "Phone Call",
          ];
          const validInterests = [
            "Full Stack",
            "Data Science",
            "Digital Marketing",
            "UI/UX",
            "Python",
            "Java",
          ];

          if (!validSources.includes(item.source)) {
            failedEnquiries.push({
              ...item,
              error: `Invalid source. Must be one of: ${validSources.join(
                ", ",
              )}`,
            });
            continue;
          }

          if (!validInterests.includes(item.interest)) {
            failedEnquiries.push({
              ...item,
              error: `Invalid interest. Must be one of: ${validInterests.join(
                ", ",
              )}`,
            });
            continue;
          }

          const enquiry = new Enquiry({
            srNo: item.srNo,
            firstName: item.firstName,
            lastName: item.lastName,
            phone: item.phone,
            email: item.email,
            source: item.source,
            interest: item.interest,
            address: item.address,
            location: item.location,
            status: "raw",
            createdBy: req.user.id,
          });

          await enquiry.save();
          console.log(
            `✅ Saved enquiry: ${enquiry.firstName} ${enquiry.lastName} - ${enquiry.phone}`,
          );
          successfulEnquiries.push(enquiry);
        } catch (error) {
          console.error(`❌ Row ${item.rowNumber} failed:`, error.message);
          failedEnquiries.push({
            ...item,
            error: error.message,
          });
        }
      }

      console.log(
        `✅ Successfully processed ${successfulEnquiries.length} enquiries`,
      );
      console.log(`❌ Failed to process ${failedEnquiries.length} enquiries`);

      res.json({
        success: true,
        message: `${successfulEnquiries.length} enquiries uploaded successfully`,
        results: {
          success: successfulEnquiries,
          failed: failedEnquiries.concat(errors),
          total: successfulEnquiries.length + failedEnquiries.length,
        },
      });
    } catch (err) {
      console.error("💥 Enquiry bulk upload error:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        results: { success: [], failed: [], total: 0 },
      });
    }
  },
);

// Get enquiry analytics
app.get("/api/enquiries/analytics", verifyAuth, async (req, res) => {
  try {
    const totalEnquiries = await Enquiry.countDocuments();

    const statusCounts = await Enquiry.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const sourceCounts = await Enquiry.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);

    const interestCounts = await Enquiry.aggregate([
      { $group: { _id: "$interest", count: { $sum: 1 } } },
    ]);

    // Conversion rate
    const convertedCount = await Enquiry.countDocuments({ status: "enrolled" });
    const conversionRate =
      totalEnquiries > 0 ? (convertedCount / totalEnquiries) * 100 : 0;

    // Monthly trends
    const monthlyTrends = await Enquiry.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    res.json({
      success: true,
      data: {
        total: totalEnquiries,
        conversionRate: Math.round(conversionRate * 100) / 100,
        converted: convertedCount,
        byStatus: statusCounts,
        bySource: sourceCounts,
        byInterest: interestCounts,
        monthlyTrends,
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check for bulk upload endpoint
app.get("/api/enquiries/bulk-upload/health", verifyAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Bulk upload endpoint is accessible",
      user: req.user?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Bulk upload health check error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get count for each status - for tab badges
app.get("/api/enquiries/counts", verifyAuth, async (req, res) => {
  try {
    console.log("📊 Fetching enquiry counts...");

    const [
      rawCount,
      coldLeadCount,
      warmLeadCount,
      hotLeadCount,
      contactedCount,
      interestedCount,
      notInterestedCount,
      enrolledCount,
      lostCount,
    ] = await Promise.all([
      Enquiry.countDocuments({ status: "raw" }),
      Enquiry.countDocuments({ status: "cold_lead" }),
      Enquiry.countDocuments({ status: "warm_lead" }),
      Enquiry.countDocuments({ status: "hot_lead" }),
      Enquiry.countDocuments({ status: "contacted" }),
      Enquiry.countDocuments({ status: "interested" }),
      Enquiry.countDocuments({ status: "not_interested" }),
      Enquiry.countDocuments({ status: "enrolled" }),
      Enquiry.countDocuments({ status: "lost" }),
    ]);

    const countsData = {
      raw: rawCount,
      cold_lead: coldLeadCount,
      warm_lead: warmLeadCount,
      hot_lead: hotLeadCount,
      contacted: contactedCount,
      interested: interestedCount,
      not_interested: notInterestedCount,
      enrolled: enrolledCount,
      lost: lostCount,
    };

    console.log("📊 Counts result:", countsData);

    res.json({
      success: true,
      data: countsData,
    });
  } catch (err) {
    console.error("❌ Counts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

import attendanceSync from "./services/attendanceSync.js";

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
// Attempt DB connection then start server regardless (continues on failure)
connectDB()
  .catch((err) => {
    console.warn("⚠️ DB connection error:", err?.message || err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    attendanceSync
      .initialize()
      .then(() => {
        console.log("✅ Attendance sync initialized");
        attendanceSync.startSync();
      })
      .catch((err) => {
        console.error("❌ Failed to start attendance sync:", err);
      });
  });
