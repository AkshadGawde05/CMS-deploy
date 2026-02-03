import express from "express";
import {
  verifyAuth,
  verifyRole,
  verifyParentHasAccess,
} from "../middlewares/jwtAuth.js";

const router = express.Router();

// Example protected routes demonstrating RBAC
router.get(
  "/admin/dashboard",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  (req, res) => {
    res.json({ success: true, message: "Admin dashboard data" });
  }
);

router.get(
  "/students/:studentId/reports",
  verifyAuth,
  verifyRole(["Student", "Teacher", "Admin", "SuperAdmin", "Parent"]),
  verifyParentHasAccess("studentId"),
  (req, res) => {
    res.json({ success: true, message: `Reports for ${req.params.studentId}` });
  }
);

export default router;
