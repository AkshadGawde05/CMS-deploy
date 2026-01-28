import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Parent from "../models/Parent.js";
import RefreshToken from "../models/RefreshToken.js";
import Otp from "../models/Otp.js";

// Helpers
function parseDuration(input, fallbackMs) {
  if (!input) return fallbackMs;
  const m = String(input)
    .trim()
    .match(/^(\d+)([smhd])$/i);
  if (!m) return fallbackMs;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult =
    unit === "s"
      ? 1000
      : unit === "m"
      ? 60 * 1000
      : unit === "h"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
  return n * mult;
}

function mapLegacyRole(role_id) {
  switch (role_id) {
    case "admin":
      return "Admin";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    default:
      return undefined;
  }
}

const ACCESS_TTL_MS = parseDuration(
  process.env.ACCESS_TOKEN_TTL || "15m",
  15 * 60 * 1000
);
const REFRESH_TTL_MS = parseDuration(
  process.env.REFRESH_TOKEN_TTL || "30d",
  30 * 24 * 60 * 60 * 1000
);

const baseCookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function setAuthCookies(
  res,
  { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt }
) {
  res.cookie("access_token", accessToken, {
    ...baseCookieOpts,
    expires: new Date(accessExpiresAt),
  });
  if (refreshToken) {
    res.cookie("refresh_token", refreshToken, {
      ...baseCookieOpts,
      // optional: scope refresh cookie to /auth/refresh
      // path: "/auth/refresh",
      expires: new Date(refreshExpiresAt),
    });
  }
}

function clearAuthCookies(res) {
  res.clearCookie("access_token", { ...baseCookieOpts });
  res.clearCookie("refresh_token", { ...baseCookieOpts });
}

function createAccessToken({ userId, role }) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(ACCESS_TTL_MS / 1000);
  const token = jwt.sign(
    { sub: userId, role, iat: now, exp },
    process.env.JWT_SECRET
  );
  return { token, expMs: exp * 1000 };
}

function createRefreshToken() {
  const raw = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expMs = Date.now() + REFRESH_TTL_MS;
  return { raw, tokenHash, expMs };
}

// OTP configuration & helpers
const OTP_TTL_MS = parseDuration(process.env.OTP_TTL || "5m", 5 * 60 * 1000);
const OTP_MAX_PER_HOUR = parseInt(process.env.OTP_MAX_PER_HOUR || "5", 10);
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);

