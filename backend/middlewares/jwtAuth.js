import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser"; // for reference: app must use cookie-parser
import User from "../models/User.js";
import Parent from "../models/Parent.js";
import accessConfig from "../config/accessConfig.js";
import RolePermissions from "../models/RolePermissions.js";
import { getDefaultPermissions } from "../models/User.js";

// Helper to normalize role from legacy role_id
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

// Verify access token from httpOnly cookie and populate req.user
export async function verifyAuth(req, res, next) {
  try {
    console.log("🔐 JWT Auth - Verifying request to:", req.method, req.path);
    console.log("🔐 JWT Auth - Cookies received:", req.cookies);

    // Try to get token from cookies first, then from Authorization header
    let token = req.cookies?.access_token;

    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log("🔐 JWT Auth - Token found in Authorization header");
      }
    }

    console.log("🔐 JWT Auth - Access token found:", !!token);

    if (!token) {
      console.log("❌ JWT Auth - No access token in cookies or headers");
      return res
        .status(401)
        .json({ error: "Not authenticated - No token found" });
    }

    console.log(
      "JWT Auth - Verifying token with secret:",
      !!process.env.JWT_SECRET,
    );
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Minimal claims expected: { sub, role, iat, exp }
    const userId = payload?.sub;
    const roleFromToken = payload?.role;

    if (!userId) {
      console.log("❌ JWT Auth - Invalid token: no userId");
      return res.status(401).json({ error: "Invalid token" });
    }

    // For general routes we may not need DB fetch, but we read minimal profile for /api/me
    const user = await User.findById(userId).lean();
    if (!user) {
      console.log("❌ JWT Auth - User not found in database");
      return res.status(401).json({ error: "User not found" });
    }

    const normalizedRole =
      user.role || roleFromToken || mapLegacyRole(user.roleid);

    console.log(
      "✅ JWT Auth - User authenticated:",
      user.email,
      "Role:",
      normalizedRole,
    );

    // Fetch role-based permissions
    let permissions = {};
    if (normalizedRole === "SuperAdmin") {
      permissions = getDefaultPermissions("SuperAdmin"); // All true
    } else {
      const rolePermissions = await RolePermissions.findOne({
        role: normalizedRole,
      });
      if (rolePermissions) {
        permissions = rolePermissions.permissions || {};
      } else {
        // Fallback to defaults if not found
        permissions = getDefaultPermissions(normalizedRole || "Student");
      }
    }

    // Get linked students for parent users
    let linkedStudents = [];
    if (normalizedRole === "Parent") {
      const parentRecords = await Parent.find({ user_id: userId })
        .select("student_id")
        .lean();
      linkedStudents = parentRecords.map(p => String(p.student_id));
    }

    req.user = {
      id: String(user._id),
      name: `${user.f_name || user.fname || ""} ${user.l_name || user.lname || ""}`.trim(),
      email: user.email,
      role: normalizedRole,
      linkedStudents,
      permissions,
      // Multi-branch support
      branches: user.branches || [],
      primaryBranch: user.primaryBranch || null,
      isSuperAdmin: normalizedRole === "SuperAdmin" || normalizedRole === "Admin",
    };

    return next();
  } catch (err) {
    console.log("❌ JWT Auth - Error:", err.name, err.message);
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired" });
    }
    return res
      .status(401)
      .json({ error: "Invalid token", details: err?.message });
  }
}

// Role-based access control middleware
export function verifyRole(allowedRoles = []) {
  return function (req, res, next) {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Not authenticated" });

    const cfg = accessConfig[role];
    if (cfg?.all) return next();

    if (allowedRoles.includes("ALL")) return next();
    if (allowedRoles.includes(role)) return next();

    return res.status(403).json({ error: "Access Denied" });
  };
}

// Parent-to-student access guard
export function verifyParentHasAccess(studentIdParam = "studentId") {
  return function (req, res, next) {
    const role = req.user?.role;
    const studentId =
      req.params?.[studentIdParam] || req.query?.[studentIdParam];

    if (!studentId) return res.status(400).json({ error: "Missing studentId" });

    if (role === "Admin" || role === "SuperAdmin") return next();

    if (role !== "Parent") return next();

    const linked = (req.user?.linkedStudents || []).map(String);
    if (linked.includes(String(studentId))) return next();

    return res
      .status(403)
      .json({ error: "Access Denied: parent not linked to student" });
  };
}

// TODO: If later switching to Authorization header based tokens, accept Bearer token here
// export function verifyAuthFromHeader(req, res, next) { /* parse req.headers.authorization */ }

export default { verifyAuth, verifyRole, verifyParentHasAccess };
