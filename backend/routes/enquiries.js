import express from "express";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";
import { deleteAllEnquiries } from "../controllers/enquiryController.js";

const router = express.Router();

/**
 * DELETE /api/enquiries
 * Temporary development-only endpoint – remove before production
 * Deletes all enquiries from the collection
 * Protected: Admin and SuperAdmin only
 */
router.delete(
  "/enquiries",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  deleteAllEnquiries
);

export default router;
