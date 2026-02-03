import express from 'express';
import RolePermissions from '../models/RolePermissions.js';
import { verifyAuth } from '../middlewares/jwtAuth.js';

const router = express.Router();

// Define permission groups
const PERMISSION_GROUPS = {
  "Marks": ["canViewMarks", "canEditMarks"],
  "Attendance": ["canViewAttendance", "canEditAttendance"],
  "Reports": ["canViewReports", "canEditReports"],
  "Materials": ["canViewMaterials", "canUploadMaterials"],
  "Announcements": ["canViewAnnouncements", "canCreateAnnouncements"],
  "Users": ["canViewUsers", "canEditUsers"],
  "Courses": ["canViewCourses", "canEditCourses"],
  "Batches": ["canViewBatches", "canEditBatches"],
  "Students": ["canViewStudents", "canEditStudents"],
  "Teachers": ["canViewTeachers", "canEditTeachers"],
  "Parents": ["canViewParents", "canEditParents"],
  "Accounts": ["canViewAccounts", "canEditAccounts"],
  "Exams": ["canViewExams", "canEditExams"],
};

// Middleware to ensure only SuperAdmin can access these routes
const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied. SuperAdmin only.' });
  }
};

// GET /api/roles/permission-groups - Get all permission groups
router.get('/permission-groups', verifyAuth, isSuperAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching permission groups...');
    res.json({ success: true, permissionGroups: PERMISSION_GROUPS });
  } catch (error) {
    console.error('❌ Error fetching permission groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permission groups', error: error.message });
  }
});

// GET /api/roles/permissions - Get all role permissions
router.get('/permissions', verifyAuth, isSuperAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching role permissions...');
    const roles = await RolePermissions.find({}).sort({ role: 1 });
    console.log('📋 Found roles:', roles ? roles.length : 0);
    
    // If no roles exist, create default ones
    if (!roles || roles.length === 0) {
      console.log('📋 No roles found, creating default roles...');
      const defaultRoles = [
        {
          role: 'Admin',
          permissions: {
            canViewMarks: true,
            canEditMarks: true,
            canViewAttendance: true,
            canEditAttendance: true,
            canViewReports: true,
            canEditReports: true,
            canViewMaterials: true,
            canUploadMaterials: true,
            canViewAnnouncements: true,
            canCreateAnnouncements: true,
            canViewUsers: true,
            canEditUsers: true,
            canViewCourses: true,
            canEditCourses: true,
            canViewBatches: true,
            canEditBatches: true,
            canViewStudents: true,
            canEditStudents: true,
            canViewTeachers: true,
            canEditTeachers: true,
            canViewParents: true,
            canEditParents: true,
            canViewAccounts: true,
            canEditAccounts: true,
            canViewExams: true,
            canEditExams: true,
          },
        },
        {
          role: 'Teacher',
          permissions: {
            canViewMarks: true,
            canEditMarks: true,
            canViewAttendance: true,
            canEditAttendance: true,
            canViewReports: true,
            canEditReports: false,
            canViewMaterials: true,
            canUploadMaterials: true,
            canViewAnnouncements: true,
            canCreateAnnouncements: false,
            canViewUsers: false,
            canEditUsers: false,
            canViewCourses: true,
            canEditCourses: false,
            canViewBatches: true,
            canEditBatches: false,
            canViewStudents: true,
            canEditStudents: false,
            canViewTeachers: false,
            canEditTeachers: false,
            canViewParents: true,
            canEditParents: false,
            canViewAccounts: false,
            canEditAccounts: false,
            canViewExams: true,
            canEditExams: false,
          },
        },
        {
          role: 'Student',
          permissions: {
            canViewMarks: true,
            canEditMarks: false,
            canViewAttendance: true,
            canEditAttendance: false,
            canViewReports: true,
            canEditReports: false,
            canViewMaterials: true,
            canUploadMaterials: false,
            canViewAnnouncements: true,
            canCreateAnnouncements: false,
            canViewUsers: false,
            canEditUsers: false,
            canViewCourses: true,
            canEditCourses: false,
            canViewBatches: true,
            canEditBatches: false,
            canViewStudents: false,
            canEditStudents: false,
            canViewTeachers: false,
            canEditTeachers: false,
            canViewParents: false,
            canEditParents: false,
            canViewAccounts: false,
            canEditAccounts: false,
            canViewExams: true,
            canEditExams: false,
          },
        },
        {
          role: 'Parent',
          permissions: {
            canViewMarks: true,
            canEditMarks: false,
            canViewAttendance: true,
            canEditAttendance: false,
            canViewReports: true,
            canEditReports: false,
            canViewMaterials: true,
            canUploadMaterials: false,
            canViewAnnouncements: true,
            canCreateAnnouncements: false,
            canViewUsers: false,
            canEditUsers: false,
            canViewCourses: true,
            canEditCourses: false,
            canViewBatches: true,
            canEditBatches: false,
            canViewStudents: true,
            canEditStudents: false,
            canViewTeachers: false,
            canEditTeachers: false,
            canViewParents: false,
            canEditParents: false,
            canViewAccounts: false,
            canEditAccounts: false,
            canViewExams: true,
            canEditExams: false,
          },
        },
      ];

      // Create default roles
      const createdRoles = await RolePermissions.insertMany(defaultRoles);
      console.log('✅ Created default roles:', createdRoles.length);
      return res.json({ success: true, roles: createdRoles });
    }

    console.log('✅ Returning existing roles:', roles.length);
    res.json({ success: true, roles });
  } catch (error) {
    console.error('❌ Error fetching role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch role permissions', error: error.message });
  }
});

// PUT /api/roles/:role/permissions - Update permissions for a specific role
router.put('/:role/permissions', verifyAuth, isSuperAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!role || !permissions) {
      return res.status(400).json({ success: false, message: 'Role and permissions are required' });
    }

    // Validate role
    const validRoles = ['Admin', 'Teacher', 'Student', 'Parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Update or create role permissions
    const updatedRole = await RolePermissions.findOneAndUpdate(
      { role },
      { 
        role, 
        permissions,
        updated_at: new Date()
      },
      { 
        new: true, 
        upsert: true, // Create if doesn't exist
        runValidators: true 
      }
    );

    res.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to update role permissions', error: error.message });
  }
});

// GET /api/roles/:role/permissions - Get permissions for a specific role
router.get('/:role/permissions', verifyAuth, async (req, res) => {
  try {
    const { role } = req.params;

    const rolePermissions = await RolePermissions.findOne({ role });

    if (!rolePermissions) {
      return res.status(404).json({ success: false, message: 'Role permissions not found' });
    }

    res.json({ success: true, role: rolePermissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch role permissions', error: error.message });
  }
});

export default router;
