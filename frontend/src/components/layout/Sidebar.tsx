"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  BookOpen,
  Users,
  GraduationCap,
  Wallet,
  CalendarCheck,
  ClipboardList,
  FileText,
  Megaphone,
  BarChart2,
  Layers,
  Menu,
  X,
  LogOut,
  Phone
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setIsOpen(true);
      else setIsOpen(false);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const baseMenuItems = useMemo(() => {
    const items = [
      { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
      { icon: BookOpen, label: "Courses", href: "/courses" },
      { icon: Layers, label: "Batches", href: "/batches" },
      { icon: BookOpen, label: "Syllabus", href: "/syllabus" },
      { icon: Users, label: "Students", href: "/students" },
      { icon: GraduationCap, label: "Teachers", href: "/teachers" },
      { icon: Users, label: "Parents", href: "/parents" },
      { icon: Phone, label: "Enquiry Management", href: "/enquiry" },
      { icon: CalendarCheck, label: "Lectures/Sessions", href: "/lectures" },
      { icon: Wallet, label: "Accounts", href: "/accounts" },
      { icon: CalendarCheck, label: "Attendance", href: "/attendance" },
      { icon: ClipboardList, label: "Exams", href: "/exams" },
      { icon: FileText, label: "Materials", href: "/materials" },
      { icon: Megaphone, label: "Announcements", href: "/announcements" },
      { icon: BarChart2, label: "Reports", href: "/reports" },
    ];
    
    // Add SuperAdmin-only items
    if (user?.role === "SuperAdmin") {
      items.push({ icon: Users, label: "Permissions", href: "/superadmin/permissions" });
    }
    
    return items;
  }, [user?.role]);

  const allowedByRole = useMemo(() => {
    const role = user?.role;
    if (!role) return new Set<string>();
    if (role === "Admin" || role === "SuperAdmin") return new Set<string>(baseMenuItems.map(i => i.href));
    if (role === "Teacher") return new Set<string>(["/dashboard", "/lectures", "/exams", "/attendance"]);
    if (role === "Student") return new Set<string>(["/dashboard", "/lectures", "/exams", "/attendance", "/materials", "/announcements", "/reports"]);
    if (role === "Parent") return new Set<string>(["/dashboard", "/attendance", "/exams", "/reports"]);
    return new Set<string>();
  }, [user?.role, baseMenuItems]);

  const menuItems = useMemo(() => {
    if (!user?.role) return [] as typeof baseMenuItems;
    const allowAll = user.role === "Admin" || user.role === "SuperAdmin";
    return baseMenuItems.filter(item => allowAll || allowedByRole.has(item.href));
  }, [user?.role, allowedByRole, baseMenuItems]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white border-r border-[#E5E7EB] w-64 h-screen fixed left-0 top-0 shadow-sm z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB]">
          <h1 className="text-xl font-bold text-[#111827]">EduManage</h1>
        </div>
        <nav className="px-3 py-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive
                  ? "bg-[#2563EB] text-white font-medium"
                  : "text-gray-600 hover:bg-[#F9FAFB] hover:text-[#2563EB]"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Logout Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={20} />
            <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </nav>
    </aside>
    </>
  );
}