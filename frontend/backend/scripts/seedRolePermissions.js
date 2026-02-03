import "dotenv/config";
import mongoose from "mongoose";
import RolePermissions from "../models/RolePermissions.js";

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

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ Missing MONGODB_URI / MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // Delete existing roles
  const deleted = await RolePermissions.deleteMany({});
  console.log(`🗑️  Deleted ${deleted.deletedCount} existing roles`);

  // Create new roles
  const created = await RolePermissions.insertMany(defaultRoles);
  console.log(`✅ Created ${created.length} role permissions:`);
  created.forEach(role => {
    const enabledCount = Object.values(role.permissions).filter(Boolean).length;
    const totalCount = Object.keys(role.permissions).length;
    console.log(`   - ${role.role}: ${enabledCount}/${totalCount} permissions enabled`);
  });

  await mongoose.disconnect();
  console.log("✅ Done!");
}

main().catch(async (e) => {
  console.error("❌ Seed failed:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
