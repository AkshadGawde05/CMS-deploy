import express from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, logout, listSessions, revokeSession, requestOtp, verifyOtp } from "../controllers/authController.js";
import { verifyAuth } from "../middlewares/jwtAuth.js";

const router = express.Router();

// Basic rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
});

router.post("/login", authLimiter, login);
router.post("/request-otp", authLimiter, requestOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", authLimiter, logout);

// Sessions (current user)
router.get("/sessions", verifyAuth, listSessions);
router.delete("/sessions/:id", verifyAuth, revokeSession);

export default router;
