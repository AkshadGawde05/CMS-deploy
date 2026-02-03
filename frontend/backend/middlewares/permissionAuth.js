// Permission-based access control middleware
// Works alongside verifyAuth and verifyRole to provide fine-grained access control
import { getDefaultPermissions } from "../models/User.js";
import RolePermissions from "../models/RolePermissions.js";

/**
 * Middleware to verify user has a specific permission
 * @param {string|string[]} requiredPermissions - Permission key(s) required (e.g., 'canEditMarks' or ['canViewMarks', 'canEditMarks'])
 * @param {object} options - Additional options
 * @param {boolean} options.requireAll - If true with array, user must have ALL permissions. If false, ANY permission suffices.
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/marks', verifyAuth, verifyPermission('canViewMarks'), listMarks);
 *   router.put('/marks/:id', verifyAuth, verifyPermission('canEditMarks'), updateMarks);
 *   router.post('/marks', verifyAuth, verifyPermission(['canViewMarks', 'canEditMarks'], { requireAll: true }), createMarks);
 */
export function verifyPermission(requiredPermissions, options = {}) {
  const { requireAll = true } = options;

  return async function (req, res, next) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // SuperAdmin bypass: always allow
    if (user.role === "SuperAdmin") {
      return next();
    }

    try {
      // Fetch role-based permissions from database
      const rolePermissions = await RolePermissions.findOne({
        role: user.role,
      });

      let userPermissions = {};
      if (rolePermissions) {
        userPermissions = rolePermissions.permissions || {};
      } else {
        // Fallback to default permissions if role not found in DB
        userPermissions = getDefaultPermissions(user.role || "Student");
      }

      // Normalize to array
      const permsToCheck = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check permissions
      const results = permsToCheck.map((perm) => {
        const hasPermission = userPermissions[perm] === true;
        return hasPermission;
      });

      const allowed = requireAll
        ? results.every((r) => r === true)
        : results.some((r) => r === true);

      if (!allowed) {
        return res.status(403).json({
          error: "Forbidden: insufficient permissions",
          required: requiredPermissions,
        });
      }

      return next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        error: "Failed to verify permissions",
      });
    }
  };
}

/**
 * Helper to check if user has permission (for use in route handlers)
 * @param {object} user - User object with role
 * @param {string} permissionKey - Permission to check
 * @returns {Promise<boolean>}
 */
export async function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === "SuperAdmin") return true;

  try {
    const rolePermissions = await RolePermissions.findOne({ role: user.role });
    if (rolePermissions) {
      return rolePermissions.permissions?.[permissionKey] === true;
    }
    // Fallback to defaults
    const defaultPerms = getDefaultPermissions(user.role || "Student");
    return defaultPerms[permissionKey] === true;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

export default { verifyPermission, hasPermission };
