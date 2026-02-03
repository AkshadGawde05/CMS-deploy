import express from "express";
import {
  getSyllabus,
  getSyllabusById,
  createSyllabus,
  updateSyllabus,
  addSyllabusItem,
  updateSyllabusItem,
  deleteSyllabusItem,
  deleteSyllabus,
  getSyllabusTemplate,
  bulkUploadSyllabi,
} from "../controllers/syllabusController.js";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";
import {
  verifyTeacherBatchAccess,
} from "../middlewares/dataLevelAuth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// All syllabus routes require authentication
router.use(verifyAuth);

// Get template (requires admin/superadmin) - MUST BE BEFORE /:id
router.get("/template", verifyRole(["Admin", "SuperAdmin"]), getSyllabusTemplate);

// Bulk upload syllabi (requires admin/superadmin)
router.post("/bulk-upload", verifyRole(["Admin", "SuperAdmin"]), upload.single("file"), bulkUploadSyllabi);

// Get syllabus (with optional filters for batch_id and academic_year, data-level filtered by controller)
router.get("/", getSyllabus);

// Get single syllabus by ID (data-level filtered by controller)
router.get("/:id", getSyllabusById);

// Create new syllabus (requires admin/superadmin)
router.post("/", verifyRole(["Admin", "SuperAdmin"]), createSyllabus);

// Update syllabus (requires admin/superadmin)
router.put("/:id", verifyRole(["Admin", "SuperAdmin"]), updateSyllabus);

// Add item to syllabus (requires admin/superadmin)
router.post("/:id/items", verifyRole(["Admin", "SuperAdmin"]), addSyllabusItem);

// Update specific item in syllabus (requires admin/superadmin)
router.put(
  "/:id/items/:itemId",
  verifyRole(["Admin", "SuperAdmin"]),
  updateSyllabusItem
);

// Delete specific item from syllabus (requires admin/superadmin)
router.delete(
  "/:id/items/:itemId",
  verifyRole(["Admin", "SuperAdmin"]),
  deleteSyllabusItem
);

// Delete entire syllabus (requires admin/superadmin)
router.delete("/:id", verifyRole(["Admin", "SuperAdmin"]), deleteSyllabus);

export default router;
