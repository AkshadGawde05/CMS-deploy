/**
 * Dashboard Routes
 * Role-based dashboard endpoints with data-level authorization
 */

import express from "express";
import {
  getStudentDashboard,
  getTeacherDashboard,
  getParentDashboard,
} from "../controllers/dashboardController.js";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(verifyAuth);

/**
 * Student Dashboard
 * GET /api/dashboard/student
 * Returns: Student's attendance, batch info, syllabus, lectures
 */
router.get(
  "/student",
  verifyRole(["Student"]),
  getStudentDashboard
);

/**
 * Teacher Dashboard
 * GET /api/dashboard/teacher
 * Returns: Assigned batches, students, attendance stats, syllabus completion
 */
router.get(
  "/teacher",
  verifyRole(["Teacher"]),
  getTeacherDashboard
);

/**
 * Parent Dashboard
 * GET /api/dashboard/parent
 * Returns: Linked children, their attendance, batch info, academic progress
 */
router.get(
  "/parent",
  verifyRole(["Parent"]),
  getParentDashboard
);

export default router;
