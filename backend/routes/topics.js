import express from "express";
import {
  getAllTopics,
  getTopicsByCourseAndSubject,
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicsByCourse,
} from "../controllers/topicsController.js";
import { authenticateToken } from "../middlewares/jwtAuth.js";
import { checkPermission } from "../middlewares/permissionAuth.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all topics
router.get("/", checkPermission("topics", "read"), getAllTopics);

// Get topics by course and subject (used by frontend dropdown)
router.get("/course/:courseId/subject/:subject", checkPermission("topics", "read"), getTopicsByCourseAndSubject);

// Get topics by course
router.get("/course/:courseId", checkPermission("topics", "read"), getTopicsByCourse);

// Create a new topic
router.post("/", checkPermission("topics", "create"), createTopic);

// Update a topic
router.put("/:id", checkPermission("topics", "update"), updateTopic);

// Delete a topic
router.delete("/:id", checkPermission("topics", "delete"), deleteTopic);

export default router;
