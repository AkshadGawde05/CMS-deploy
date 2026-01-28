import express from "express";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";
import {
  listUsers,
  updateUserRole,
  updateUserLinkedStudents,
  createUser,
  getUserPermissions,
  updateUserPermissions,
  getRolePermissions,
  updateRolePermissions,
} from "../controllers/usersController.js";

const router = express.Router();

router.get(
  "/users",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  listUsers
);
router.post(
  "/users",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  createUser
);
router.put(
  "/users/:id/role",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  updateUserRole
);
router.put(
  "/users/:id/linked-students",
  verifyAuth,
  verifyRole(["Admin", "SuperAdmin"]),
  updateUserLinkedStudents
);

// Permission management endpoints (SuperAdmin only)
router.get(
  "/users/:id/permissions",
  verifyAuth,
  verifyRole(["SuperAdmin"]),
  getUserPermissions
);
router.put(
  "/users/:id/permissions",
  verifyAuth,
  verifyRole(["SuperAdmin"]),
  updateUserPermissions
);

// Role-based permission management (SuperAdmin only)
router.get(
  "/roles/permissions",
  verifyAuth,
  verifyRole(["SuperAdmin"]),
  getRolePermissions
);
router.put(
  "/roles/:role/permissions",
  verifyAuth,
  verifyRole(["SuperAdmin"]),
  updateRolePermissions
);

export default router;
