import express from "express";
import { verifyAuth } from "../middlewares/jwtAuth.js";

const router = express.Router();

// GET /api/me - Return current authenticated user snapshot
router.get("/me", verifyAuth, async (req, res) => {
  // verifyAuth populates req.user
  return res.json({ success: true, user: req.user });
});

export default router;
