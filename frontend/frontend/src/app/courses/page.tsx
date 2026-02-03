"use client";
import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Code, Smartphone, LineChart, Palette, Pencil, Plus, Archive } from "lucide-react";
import AddCourseModal from "@/components/courses/AddCourseModal";
import { getCourses, addCourse, editCourse, archiveCourse, getBatchesByCourse, onBatchesChanged } from "../../lib/api";
import type { CourseDTO } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

interface Course {
  _id: string;
  name: string;
  description: string;
  duration_months: number;
  batches?: string[];
  students_count?: number;
  status?: 'Active' | 'Pending';
  course_start?: string | Date;
  course_end?: string | Date;
}

interface CourseForm {
  name: string;
  description: string;
  course_fees: number;
  start_date: string;
  end_date: string;
}

// Helper to map Course to CourseForm for modal
function courseToForm(course: Course): CourseForm {
  return {
    name: course.name,
    description: course.description,
    course_fees: 0, // Default value since Course doesn't have this field
    start_date: course.course_start ? new Date(course.course_start as string).toISOString().slice(0, 10) : "",
    end_date: course.course_end ? new Date(course.course_end as string).toISOString().slice(0, 10) : ""
  };
}

// Helper to map CourseForm to backend payload
interface CoursePayload {
  name: string;
  description: string;
  course_start: Date;
  course_end: Date;
  duration_months: number;
  batches: string[];
  students_count: number;
  status: string;
}

function formToPayload(form: CourseForm): CoursePayload {
  return {
    name: form.name,
    description: form.description,
    course_start: new Date(form.start_date),
    course_end: new Date(form.end_date),
    duration_months:
      form.start_date && form.end_date
        ? ((new Date(form.end_date).getFullYear() - new Date(form.start_date).getFullYear()) * 12 + (new Date(form.end_date).getMonth() - new Date(form.start_date).getMonth()))
        : 0,
    batches: [],
    students_count: 0,
    status: "Active"
  };
}

const getCourseIcon = (courseName: string) => {
  if (courseName.toLowerCase().includes('web')) return Code;
  if (courseName.toLowerCase().includes('mobile')) return Smartphone;
  if (courseName.toLowerCase().includes('data')) return LineChart;
  if (courseName.toLowerCase().includes('ui')) return Palette;
  return Code;
};

