import User from "../models/User.js";
import accessConfig from "../config/accessConfig.js";

// Session-based authentication middleware
export async function verifyAuth(req, res, next) {
  try {
    // If using JWT later, parse Authorization header here and set req.user
    // Session-based: expect req.session.userId set on login
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Optionally use a cached snapshot for non-sensitive lookups
    if (req.session.userSnapshot) {
      req.user = req.session.userSnapshot; // { id, name, email, role, linkedStudents? }
    }

    if (!req.user || !req.user.id) {
      const user = await User.findById(userId).lean();
      if (!user) return res.status(401).json({ error: "Session invalid" });
      const normalizedRole = user.role || mapLegacyRole(user.roleid);
      req.user = {
        id: String(user._id),
        name: `${user.f_name || user.fname || ""} ${user.l_name || user.lname || ""}`.trim(),
        email: user.email,
        role: normalizedRole,
        linkedStudents: user.linkedStudents?.map(String) || [],
      };
      req.session.userSnapshot = req.user; // refresh snapshot
    }

    return next();
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Auth check failed", details: err.message });
  }
}

// Factory middleware to verify role authorization
export function verifyRole(allowedRoles = []) {
  return function (req, res, next) {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Not authenticated" });

    // Admins with all:true can access everything
    const cfg = accessConfig[role];
    if (cfg?.all) return next();

    if (allowedRoles.includes("ALL")) return next();

    if (allowedRoles.includes(role)) return next();

    return res.status(403).json({ error: "Access Denied" });
  };
}

// Parent-to-student access verification middleware
export function verifyParentHasAccess(studentIdParam = "studentId") {
  return function (req, res, next) {
    const role = req.user?.role;
    const studentId =
      req.params?.[studentIdParam] || req.query?.[studentIdParam];

    if (!studentId) return res.status(400).json({ error: "Missing studentId" });

    // Admins / SuperAdmins always allowed
    if (role === "Admin" || role === "SuperAdmin") return next();

    // Non-parents proceed normally
    if (role !== "Parent") return next();

    const linked = (req.user?.linkedStudents || []).map(String);
    if (linked.includes(String(studentId))) return next();

    return res
      .status(403)
      .json({ error: "Access Denied: parent not linked to student" });
  };
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

export default {
  verifyAuth,
  verifyRole,
  verifyParentHasAccess,
};
