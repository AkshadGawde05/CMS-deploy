import express from 'express';
import { verifyAuth, verifyRole } from '../middlewares/jwtAuth.js';
import Parent from '../models/Parent.js';
import Student from '../models/Student.js';

const router = express.Router();

/**
 * GET /api/parent/linked-students
 * Get students linked to the authenticated parent
 */
router.get('/linked-students', verifyAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Fetch all parent records for this user
    const parents = await Parent.find({ user_id: userId })
      .populate({
        path: 'student_id',
        select: '_id fname lname batch_id',
        populate: {
          path: 'batch_id',
          select: '_id name'
        }
      })
      .lean();

    if (!parents || parents.length === 0) {
      // Return empty array if no parent records found
      return res.json({
        success: true,
        students: [],
        total: 0
      });
    }

    // Extract unique students from parent records
    const studentsMap = new Map();
    parents.forEach(parent => {
      if (parent.student_id && parent.student_id._id) {
        studentsMap.set(String(parent.student_id._id), {
          _id: parent.student_id._id,
          fname: parent.student_id.fname,
          lname: parent.student_id.lname,
          batch_id: parent.student_id.batch_id
        });
      }
    });

    const students = Array.from(studentsMap.values());

    res.json({
      success: true,
      students: students,
      total: students.length
    });
  } catch (error) {
    console.error('Error fetching linked students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch linked students'
    });
  }
});

export default router;
