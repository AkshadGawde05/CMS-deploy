"use client";
import React, { useEffect } from "react";
import { useAuth, type UserPermissions } from "./AuthProvider";
import { usePathname, useRouter } from "next/navigation";

export default function ProtectedRoute({ 
  allowedRoles, 
  requiredPermission, 
  children 
}: { 
  allowedRoles: string[]; 
  requiredPermission?: keyof UserPermissions;
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, loading, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // wait until we know auth

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowedRoles.length && user && !allowedRoles.includes(user.role)) {
      router.replace("/403");
      return;
    }
    // Check permission after role check
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.replace("/403");
      return;
    }
  }, [loading, isAuthenticated, user, router, pathname, allowedRoles, requiredPermission, hasPermission]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!isAuthenticated) return null;
  if (allowedRoles.length && user && !allowedRoles.includes(user.role)) return null;
  if (requiredPermission && !hasPermission(requiredPermission)) return null;

  return <>{children}</>;
}
