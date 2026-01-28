import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";

const router = express.Router();

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

// Debug endpoint (remove after troubleshooting)
router.get("/bootstrap-debug", (req, res) => {
  const headerToken =
    req.get("X-Bootstrap-Token") ||
    req.get("x-bootstrap-token") ||
    req.header("x-bootstrap-token");
  const envToken = (process.env.BOOTSTRAP_TOKEN || "").trim();
  const clientToken = (headerToken || "").trim();

  return res.json({
    envPresent: !!envToken,
    envLen: envToken.length,
    envHashPrefix: envToken ? sha256Hex(envToken).slice(0, 12) : null,
    headerPresent: !!clientToken,
    headerLen: clientToken.length,
    headerHashPrefix: clientToken ? sha256Hex(clientToken).slice(0, 12) : null,
    note: "Lengths and hash prefixes only; values must match for success.",
  });
});

/**
 * One-time route to create FIRST SuperAdmin.
 * Header required: X-Bootstrap-Token === process.env.BOOTSTRAP_TOKEN
 * Remove this file and its mount after use.
 */
router.post("/bootstrap-superadmin", async (req, res) => {
  try {
    const headerToken =
      req.get("X-Bootstrap-Token") ||
      req.get("x-bootstrap-token") ||
      req.header("x-bootstrap-token");
    const envToken = (process.env.BOOTSTRAP_TOKEN || "").trim();
    const clientToken = (headerToken || "").trim();

    if (!envToken) {
      return res
        .status(500)
        .json({
          error: "Server bootstrap token missing (BOOTSTRAP_TOKEN not set)",
        });
    }
    if (!clientToken) {
      return res
        .status(400)
        .json({ error: "Missing X-Bootstrap-Token header" });
    }
    if (clientToken !== envToken) {
      return res.status(401).json({ error: "Invalid bootstrap token" });
    }

    const existing = await User.findOne({
      $or: [{ role: "SuperAdmin" }, { role_id: "super_admin" }],
    }).lean();
    if (existing) {
      return res.status(409).json({ error: "SuperAdmin already exists" });
    }

    const { email, password, f_name, l_name, phone } = req.body || {};
    if (!email || !password || !phone) {
      return res
        .status(400)
        .json({ error: "Missing email, password, or phone" });
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      f_name: (f_name || "Super").trim(),
      l_name: (l_name || "Admin").trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: "SuperAdmin",
      role_id: "admin", // map to existing enum to satisfy schema
      status: true,
      password_hash: hash, // schema field
    });

    return res.status(201).json({
      success: true,
      id: String(user._id),
      email: user.email,
      role: user.role,
      note: "Delete this route and BOOTSTRAP_TOKEN after use.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Bootstrap failed", details: err?.message });
  }
});

export default router;
