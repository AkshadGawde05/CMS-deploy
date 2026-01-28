import mongoose from "mongoose";
import User from "../models/User.js";
import Student from "../models/Student.js";
import RolePermissions from "../models/RolePermissions.js";

const ROLES = ["SuperAdmin", "Admin", "Teacher", "Student", "Parent"];
// Legacy role_id enum does not include SuperAdmin; we map SuperAdmin to role field only.

export async function listUsers(req, res) {
  try {
    const { role, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && ROLES.includes(String(role))) filter.role = role;
    if (q) {
      const regex = { $regex: String(q), $options: "i" };
      filter.$or = [{ email: regex }, { f_name: regex }, { l_name: regex }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter)
        .select("f_name l_name email role role_id linkedStudents created_at")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    const users = items.map((u) => ({
      id: String(u._id),
      name: `${u.f_name || ""} ${u.l_name || ""}`.trim(),
      email: u.email,
      role: u.role || mapLegacyRole(u.role_id) || "Student",
      linkedStudents: (u.linkedStudents || []).map(String),
      created_at: u.created_at,
    }));

    return res.json({ success: true, users, total });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to list users", details: err?.message });
  }
}

export async function createUser(req, res) {
  try {
    const requesterRole = req.user?.role;
    if (!requesterRole)
      return res.status(401).json({ error: "Not authenticated" });

    const { f_name, l_name, email, phone, password, role } = req.body || {};
    if (!f_name || !l_name || !email || !phone || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const targetRole = role && ROLES.includes(role) ? role : "Student";

    // Only SuperAdmin can create another SuperAdmin.
    if (targetRole === "SuperAdmin" && requesterRole !== "SuperAdmin") {
      return res
        .status(403)
        .json({ error: "Only SuperAdmin can create SuperAdmin" });
    }
    // Admin can create roles except SuperAdmin.
    if (requesterRole === "Admin" && targetRole === "SuperAdmin") {
      return res.status(403).json({ error: "Admin cannot create SuperAdmin" });
    }

    // Uniqueness check
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    }).select("_id email phone");
    if (existing) {
      return res.status(409).json({ error: "Email or phone already in use" });
    }

    // Map role_id for legacy schema (admin/teacher/student/parent) - SuperAdmin uses only role field
    function legacyRoleId(r) {
      switch (r) {
        case "Admin":
          return "admin";
        case "Teacher":
          return "teacher";
        case "Student":
          return "student";
        case "Parent":
          return "parent";
        default:
          return "admin"; // fallback, but SuperAdmin won't set role_id
      }
    }
    const payload = {
      f_name: f_name.trim(),
      l_name: l_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password_hash: password, // Will be hashed by pre-save hook
      role: targetRole,
      role_id: targetRole === "SuperAdmin" ? "admin" : legacyRoleId(targetRole),
    };

    const user = new User(payload);
    await user.save();

    return res.status(201).json({
      success: true,
      user: {
        id: String(user._id),
        name: `${user.f_name} ${user.l_name}`.trim(),
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to create user", details: err?.message });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!ROLES.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const requesterRole = req.user?.role;
    if (!requesterRole)
      return res.status(401).json({ error: "Not authenticated" });

    // Admin cannot set SuperAdmin
    if (requesterRole === "Admin" && role === "SuperAdmin") {
      return res.status(403).json({ error: "Admins cannot assign SuperAdmin" });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, runValidators: true }
    ).select("f_name l_name email role linkedStudents");

    if (!updated) return res.status(404).json({ error: "User not found" });

    return res.json({
      success: true,
      user: {
        id: String(updated._id),
        name: `${updated.f_name || ""} ${updated.l_name || ""}`.trim(),
        email: updated.email,
        role: updated.role,
        linkedStudents: (updated.linkedStudents || []).map(String),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update role", details: err?.message });
  }
}

export async function updateUserLinkedStudents(req, res) {
  try {
    const { id } = req.params;
    let { linkedStudents } = req.body || {};
    if (!Array.isArray(linkedStudents)) linkedStudents = [];

    // Validate ObjectIds and ensure students exist
    const uniqueIds = [...new Set(linkedStudents.map(String))];
    const validObjectIds = uniqueIds.filter((s) =>
      mongoose.Types.ObjectId.isValid(s)
    );

    const count = await Student.countDocuments({
      _id: { $in: validObjectIds },
    });
    if (count !== validObjectIds.length) {
      return res.status(400).json({ error: "One or more students not found" });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { linkedStudents: validObjectIds } },
      { new: true, runValidators: true }
    ).select("f_name l_name email role linkedStudents");

    if (!updated) return res.status(404).json({ error: "User not found" });

    return res.json({
      success: true,
      user: {
        id: String(updated._id),
        name: `${updated.f_name || ""} ${updated.l_name || ""}`.trim(),
        email: updated.email,
        role: updated.role,
        linkedStudents: (updated.linkedStudents || []).map(String),
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to update linked students",
      details: err?.message,
    });
  }
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

// Permission Management Handlers

/**
 * GET /api/users/:id/permissions
 * Fetch a user's permissions object
 * Only accessible by SuperAdmin
 */
export async function getUserPermissions(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select(
      "f_name l_name email role permissions"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        id: String(user._id),
        name: `${user.f_name} ${user.l_name}`.trim(),
        email: user.email,
        role: user.role,
        permissions: user.permissions || {},
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch permissions", details: err?.message });
  }
}

/**
 * PUT /api/users/:id/permissions
 * Update a user's permissions object
 * Only accessible by SuperAdmin
 * Body: { permissions: { canViewMarks: true, canEditMarks: false, ... } }
 */
export async function updateUserPermissions(req, res) {
  try {
    const { id } = req.params;
    const { permissions } = req.body || {};

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ error: "Invalid permissions object" });
    }

    // Validate that all keys are valid permission keys
    const validKeys = [
      "canViewMarks",
      "canEditMarks",
      "canViewAttendance",
      "canEditAttendance",
      "canViewReports",
      "canEditReports",
      "canViewMaterials",
      "canUploadMaterials",
      "canViewAnnouncements",
      "canCreateAnnouncements",
      "canViewUsers",
      "canEditUsers",
      "canViewCourses",
      "canEditCourses",
      "canViewBatches",
      "canEditBatches",
      "canViewStudents",
      "canEditStudents",
      "canViewTeachers",
      "canEditTeachers",
      "canViewParents",
      "canEditParents",
      "canViewAccounts",
      "canEditAccounts",
      "canViewExams",
      "canEditExams",
    ];

    const invalidKeys = Object.keys(permissions).filter(
      (k) => !validKeys.includes(k)
    );
    if (invalidKeys.length > 0) {
      return res
        .status(400)
        .json({ error: "Invalid permission keys", invalid: invalidKeys });
    }

    // Ensure all values are boolean
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value !== "boolean") {
        return res
          .status(400)
          .json({ error: `Permission ${key} must be a boolean` });
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { permissions } },
      { new: true, runValidators: true }
    ).select("f_name l_name email role permissions");

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        id: String(updated._id),
        name: `${updated.f_name} ${updated.l_name}`.trim(),
        email: updated.email,
        role: updated.role,
        permissions: updated.permissions,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update permissions", details: err?.message });
  }
}

// Role-based permission management
export async function getRolePermissions(req, res) {
  try {
    const roles = await RolePermissions.find({}).sort({ role: 1 });
    return res.json({ success: true, roles });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch role permissions",
      details: err?.message,
    });
  }
}

