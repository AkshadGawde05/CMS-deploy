"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (loading) return;
    
    if (isAuthenticated && user) {
      // Redirect based on role
      switch (user.role) {
        case "SuperAdmin":
          router.replace("/superadmin/dashboard");
          break;
        case "Admin":
          router.replace("/admin/dashboard");
          break;
        case "Teacher":
          router.replace("/teacher/dashboard");
          break;
        case "Student":
          router.replace("/student/dashboard");
          break;
        case "Parent":
          router.replace("/parent/dashboard");
          break;
        default:
          router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, don't show landing page (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // Show landing page for unauthenticated users
  return (
    <div className="font-sans flex items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          VikiTech Classroom Management System
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Welcome to VikiTech CMS. Please log in to access your dashboard.
        </p>
        <div className="flex gap-4 justify-center">
          <a 
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </a>
          <a 
            href="/register"
            className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}