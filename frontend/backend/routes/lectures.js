import express from "express";
import {
  getLectures,
  getArchivedLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture,
  archiveLecture,
  restoreLecture,
  getTopicsByCourseAndSubject,
  getSubtopicsByTopic,
  getSubjectsByCourse,
} from "../controllers/lecturesController.js";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";
import { verifyPermission } from "../middlewares/permissionAuth.js";
import {
  verifyTeacherBatchAccess,
} from "../middlewares/dataLevelAuth.js";

const router = express.Router();

// Get all lectures (active) - with data-level filtering by role
router.get(
  "/",
  verifyAuth,
  verifyRole(["Admin", "Teacher", "Student", "Parent"]),
  getLectures
);

// Get archived lectures with data-level filtering
router.get(
  "/archived",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canViewBatches"]),
  getArchivedLectures
);

// Get lecture by ID - with data-level filtering
// Get unique subjects by course
router.get(
  "/subjects/:courseId",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  getSubjectsByCourse
);

// Get unique topics by course and subject
router.get(
  "/topics",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  getTopicsByCourseAndSubject
);

// Get unique subtopics by course, subject, and topic
router.get(
  "/subtopics",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  getSubtopicsByTopic
);

// Get lecture by ID - No permission required as students/parents need to view lecture details
router.get(
  "/:id",
  verifyAuth,
  verifyRole(["Admin", "Teacher", "Student", "Parent"]),
  getLectureById
);

// Create new lecture
router.post(
  "/",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canEditBatches"]),
  createLecture
);

// Update lecture
router.put(
  "/:id",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canEditBatches"]),
  updateLecture
);

// Archive lecture
router.patch(
  "/:id/archive",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canEditBatches"]),
  archiveLecture
);

// Restore lecture
router.patch(
  "/:id/restore",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canEditBatches"]),
  restoreLecture
);

// Delete lecture
router.delete(
  "/:id",
  verifyAuth,
  verifyRole(["Admin", "Teacher"]),
  verifyPermission(["canEditBatches"]),
  deleteLecture
);

export default router;