function generateOtpCode() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function sendOtpToPhone(phone, code) {
  // Development-only: log OTP. Replace with provider integration (Twilio, etc.)
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP] DEV OTP for ${phone}: ${code}`);
  }
  return true;
}

// Helper function to get linked students for a parent user
async function getLinkedStudents(userId, role) {
  if (role !== "Parent") {
    // Non-parents might have linkedStudents from User model (for future use)
    return [];
  }
  
  // For parents, fetch from Parent model
  const parentRecords = await Parent.find({ user_id: userId })
    .select("student_id")
    .lean();
  
  return parentRecords.map(p => String(p.student_id));
}


export async function login(req, res) {
  try {
    // Accept multiple identifiers for flexibility with existing frontend code.
    const { emailOrPhone, email, phone, password } = req.body || {};
    const identifier = (emailOrPhone || email || phone || "").trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // Lookup by email OR phone.
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
    if (!user) {
      if (process.env.NODE_ENV === "development") {
        return res
          .status(401)
          .json({ error: "Invalid credentials", reason: "user_not_found" });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      if (process.env.NODE_ENV === "development") {
        return res
          .status(401)
          .json({ error: "Invalid credentials", reason: "password_mismatch" });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const normalizedRole =
      user.role || mapLegacyRole(user.role_id) || "Student";

    // Issue access token
    const { token: accessToken, expMs: accessExpiresAt } = createAccessToken({
      userId: String(user._id),
      role: normalizedRole,
    });

    // Issue refresh token (rotation model)
    const {
      raw: refreshRaw,
      tokenHash,
      expMs: refreshExpiresAt,
    } = createRefreshToken();
    const device = req.headers["user-agent"] || "unknown";
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      device,
      expiresAt: new Date(refreshExpiresAt),
    });

    setAuthCookies(res, {
      accessToken,
      refreshToken: refreshRaw,
      accessExpiresAt,
      refreshExpiresAt,
    });

    // Get linked students for parent users
    const linkedStudents = await getLinkedStudents(String(user._id), normalizedRole);

    const snapshot = {
      id: String(user._id),
      name: `${user.fname || ""} ${user.lname || ""}`.trim(),
      email: user.email,
      role: normalizedRole,
      linkedStudents,
    };

    return res.status(200).json({ success: true, user: snapshot });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Login failed", details: err?.message });
  }
}

export async function requestOtp(req, res) {
  try {
    const { phone: rawPhone } = req.body || {};
    const phone = (rawPhone || "").toString().trim();
    if (!phone) return res.status(400).json({ error: "Missing phone number" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Rate limit per phone
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await Otp.countDocuments({ phone, createdAt: { $gte: hourAgo } });
    if (recent >= OTP_MAX_PER_HOUR) {
      return res.status(429).json({ error: "Too many OTP requests. Try again later" });
    }

    // create OTP
    const code = generateOtpCode();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await Otp.create({ phone, codeHash, expiresAt, device: req.headers["user-agent"] || "unknown", ip: req.ip });
    await sendOtpToPhone(phone, code);
    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({ error: "Failed to request OTP", details: err?.message });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { phone: rawPhone, otp } = req.body || {};
    const phone = (rawPhone || "").toString().trim();
    if (!phone || !otp) return res.status(400).json({ error: "Missing phone or otp" });

    // find latest valid OTP
    const rec = await Otp.findOne({ phone, used: { $ne: true }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!rec) return res.status(401).json({ error: "OTP not found or expired" });

    const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hash !== rec.codeHash) {
      rec.attempts = (rec.attempts || 0) + 1;
      await rec.save();
      return res.status(401).json({ error: "Invalid OTP" });
    }

    // mark used
    rec.used = true;
    rec.lastUsedAt = new Date();
    await rec.save();

    // find user
    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ error: "User not found" });

    const normalizedRole = user.role || mapLegacyRole(user.role_id) || "Student";

    // Issue access token
    const { token: accessToken, expMs: accessExpiresAt } = createAccessToken({
      userId: String(user._id),
      role: normalizedRole,
    });

    // Issue refresh token (rotation model)
    const { raw: refreshRaw, tokenHash, expMs: refreshExpiresAt } = createRefreshToken();
    const device = req.headers["user-agent"] || "unknown";
    await RefreshToken.create({ userId: user._id, tokenHash, device, expiresAt: new Date(refreshExpiresAt) });

    setAuthCookies(res, { accessToken, refreshToken: refreshRaw, accessExpiresAt, refreshExpiresAt });

    // Get linked students for parent users
    const linkedStudents = await getLinkedStudents(String(user._id), normalizedRole);

    const snapshot = {
      id: String(user._id),
      name: `${user.fname || ""} ${user.lname || ""}`.trim(),
      email: user.email,
      role: normalizedRole,
      linkedStudents,
    };
    return res.status(200).json({ success: true, user: snapshot });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ error: "Failed to verify OTP", details: err?.message });
  }
}

export async function refresh(req, res) {
  try {
    const refreshRaw = req.cookies?.refresh_token;
    if (!refreshRaw) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Missing refresh token" });
    }
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshRaw)
      .digest("hex");

    // Find record regardless of revoked to detect reuse
    const recAny = await RefreshToken.findOne({ tokenHash });
    if (!recAny) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    // If token was revoked, consider reuse attack: revoke all tokens for this user
    if (recAny.revoked || recAny.expiresAt <= new Date()) {
      try {
        await RefreshToken.updateMany(
          { userId: recAny.userId, revoked: { $ne: true } },
          { $set: { revoked: true, revokedAt: new Date() } }
        );
      } catch {}
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token reuse detected" });
    }

    const rec = recAny; // valid and not revoked

    const user = await User.findById(rec.userId).select("role role_id");
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "User not found" });
    }

    const normalizedRole =
      user.role || mapLegacyRole(user.role_id) || "Student";

    // Issue new access token
    const { token: accessToken, expMs: accessExpiresAt } = createAccessToken({
      userId: String(user._id),
      role: normalizedRole,
    });

    // Rotation: create new refresh token and revoke old
    const {
      raw: newRaw,
      tokenHash: newHash,
      expMs: newExp,
    } = createRefreshToken();
    await RefreshToken.updateOne(
      { _id: rec._id },
      { $set: { revoked: true, revokedAt: new Date(), lastUsedAt: new Date() } }
    );
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      device: rec.device,
      expiresAt: new Date(newExp),
      lastUsedAt: new Date(),
    });
    setAuthCookies(res, {
      accessToken,
      refreshToken: newRaw,
      accessExpiresAt,
      refreshExpiresAt: newExp,
    });

    return res.status(200).json({ success: true, rotated: true });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Refresh failed", details: err?.message });
  }
}

export async function logout(req, res) {
  try {
    const refreshRaw = req.cookies?.refresh_token;
    if (refreshRaw) {
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshRaw)
        .digest("hex");
      await RefreshToken.updateOne(
        { tokenHash },
        { $set: { revoked: true, revokedAt: new Date() } }
      );
    }

    clearAuthCookies(res);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Logout failed", details: err?.message });
  }
}

// Sessions management for current user
export async function listSessions(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const sessions = await RefreshToken.find({
      userId,
      revoked: { $ne: true },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("_id device createdAt lastUsedAt expiresAt");
    return res.json({ success: true, sessions });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to list sessions", details: err?.message });
  }
}

export async function revokeSession(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    if (!id) return res.status(400).json({ error: "Missing session id" });
    const updated = await RefreshToken.updateOne(
      { _id: id, userId },
      { $set: { revoked: true, revokedAt: new Date() } }
    );
    if (updated.matchedCount === 0)
      return res.status(404).json({ error: "Session not found" });
    return res.json({ success: true });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to revoke session", details: err?.message });
  }
}

export default { login, refresh, logout, requestOtp, verifyOtp };
