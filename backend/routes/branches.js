import express from "express";
import Branch from "../models/Branch.js";
import { verifyAuth, verifyRole } from "../middlewares/jwtAuth.js";

const router = express.Router();

/**
 * GET /api/branches
 * List all branches (Super Admin only)
 */
router.get("/", verifyAuth, verifyRole(["SuperAdmin", "Admin"]), async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const branches = await Branch.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, branches });
    } catch (error) {
        console.error("Error fetching branches:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/branches/my
 * Get branches accessible to current user
 */
router.get("/my", verifyAuth, async (req, res) => {
    try {
        const user = req.user;

        // Super admins can see all branches
        if (user.role === "SuperAdmin" || user.role === "Admin") {
            const branches = await Branch.find({ status: "active" }).sort({ name: 1 });
            return res.json({ success: true, branches });
        }

        // Regular users see only their assigned branches
        const userBranches = user.branches || [];
        if (userBranches.length === 0) {
            return res.json({ success: true, branches: [] });
        }

        const branches = await Branch.find({
            _id: { $in: userBranches },
            status: "active",
        }).sort({ name: 1 });

        res.json({ success: true, branches });
    } catch (error) {
        console.error("Error fetching user branches:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/branches/:id
 * Get single branch by ID
 */
router.get("/:id", verifyAuth, async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: "Branch not found" });
        }

        // Check if user has access to this branch
        const user = req.user;
        const isSuperAdmin = user.role === "SuperAdmin" || user.role === "Admin";
        const userBranches = (user.branches || []).map((b) => String(b));

        if (!isSuperAdmin && !userBranches.includes(String(branch._id))) {
            return res.status(403).json({
                success: false,
                message: "Access denied: You do not have access to this branch",
            });
        }

        res.json({ success: true, branch });
    } catch (error) {
        console.error("Error fetching branch:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/branches
 * Create new branch (Super Admin only)
 */
router.post("/", verifyAuth, verifyRole(["SuperAdmin", "Admin"]), async (req, res) => {
    try {
        const { name, code, address, contactEmail, contactPhone, status } = req.body;

        // Validate required fields
        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Name and code are required",
            });
        }

        // Check if code already exists
        const existing = await Branch.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Branch code already exists",
            });
        }

        const branch = new Branch({
            name,
            code: code.toUpperCase(),
            address,
            contactEmail,
            contactPhone,
            status: status || "active",
        });

        await branch.save();
        console.log("✅ Branch created:", branch.name, branch.code);

        res.status(201).json({ success: true, branch });
    } catch (error) {
        console.error("Error creating branch:", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/branches/:id
 * Update branch (Super Admin only)
 */
router.put("/:id", verifyAuth, verifyRole(["SuperAdmin", "Admin"]), async (req, res) => {
    try {
        const { name, code, address, contactEmail, contactPhone, status } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (code) updateData.code = code.toUpperCase();
        if (address) updateData.address = address;
        if (contactEmail) updateData.contactEmail = contactEmail;
        if (contactPhone) updateData.contactPhone = contactPhone;
        if (status) updateData.status = status;
        updateData.updatedAt = new Date();

        // If code is being updated, check for duplicates
        if (code) {
            const existing = await Branch.findOne({
                code: code.toUpperCase(),
                _id: { $ne: req.params.id },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Branch code already exists",
                });
            }
        }

        const branch = await Branch.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!branch) {
            return res.status(404).json({ success: false, message: "Branch not found" });
        }

        console.log("✅ Branch updated:", branch.name);
        res.json({ success: true, branch });
    } catch (error) {
        console.error("Error updating branch:", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/branches/:id
 * Soft delete branch (set status to inactive)
 * Super Admin only
 */
router.delete("/:id", verifyAuth, verifyRole(["SuperAdmin", "Admin"]), async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(
            req.params.id,
            { status: "inactive", updatedAt: new Date() },
            { new: true }
        );

        if (!branch) {
            return res.status(404).json({ success: false, message: "Branch not found" });
        }

        console.log("✅ Branch deactivated:", branch.name);
        res.json({ success: true, message: "Branch deactivated", branch });
    } catch (error) {
        console.error("Error deleting branch:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
