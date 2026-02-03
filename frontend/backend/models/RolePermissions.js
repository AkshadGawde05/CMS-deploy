// cms/backend/models/RolePermissions.js
import mongoose from "mongoose";

const RolePermissionsSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["Admin", "Teacher", "Student", "Parent"],
      required: true,
      unique: true,
    },
    permissions: {
      canViewMarks: { type: Boolean, default: false },
      canEditMarks: { type: Boolean, default: false },
      canViewAttendance: { type: Boolean, default: false },
      canEditAttendance: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canEditReports: { type: Boolean, default: false },
      canViewMaterials: { type: Boolean, default: false },
      canUploadMaterials: { type: Boolean, default: false },
      canViewAnnouncements: { type: Boolean, default: false },
      canCreateAnnouncements: { type: Boolean, default: false },
      canViewUsers: { type: Boolean, default: false },
      canEditUsers: { type: Boolean, default: false },
      canViewCourses: { type: Boolean, default: false },
      canEditCourses: { type: Boolean, default: false },
      canViewBatches: { type: Boolean, default: false },
      canEditBatches: { type: Boolean, default: false },
      canViewStudents: { type: Boolean, default: false },
      canEditStudents: { type: Boolean, default: false },
      canViewTeachers: { type: Boolean, default: false },
      canEditTeachers: { type: Boolean, default: false },
      canViewParents: { type: Boolean, default: false },
      canEditParents: { type: Boolean, default: false },
      canViewAccounts: { type: Boolean, default: false },
      canEditAccounts: { type: Boolean, default: false },
      canViewExams: { type: Boolean, default: false },
      canEditExams: { type: Boolean, default: false },
    },
    updated_at: { type: Date, default: Date.now },
  },
  { minimize: false }
);

RolePermissionsSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const RolePermissions = mongoose.model(
  "RolePermissions",
  RolePermissionsSchema
);

export default RolePermissions;
