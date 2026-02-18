/**
 * Helper utilities for branch-scoped queries
 * Use these functions to ensure consistent branch filtering across the application
 */

import mongoose from "mongoose";

/**
 * Add branch filter to query object
 * @param {Object} query - Mongoose query object
 * @param {Object} req - Express request object (with branchId and isSuperAdmin)
 * @returns {Object} - Query object with branch filter added
 */
export function addBranchFilter(query, req) {
    // Super admins can access all branches unless they explicitly specify one
    if (req.isSuperAdmin && !req.branchId) {
        return query;
    }

    // Add branch filter for regular users or when branchId is specified
    if (req.branchId) {
        query.branchId = req.branchId;
    }

    return query;
}

/**
 * Add branch filter to aggregation pipeline match stage
 * @param {Object} matchStage - Aggregation $match stage
 * @param {Object} req - Express request object
 * @returns {Object} - Match stage with branch filter added
 */
export function addBranchFilterToAggregation(matchStage, req) {
    // Super admins can access all branches unless they explicitly specify one
    if (req.isSuperAdmin && !req.branchId) {
        return matchStage;
    }

    // Add branch filter
    if (req.branchId) {
        matchStage.branchId = mongoose.Types.ObjectId(req.branchId);
    }

    return matchStage;
}

/**
 * Get branch ID for document creation
 * Throws error if branchId is not available
 * @param {Object} req - Express request object
 * @returns {ObjectId} - Branch ID to use for new document
 */
export function getBranchIdForCreate(req) {
    if (!req.branchId) {
        throw new Error("Branch ID is required for creating records");
    }
    return req.branchId;
}

/**
 * Validate user has access to specific branch
 * @param {Object} user - User object from req.user
 * @param {String|ObjectId} branchId - Branch ID to check
 * @returns {Boolean} - True if user has access
 */
export function userHasAccessToBranch(user, branchId) {
    // Super admins have access to all branches
    if (user.isSuperAdmin) {
        return true;
    }

    // Check if branchId is in user's branches array
    const userBranches = (user.branches || []).map((b) => String(b));
    return userBranches.includes(String(branchId));
}

/**
 * Build branch-aware query filter
 * Convenience function that combines common filtering patterns
 * @param {Object} baseFilter - Base filter object
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Object} - Complete filter object
 */
export function buildBranchQuery(baseFilter = {}, req, options = {}) {
    const filter = { ...baseFilter };

    // Add branch filter
    addBranchFilter(filter, req);

    // Add date range if provided
    if (options.startDate || options.endDate) {
        filter.date = {};
        if (options.startDate) filter.date.$gte = new Date(options.startDate);
        if (options.endDate) filter.date.$lte = new Date(options.endDate);
    }

    // Add status filter if provided
    if (options.status) {
        filter.status = options.status;
    }

    return filter;
}

/**
 * Example usage in a route:
 * 
 * import { addBranchFilter, getBranchIdForCreate } from '../utils/branchHelpers.js';
 * 
 * // GET route
 * app.get('/api/students', attachBranch, async (req, res) => {
 *   const filter = {};
 *   addBranchFilter(filter, req);
 *   const students = await Student.find(filter);
 *   res.json({ success: true, students });
 * });
 * 
 * // POST route
 * app.post('/api/students', attachBranch, async (req, res) => {
 *   const student = new Student({
 *     branchId: getBranchIdForCreate(req),
 *     ...req.body
 *   });
 *   await student.save();
 *   res.json({ success: true, student });
 * });
 */

export default {
    addBranchFilter,
    addBranchFilterToAggregation,
    getBranchIdForCreate,
    userHasAccessToBranch,
    buildBranchQuery,
};
