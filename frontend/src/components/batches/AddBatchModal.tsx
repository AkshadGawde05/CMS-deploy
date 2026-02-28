import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getAllCourses } from "@/lib/api";

interface BatchForm {
  course_id: string;
  name: string;
  subject: string;
  schedule: string;
  teacher_id?: string; // optional now
  syllabus_id?: string; // Add syllabus_id
  selectedDays: string[];
  startTime: string;
  endTime: string;
}

interface AddBatchModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (batch: BatchForm) => Promise<void>;
  initialData?: BatchForm;
}

interface Course {
  _id: string;
  name: string;
}

interface Syllabus {
  _id: string;
  batch_id: { _id: string; name: string };
  course_id: { _id: string; name: string };
  academic_year: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const defaultState: BatchForm = {
  course_id: "",
  name: "",
  subject: "",
  schedule: "",
  syllabus_id: "",
  // teacher_id intentionally omitted when empty
  selectedDays: [],
  startTime: "",
  endTime: "",
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Subjects are now fetched from the database - no hard-coded list

export default function AddBatchModal({ open, onClose, onSave, initialData }: AddBatchModalProps) {
  const [form, setForm] = useState<BatchForm>(defaultState);
  const [courses, setCourses] = useState<Course[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof BatchForm | "submit", string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSyllabi, setLoadingSyllabi] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCourses();
      if (initialData) {
        setForm(initialData);
      } else {
        setForm(defaultState);
      }
      setErrors({});
    }
  }, [open, initialData]);

  // Fetch syllabi when course is selected
  useEffect(() => {
    if (form.course_id) {
      fetchSyllabi(form.course_id);
    } else {
      setSyllabi([]);
      setForm(prev => ({ ...prev, syllabus_id: "" }));
    }
  }, [form.course_id]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await getAllCourses();
      if (data.success) {
        // Map only required fields to satisfy local Course interface
        setCourses(data.courses.map((c: { _id?: string; name: string }) => ({ _id: c._id || "", name: c.name })));
      }
    } catch {
      console.error("Failed to fetch courses");
    }
    setLoadingCourses(false);
  };

  const fetchSyllabi = async (courseId: string) => {
    setLoadingSyllabi(true);
    try {
      console.log(`🔍 Fetching syllabi for course: ${courseId}`);
      const response = await fetch(`${API_BASE}/api/syllabus?course_id=${courseId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      console.log(`📚 Syllabi response:`, data);
      if (data.success && Array.isArray(data.data)) {
        console.log(`✅ Found ${data.data.length} syllabi`);
        setSyllabi(data.data);
      } else {
        console.warn(`⚠️ No syllabi found for course ${courseId}`);
        setSyllabi([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch syllabi:", error);
      setSyllabi([]);
    }
    setLoadingSyllabi(false);
  };

  if (!open) return null;

  const validate = () => {
    const newErrors: Partial<Record<keyof BatchForm | "submit", string>> = {};
    if (!form.course_id) newErrors.course_id = "Course is required";
    if (!form.name.trim()) newErrors.name = "Batch name is required";
    if (form.selectedDays.length === 0) newErrors.selectedDays = "At least one day is required";
    if (!form.startTime) newErrors.startTime = "Start time is required";
    if (!form.endTime) newErrors.endTime = "End time is required";
    // Teacher and subject are optional
    return newErrors;
  };

  const handleDayToggle = (day: string) => {
    const updatedDays = form.selectedDays.includes(day)
      ? form.selectedDays.filter(d => d !== day)
      : [...form.selectedDays, day];
    setForm({ ...form, selectedDays: updatedDays });
  };

  const handleSave = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setLoading(true);
    
    // Create schedule string from selected days and times
    const scheduleData = {
      days: form.selectedDays,
      startTime: form.startTime,
      endTime: form.endTime
    };

    // Build payload without empty teacher_id to avoid ObjectId cast error on backend
    const { teacher_id, syllabus_id, ...rest } = form;
    const payload: BatchForm = {
      ...rest,
      ...(teacher_id ? { teacher_id } : {}),
      ...(syllabus_id ? { syllabus_id } : {}),
      schedule: JSON.stringify(scheduleData)
    } as BatchForm;

    try {
      console.log("=== FRONTEND BATCH SUBMISSION ===");
      console.log("Form data:", form);
      console.log("Payload being sent:", payload);
      
      await onSave(payload);
      setLoading(false);
      onClose();
    } catch (error: unknown) {
      console.error("=== FRONTEND BATCH SUBMISSION ERROR ===");
      console.error("Error:", error);
      setLoading(false);
      // Try to extract backend error message safely
      let message = "Failed to save batch. Try again.";
      if (typeof error === "object" && error !== null) {
        const maybeAxios = error as { response?: { data?: { message?: string } } };
        message = maybeAxios.response?.data?.message || message;
      }
      if (message === "Failed to save batch. Try again." && error instanceof Error) {
        message = error.message || message;
      }
      setErrors({ submit: message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto p-8 relative animate-fadein max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 8px 32px rgba(16, 24, 40, 0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-6 right-6" onClick={onClose}>
          <X size={24} className="text-[#6B7280]" />
        </button>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#101828]">{initialData ? "Edit Batch" : "Add New Batch"}</h2>
        </div>

        <form className="space-y-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">Course</label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className={`w-full bg-white border ${errors.course_id ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150`}
              disabled={loadingCourses}
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
            {errors.course_id && <div className="text-xs text-[#EF4444] mt-1">{errors.course_id}</div>}
          </div>

          {/* Batch Name */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">Batch Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full bg-white border ${errors.name ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150`}
              placeholder="Enter batch name"
            />
            {errors.name && <div className="text-xs text-[#EF4444] mt-1">{errors.name}</div>}
          </div>

          {/* Syllabus */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Syllabus 
              {form.course_id && (
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (for {courses.find(c => c._id === form.course_id)?.name})
                </span>
              )}
              {form.course_id && !loadingSyllabi && syllabi.length === 0 && (
                <span className="text-xs text-amber-600 ml-2">(No syllabus created for this course yet)</span>
              )}
            </label>
            <select
              value={form.syllabus_id || ""}
              onChange={(e) => setForm({ ...form, syllabus_id: e.target.value })}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[16px] text-[#1F2937] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!form.course_id || loadingSyllabi}
            >
              <option value="">
                {!form.course_id 
                  ? "Select a course first" 
                  : loadingSyllabi 
                  ? "Loading syllabi..." 
                  : syllabi.length === 0 
                  ? "No syllabus available"
                  : "Select Syllabus (Optional)"}
              </option>
              {syllabi.map((syllabus) => (
                <option key={syllabus._id} value={syllabus._id}>
                  {syllabus.batch_id?.name || `Academic Year ${syllabus.academic_year}`} - {syllabus.academic_year}
                </option>
              ))}
            </select>
            <div className="text-xs text-[#6B7280] mt-1">
              {form.course_id 
                ? syllabi.length === 0
                  ? "Create a syllabus from the Syllabus page first"
                  : "Select a syllabus or leave empty to create later"
                : "Select a course to see available syllabi"}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-3">Schedule</label>
            
            {/* Days */}
            <div className="mb-4">
              <div className="text-sm font-medium text-[#374151] mb-2">Days</div>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.selectedDays.includes(day)
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.selectedDays && <div className="text-xs text-[#EF4444] mt-1">{errors.selectedDays}</div>}
            </div>

            {/* Time */}
            <div>
              <div className="text-sm font-medium text-[#374151] mb-2">Time</div>
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className={`w-full bg-white border ${errors.startTime ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150`}
                  />

                </div>
                <span className="text-[#6B7280]">-</span>
                <div className="flex-1 relative">
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className={`w-full bg-white border ${errors.endTime ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150`}
                  />

                </div>
              </div>
              <div className="text-xs text-[#6B7280] mt-1">Start time - End time</div>
              {(errors.startTime || errors.endTime) && (
                <div className="text-xs text-[#EF4444] mt-1">
                  {errors.startTime || errors.endTime}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg bg-[#F3F4F6] text-[#374151] font-medium hover:bg-[#E5E7EB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[#2563EB] text-white font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-white">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="17,21 17,13 7,13 7,21"/>
                <polyline stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="7,3 7,8 15,8"/>
              </svg>
              {loading ? "Saving..." : "Save Batch"}
            </button>
          </div>

          {errors.submit && <div className="text-xs text-[#EF4444] mt-2 text-center">{errors.submit}</div>}
        </form>
      </div>
    </div>
  );
}