export default function CoursesPage() {
  const { hasPermission } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [batchesByCourse, setBatchesByCourse] = useState<Record<string, string[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editCourseData, setEditCourseData] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Check permissions
  const canEdit = hasPermission("canEditCourses");

  const toUICourse = (c: CourseDTO): Course => ({
    _id: String(c._id || ""),
    name: c.name,
    description: c.description,
    duration_months: c.duration_months ?? 0,
    batches: c.batches ?? [],
    students_count: c.students_count ?? 0,
    status: c.status === 'Active' ? 'Active' : 'Pending',
    course_start: c.course_start,
    course_end: c.course_end,
  });

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      try {
        const data = await getCourses(page, limit);
        if (data.success) {
          setCourses(data.courses.map(toUICourse));
          setTotal(data.total);
        } else {
          const msg = (data as { message?: string }).message;
          setError(typeof msg === 'string' ? msg : 'Failed to fetch courses');
        }
    } catch {
      setError("Backend unreachable");
    }
      setLoading(false);
    }
    fetchCourses();
  }, [page, limit]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getBatchesByCourse();
        if (data?.success && mounted) {
          const map = (data.byCourse || []).reduce<Record<string, string[]>>((acc, item) => {
            acc[item._id] = item.batches || [];
            return acc;
          }, {});
          setBatchesByCourse(map);
        }
      } catch {
        // ignore; non-fatal for courses page
      }
    };
    load();
    const off = onBatchesChanged(() => {
      load();
    });
    return () => { mounted = false; if (off) off(); };
  }, []);

  const handleAddCourse = async (form: CourseForm) => {
    try {
      await addCourse(formToPayload(form));
      setPage(1);
      setToast("Course created successfully.");
      setTimeout(() => setToast(null), 2500);
      // Refetch courses
      const data = await getCourses(1, limit);
      if (data.success) {
        setCourses(data.courses.map(toUICourse));
        setTotal(data.total);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEditCourse = async (form: CourseForm) => {
    if (!editCourseData) return;
    await editCourse(editCourseData._id, formToPayload(form));
    setEditCourseData(null);
    setPage(1);
    setToast("Course edited successfully.");
    setTimeout(() => setToast(null), 2500);
    // Refetch courses
    const data = await getCourses(1, limit);
    if (data.success) {
      setCourses(data.courses.map(toUICourse));
      setTotal(data.total);
    }
  };

  // Delete disabled: courses can only be archived

  const handleArchiveCourse = async () => {
    if (!archiveId) return;
    await archiveCourse(archiveId);
    setArchiveId(null);
    setToast("Course archived successfully.");
    setTimeout(() => setToast(null), 2500);
    // Refetch courses
    setLoading(true);
    try {
      const data = await getCourses(page, limit);
      if (data.success) {
        setCourses(data.courses.map(toUICourse));
        setTotal(data.total);
      } else {
        const msg = (data as { message?: string }).message;
        setError(typeof msg === 'string' ? msg : 'Failed to fetch courses');
      }
    } catch {
      setError("Backend unreachable");
    }
    setLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher"]}>
      <div className="min-h-screen bg-[#F8F9FD]">
        <Sidebar />
        <Navbar />
      <AddCourseModal
        open={modalOpen || !!editCourseData}
        onClose={() => { setModalOpen(false); setEditCourseData(null); }}
        onSave={editCourseData ? handleEditCourse : handleAddCourse}
        initialData={editCourseData ? courseToForm(editCourseData) : undefined}
      />
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-[#2563EB] text-white px-6 py-3 rounded-lg shadow-lg animate-fadein">
          {toast}
        </div>
      )}
      <main className="lg:ml-64 pt-20 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-[24px] font-semibold mb-1 text-[#101828]">Course Management</h1>
            <p className="text-sm sm:text-base text-[#475467]">Manage and organize all courses</p>
          </div>
          {canEdit && (
            <button 
              className="w-full sm:w-auto bg-[#2970FF] text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 flex items-center justify-center sm:justify-start gap-2 text-sm font-medium cursor-pointer" 
              onClick={() => setModalOpen(true)}
            >
              <Plus size={20} />
              Add Course
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#EAECF0] overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0]">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">COURSE NAME</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">DURATION</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">NO. OF BATCHES</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">BATCHES</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">NO. OF STUDENTS</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">STATUS</th>
                  {canEdit && <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467] tracking-wider">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-[#475467]">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-[#EF4444]">{error}</td></tr>
                ) : courses.length === 0 ? (
                  <tr><td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-[#475467]">No courses found.</td></tr>
                ) : (
                  courses.map((course: Course) => {
                    const Icon = getCourseIcon(course.name);
                    return (
                      <tr key={course._id} className="border-b border-[#EAECF0] hover:bg-[#F9FAFB]">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${
                              course.name.toLowerCase().includes('web') ? 'bg-[#EEF4FF]' : 
                              course.name.toLowerCase().includes('mobile') ? 'bg-[#ECFDF3]' : 
                              course.name.toLowerCase().includes('data') ? 'bg-[#F4F3FF]' : 
                              'bg-[#FFF4ED]'
                            } flex items-center justify-center`}>
                              <Icon className={`${
                                course.name.toLowerCase().includes('web') ? 'text-[#2970FF]' : 
                                course.name.toLowerCase().includes('mobile') ? 'text-[#12B76A]' : 
                                course.name.toLowerCase().includes('data') ? 'text-[#7A5AF8]' : 
                                'text-[#FF6938]'
                              }`} size={20} />
                            </div>
                            <div>
                              <div className="font-medium text-[#101828]">{course.name}</div>
                              <div className="text-sm text-[#475467]">{course.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[#475467]">{course.duration_months ? `${course.duration_months} Months` : "-"}</td>
                        <td className="py-4 px-6 text-[#475467]">{Array.from(new Set((batchesByCourse[course._id] || []).map((n) => String(n)))).length}</td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {(() => {
                              const names = Array.from(new Set((batchesByCourse[course._id] || []).map((n) => String(n))));
                              return names.length > 0 ? (
                                names.map((batch, idx) => (
                                  <span key={`${course._id}-${idx}`} className={`px-2 py-1 rounded text-xs font-medium ${
                                  course.name.toLowerCase().includes('web') ? 'bg-[#EEF4FF] text-[#2970FF]' : 
                                  course.name.toLowerCase().includes('mobile') ? 'bg-[#ECFDF3] text-[#12B76A]' : 
                                  course.name.toLowerCase().includes('data') ? 'bg-[#F4F3FF] text-[#7A5AF8]' : 
                                  'bg-[#FFF4ED] text-[#FF6938]'
                                }`}>
                                    {batch}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#98A2B3] text-sm">-</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[#475467]">{course.students_count || 0}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            course.status === 'Active' ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF3C7] text-[#B45309]'
                          }`}>
                            {course.status || 'Pending'}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button 
                                className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors cursor-pointer" 
                                onClick={() => setEditCourseData(course)}
                                title="Edit course"
                              >
                                <Pencil size={16} className="text-[#475467]" />
                              </button>
                              <button 
                                className="p-2 hover:bg-yellow-50 rounded-lg transition-colors cursor-pointer" 
                                onClick={() => setArchiveId(course._id)}
                                title="Archive course"
                              >
                                <Archive size={16} className="text-[#B45309]" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination Controls */}
        {total > 10 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
              <button
                key={i + 1}
                className={`px-3 py-1 rounded transition-colors ${
                  page === i + 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              disabled={page === Math.ceil(total / limit)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}

        {/* Delete disabled intentionally */}

        {/* Archive Confirmation Modal */}
        {archiveId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4 text-[#B45309]">Archive Course?</h2>
              <p className="mb-6 text-[#475467]">Are you sure you want to archive this course? It will be hidden from the list.</p>
              <div className="flex gap-4 justify-end">
                <button 
                  className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" 
                  onClick={() => setArchiveId(null)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 rounded bg-[#B45309] text-white hover:bg-[#92400E] transition-colors" 
                  onClick={handleArchiveCourse}
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </ProtectedRoute>
  );
}