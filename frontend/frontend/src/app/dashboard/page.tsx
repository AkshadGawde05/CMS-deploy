'use client';
import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import AdminDashboard from '../superadmin/dashboard/page';
import StudentDashboard from '../student/dashboard/page';
import ParentDashboard from '../parent/dashboard/page';
import TeacherDashboard from '../teacher/dashboard/page';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  // Admin Dashboard
  if (user.role === 'Admin' || user.role === 'SuperAdmin') {
    return (
      <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
        <div className="flex bg-gray-100">
          <Sidebar />
          <div className="flex-1 lg:ml-64 min-h-screen">
            <Navbar />
            <AdminDashboard />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Teacher Dashboard
  if (user.role === 'Teacher') {
    return (
      <ProtectedRoute allowedRoles={["Teacher"]}>
        <div className="flex bg-gray-100">
          <Sidebar />
          <div className="flex-1 lg:ml-64 min-h-screen">
            <Navbar />
            <TeacherDashboard />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Student Dashboard
  if (user.role === 'Student') {
    return (
      <ProtectedRoute allowedRoles={["Student"]}>
        <div className="flex bg-gray-100">
          <Sidebar />
          <div className="flex-1 lg:ml-64 min-h-screen">
            <Navbar />
            <StudentDashboard />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Parent Dashboard
  if (user.role === 'Parent') {
    return (
      <ProtectedRoute allowedRoles={["Parent"]}>
        <div className="flex bg-gray-100">
          <Sidebar />
          <div className="flex-1 lg:ml-64 min-h-screen">
            <Navbar />
            <ParentDashboard />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return null;
}