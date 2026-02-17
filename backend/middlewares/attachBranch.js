import Branch from "../models/Branch.js";
import mongoose from "mongoose";

/**
 * Middleware to attach branch context to requests
 * Extracts branchId from X-Branch-Id header or JWT payload
 * Validates user has access to the requested branch
 * Super admins can access all branches
 */
export async function attachBranch(req, res, next) {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // Super admins can access all branches
        const isSuperAdmin = user.role === "SuperAdmin" || user.role === "Admin";

        // Get branchId from header or user's primary branch
        let branchId = req.headers["x-branch-id"] || req.user?.currentBranchId;

        // If no branch specified and user is not super admin, require branch selection
        if (!branchId && !isSuperAdmin) {
            // Try to use user's primary branch
            if (user.primaryBranch) {
                branchId = user.primaryBranch;
            } else if (user.branches && user.branches.length > 0) {
                // Use first available branch
                branchId = user.branches[0];
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Branch not selected. Please select a branch.",
                });
            }
        }

        // Validate branchId format if provided
        if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid branch ID format",
            });
        }

        // For super admins, if no branch specified, allow access to all
        if (isSuperAdmin && !branchId) {
            req.branchId = null; // null means "all branches"
            req.isSuperAdmin = true;
            return next();
        }

        // Verify branch exists
        if (branchId) {
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: "Branch not found",
                });
            }

            // Check if branch is active
            if (branch.status !== "active") {
                return res.status(403).json({
                    success: false,
                    message: "Branch is inactive",
                });
            }

            // For non-super admins, verify they have access to this branch
            if (!isSuperAdmin) {
                const userBranches = (user.branches || []).map((b) => String(b));
                if (!userBranches.includes(String(branchId))) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied: You do not have access to this branch",
                    });
                }
            }
        }

        // Attach branch context to request
        req.branchId = branchId;
        req.isSuperAdmin = isSuperAdmin;

        next();
    } catch (error) {
        console.error("❌ Branch middleware error:", error);
        return res.status(500).json({
            success: false,
            message: "Error validating branch access",
            error: error.message,
        });
    }
}

export default attachBranch;
