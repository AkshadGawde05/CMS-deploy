import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    fname: { type: String, required: true },
    lname: { type: String, required: true },

    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true },

    passwordhash: { type: String, required: true },

    // Legacy role field kept for back-compat
    roleid: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      required: true,
    },

    // New RBAC role
    role: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Teacher", "Student", "Parent"],
      default: "Student",
      index: true,
    },

    // For Parent users
    linkedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],

    // Optional metadata for scoping checks
    meta: {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batches" },
    },

    // NEW: Biomax enrollment / device user id (works for Student + Teacher)
    device_user_id: {
      type: String,
      sparse: true,
      default: null,
      index: true,
    },

    // Permissions (your existing block reminded below; keep as-is)
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

    createdat: { type: Date, default: Date.now },
    updatedat: { type: Date, default: Date.now },
    status: { type: Boolean, default: true },
    lastlogin: { type: Date },
  },
  { minimize: false }
);

UserSchema.pre("save", async function (next) {
  this.updatedat = Date.now();

  if (this.isModified("passwordhash")) {
    const salt = await bcrypt.genSalt(10);
    this.passwordhash = await bcrypt.hash(this.passwordhash, salt);
  }

  next();
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordhash);
};

// Keep your existing getDefaultPermissions export if you use it elsewhere (unchanged).
export function getDefaultPermissions(role) {
  const allTrue = {
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
  };

  const allFalse = Object.keys(allTrue).reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

  switch (role) {
    case "SuperAdmin":
      return allTrue;
    case "Admin":
      return { ...allTrue };
    case "Teacher":
      return {
        ...allFalse,
        canViewMarks: true,
        canEditMarks: true,
        canViewAttendance: true,
        canEditAttendance: true,
        canViewReports: true,
        canViewMaterials: true,
        canUploadMaterials: true,
        canViewAnnouncements: true,
        canCreateAnnouncements: true,
        canViewStudents: true,
        canViewCourses: true,
        canViewBatches: true,
        canViewExams: true,
        canEditExams: true,
      };
    case "Student":
      return {
        ...allFalse,
        canViewMarks: true,
        canViewAttendance: true,
        canViewReports: true,
        canViewMaterials: true,
        canViewAnnouncements: true,
      };
    case "Parent":
      return {
        ...allFalse,
        canViewMarks: true,
        canViewAttendance: true,
        canViewReports: true,
        canViewMaterials: true,
        canViewAnnouncements: true,
      };
    default:
      return allFalse;
  }
}

const User = mongoose.model("User", UserSchema);
export default User;
