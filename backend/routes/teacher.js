import express from 'express';
import { verifyAuth, verifyRole } from '../middlewares/jwtAuth.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';

const router = express.Router();

/**
 * GET /api/teacher/batches
 * Get batches assigned to the authenticated teacher
 */
router.get('/batches', verifyAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Fetch teacher record
    const teacher = await Teacher.findOne({ user_id: userId })
      .populate('assigned_batches', '_id name')
      .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher record not found'
      });
    }

    const batches = teacher.assigned_batches || [];

    res.json({
      success: true,
      batches: batches,
      total: batches.length
    });
  } catch (error) {
    console.error('Error fetching teacher batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches'
    });
  }
});

export default router;
