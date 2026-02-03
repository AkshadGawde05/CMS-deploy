"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, me as apiMe, logout as apiLogout, refresh as apiRefresh, requestOtp as apiRequestOtp, verifyOtp as apiVerifyOtp } from "@/lib/api";
import { useRouter } from "next/navigation";

export type Role = 'SuperAdmin'|'Admin'|'Teacher'|'Student'|'Parent';

export type UserPermissions = {
  canViewMarks?: boolean;
  canEditMarks?: boolean;
  canViewAttendance?: boolean;
  canEditAttendance?: boolean;
  canViewReports?: boolean;
  canEditReports?: boolean;
  canViewMaterials?: boolean;
  canUploadMaterials?: boolean;
  canViewAnnouncements?: boolean;
  canCreateAnnouncements?: boolean;
  canViewUsers?: boolean;
  canEditUsers?: boolean;
  canViewCourses?: boolean;
  canEditCourses?: boolean;
  canViewBatches?: boolean;
  canEditBatches?: boolean;
  canViewStudents?: boolean;
  canEditStudents?: boolean;
  canViewTeachers?: boolean;
  canEditTeachers?: boolean;
  canViewParents?: boolean;
  canEditParents?: boolean;
  canViewAccounts?: boolean;
  canEditAccounts?: boolean;
  canViewExams?: boolean;
  canEditExams?: boolean;
};

export type AuthUser = { 
  id: string; 
  name?: string; 
  email: string; 
  role: Role; 
  linkedStudents?: string[];
  permissions?: UserPermissions;
} | null;

interface AuthContextValue {
  user: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<AuthUser>;
  requestOtp: (phone: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Role-specific landing pages (temporarily disabled - all redirect to /courses)
// const roleLanding: Record<Role, string> = {
//   SuperAdmin: "/superadmin/dashboard",
//   Admin: "/admin/dashboard",
//   Teacher: "/teacher/dashboard",
//   Student: "/student/dashboard",
//   Parent: "/parent/dashboard",
// };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, try to fetch /api/me (cookies are sent automatically)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiMe();
        if (!active) return;
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    await apiLogin(emailOrPhone, password);
    const me = await apiMe();
    setUser(me.user);
    // Redirect to dashboard - it will route to the appropriate one based on role
    router.replace("/dashboard");
    return me.user;
  }, [router]);

  const requestOtp = useCallback(async (phone: string) => {
    const resp = await apiRequestOtp(phone);
    return resp;
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    await apiVerifyOtp(phone, otp);
    const me = await apiMe();
    setUser(me.user);
    router.replace("/dashboard");
    return me.user;
  }, [router]);

  const logout = useCallback(async () => {
    try { 
      await apiLogout(); 
    } catch (error) { 
      console.error("Logout error:", error);
    }
    setUser(null);
    router.replace("/login");
    router.replace("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    try { await apiRefresh(); } catch { /* ignore */ }
  }, []);

  const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
    if (!user) return false;
    // SuperAdmin always has all permissions
    if (user.role === 'SuperAdmin') return true;
    // Check specific permission
    return user.permissions?.[permission] === true;
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    login,
    requestOtp,
    verifyOtp,
    logout,
    refresh,
    hasPermission,
  }), [user, loading, login, requestOtp, verifyOtp, logout, refresh, hasPermission]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
