#!/usr/bin/env node

// Script to add ProtectedRoute to all unprotected pages
const pages = [
  {
    path: "cms/frontend/src/app/parents/page.tsx",
    roles: ["Admin", "SuperAdmin"],
  },
  {
    path: "cms/frontend/src/app/exams/page.tsx",
    roles: ["Admin", "SuperAdmin", "Teacher", "Student", "Parent"],
  },
  {
    path: "cms/frontend/src/app/accounts/page.tsx",
    roles: ["ALL"], // All authenticated users
  },
  {
    path: "cms/frontend/src/app/admin/dashboard/page.tsx",
    roles: ["Admin", "SuperAdmin"],
  },
  {
    path: "cms/frontend/src/app/student/dashboard/page.tsx",
    roles: ["Student"],
  },
  {
    path: "cms/frontend/src/app/superadmin/dashboard/page.tsx",
    roles: ["SuperAdmin"],
  },
];

console.log("Pages that need ProtectedRoute wrapper:");
pages.forEach((page) => {
  console.log(`${page.path} - Roles: ${page.roles.join(", ")}`);
});

console.log("\n✅ Run this manually for each page:");
console.log(
  '1. Add: import ProtectedRoute from "@/components/auth/ProtectedRoute";'
);
console.log(
  "2. Wrap return content: <ProtectedRoute allowedRoles={[...]}>{content}</ProtectedRoute>"
);
