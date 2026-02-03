'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Hello {user?.name || user?.email}</h1>
        <p className="text-gray-600 mt-2">Welcome to the Admin dashboard.</p>
      </div>
    </ProtectedRoute>
  );
}