export async function updateRolePermissions(req, res) {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ error: "Permissions object required" });
    }

    const validRoles = ["Admin", "Teacher", "Student", "Parent"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Validate permission keys
    const validKeys = [
      "canViewMarks",
      "canEditMarks",
      "canViewAttendance",
      "canEditAttendance",
      "canViewReports",
      "canEditReports",
      "canViewMaterials",
      "canUploadMaterials",
      "canViewAnnouncements",
      "canCreateAnnouncements",
      "canViewUsers",
      "canEditUsers",
      "canViewCourses",
      "canEditCourses",
      "canViewBatches",
      "canEditBatches",
      "canViewStudents",
      "canEditStudents",
      "canViewTeachers",
      "canEditTeachers",
      "canViewParents",
      "canEditParents",
      "canViewAccounts",
      "canEditAccounts",
      "canViewExams",
      "canEditExams",
    ];

    const invalidKeys = Object.keys(permissions).filter(
      (k) => !validKeys.includes(k)
    );
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        error: "Invalid permission keys",
        invalid: invalidKeys,
      });
    }

    // Ensure all values are boolean
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value !== "boolean") {
        return res.status(400).json({
          error: `Permission ${key} must be a boolean`,
        });
      }
    }

    const updated = await RolePermissions.findOneAndUpdate(
      { role },
      { $set: { permissions, updated_at: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ error: "Failed to update role permissions" });
    }

    return res.json({
      success: true,
      rolePermissions: updated,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to update role permissions",
      details: err?.message,
    });
  }
}

// Individual functions above are already exported with `export async function ...` declarations.
// Removing redundant re-export block to avoid duplicate export errors.
