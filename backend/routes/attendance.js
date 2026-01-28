import express from "express";
import * as attendanceController from "../controllers/attendanceController.js";
import { verifyAuth } from "../middlewares/jwtAuth.js";
import {
  verifyStudentSelfAccess,
  verifyAttendanceStatsAccess,
  verifyTeacherBatchAccess,
} from "../middlewares/dataLevelAuth.js";

const router = express.Router();

// All attendance routes require authentication
router.use(verifyAuth);

// GET attendance with data-level filtering
router.get("/", attendanceController.getAttendance);

// Mark attendance with data-level verification
router.post("/manual", attendanceController.markManualAttendance);
router.post("/mark", attendanceController.markManualAttendance); // Alias for frontend

// Get stats with data-level filtering
router.get("/stats", attendanceController.getAttendanceStats);

// Get user stats with data-level verification
router.get(
  "/user/:userId/stats",
  verifyAttendanceStatsAccess("userId"),
  attendanceController.getUserAttendanceStats
);

// Export attendance with data-level filtering
router.get("/export", attendanceController.exportAttendance);

// Device sync
router.post("/device-sync", attendanceController.triggerDeviceSync);
router.post("/sync", attendanceController.triggerDeviceSync); // Alias for frontend

// Update/Delete with data-level verification
router.put("/:id", attendanceController.updateAttendance);
router.delete("/:id", attendanceController.deleteAttendance);

export default router;
