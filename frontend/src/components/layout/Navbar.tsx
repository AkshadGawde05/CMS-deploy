"use client";
import { Bell, Settings, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import BranchSelector from "@/components/branch/BranchSelector";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    if (confirm("Are you sure you want to logout?")) {
      setIsLoggingOut(true);
      try {
        await logout();
      } catch (error) {
        console.error("Logout failed:", error);
        alert("Logout failed. Please try again.");
      } finally {
        setIsLoggingOut(false);
      }
    }
  };
  const getPageTitle = (path: string) => {
    const routes: { [key: string]: string } = {
      "/dashboard": "Dashboard",
      "/courses": "Courses",
      "/batches": "Batches",
      "/students": "Students",
      "/teachers": "Teachers",
      "/fees": "Fees",
      "/attendance": "Attendance",
      "/exams": "Exams",
      "/materials": "Materials",
      "/announcements": "Announcements",
      "/reports": "Reports"
    };
    return routes[path] || "Dashboard";
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-[#E5E7EB] z-20 shadow-sm">
      <div className="h-full px-16 lg:px-6 flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-semibold text-[#111827]">{getPageTitle(pathname)}</h1>
        <div className="flex items-center">
          <div className="mr-4">
            <BranchSelector />
          </div>
          <button className="p-2 hover:bg-[#F9FAFB] rounded-full text-gray-400 transition-colors hidden sm:block">
            <Bell size={22} />
          </button>
          <div className="flex items-center gap-2 lg:gap-3 ml-4">
            <Image
              src="/avatar.jpg"
              alt={user?.name || "User"}
              width={32}
              height={32}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              priority
            />
            <div className="hidden sm:block">
              <div className="font-medium text-sm lg:text-base text-[#374151]">
                {user?.name || user?.email || "User"}
              </div>
              <div className="text-xs text-gray-500">{user?.role || "User"}</div>
            </div>
            <svg width="20" height="20" fill="none" className="text-gray-400 hidden sm:block">
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="hidden sm:flex items-center ml-4">
            <button
              className="p-2 hover:bg-[#F9FAFB] rounded-full text-gray-400 transition-colors"
              title="Settings"
            >
              <Settings size={22} />
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Logout"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}