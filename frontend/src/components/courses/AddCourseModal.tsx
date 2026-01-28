import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface CourseForm {
  name: string;
  description: string;
  course_fees: number;
  start_date: string;
  end_date: string;
}

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (course: CourseForm) => Promise<void>;
  initialData?: CourseForm;
}

const defaultState: CourseForm = {
  name: "",
  description: "",
  course_fees: 0,
  start_date: "",
  end_date: "",
};

export default function AddCourseModal({ open, onClose, onSave, initialData }: AddCourseModalProps) {
  const [form, setForm] = useState<CourseForm>(defaultState);
  const [errors, setErrors] = useState<Partial<Record<keyof CourseForm | "submit", string>>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof CourseForm, boolean>>>({});
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
    else setForm(defaultState);
    setErrors({});
    setTouched({});
    setShowWarning(false);
  }, [open, initialData]);

  if (!open) return null;

  const validate = () => {
    const newErrors: Partial<Record<keyof CourseForm | "submit", string>> = {};
    if (!form.name.trim()) newErrors.name = "Course name is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (form.course_fees === undefined || form.course_fees === null || isNaN(Number(form.course_fees))) newErrors.course_fees = "Valid course fees required";
    if (!form.start_date) newErrors.start_date = "Start date is required";
    if (!form.end_date) newErrors.end_date = "End date is required";
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) newErrors.end_date = "End date must be after start date";
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "number" ? Number(value) : value
    });
    setTouched({ ...touched, [name]: true });
  };

  const handleDateChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
    setTouched({ ...touched, [name]: true });
  };

  const handleClose = () => {
    if (Object.values(form).some((v) => v) && !showWarning) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);
    onClose();
  };

  const handleSave = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    setLoading(true);
    try {
      await onSave(form);
      setLoading(false);
      onClose();
    } catch {
      setLoading(false);
      setErrors({ submit: "Failed to save course. Try again." });
    }
  };

  // Calculate duration (not used)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-8 relative animate-fadein"
        style={{ boxShadow: "0 8px 32px rgba(16, 24, 40, 0.18)", minWidth: 350 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-6 right-6" onClick={handleClose}>
          <X size={24} className="text-[#6B7280]" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-[#EEF4FF] rounded-lg p-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2C7.03 2 3 6.03 3 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9Zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7Zm-1-7V7h2v4h-2Zm0 4h2v-2h-2v2Z" fill="#2970FF"/></svg>
          </span>
          <h2 className="text-xl font-semibold text-[#101828]">{initialData ? "Edit Course" : "Add New Course"}</h2>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Course Name <span className="text-[#EF4444]">*</span></label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className={`w-full bg-white border ${errors.name ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 h-12`}
              placeholder="Enter course name"
              autoFocus
            />
            {errors.name && <div className="text-xs text-[#EF4444] mt-1">{errors.name}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className={`w-full bg-white border ${errors.description ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 min-h-[80px]`}
              placeholder="Enter course description"
            />
            {errors.description && <div className="text-xs text-[#EF4444] mt-1">{errors.description}</div>}
          </div>
         {/* <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Course Fees <span className="text-[#EF4444]">*</span></label>
            <input
              name="course_fees"
              type="number"
              min="0"
              step="0.01"
              value={form.course_fees === undefined || form.course_fees === null ? "" : String(form.course_fees)}
              onChange={handleChange}
              className={`w-full bg-white border ${errors.course_fees ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 h-12"}`}
              placeholder="$ 0.00"
            />
            {errors.course_fees && <div className="text-xs text-[#EF4444] mt-1">{errors.course_fees}</div>}
          </div> */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#101828] mb-1">Start Date <span className="text-[#EF4444]">*</span></label>
              <div className="relative">
                <input
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={e => handleDateChange("start_date", e.target.value)}
                  className={`w-full bg-white border ${errors.start_date ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 h-12 pr-10`}
                  placeholder="dd/mm/yyyy"
                />

              </div>
              {errors.start_date && <div className="text-xs text-[#EF4444] mt-1">{errors.start_date}</div>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#101828] mb-1">End Date <span className="text-[#EF4444]">*</span></label>
              <div className="relative">
                <input
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={e => handleDateChange("end_date", e.target.value)}
                  className={`w-full bg-white border ${errors.end_date ? "border-[#EF4444]" : "border-[#E5E7EB]"} rounded-lg px-4 py-3 text-[16px] text-[#1F2937] placeholder-[#6B7280] focus:border-2 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-all duration-150 h-12 pr-10`}
                  placeholder="dd/mm/yyyy"
                />

              </div>
              {errors.end_date && <div className="text-xs text-[#EF4444] mt-1">{errors.end_date}</div>}
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <button type="button" className="px-5 py-2 rounded-lg bg-[#F3F4F6] text-[#101828] font-medium" onClick={handleClose}>Cancel</button>
            <button type="button" className="px-5 py-2 rounded-lg bg-[#2970FF] text-white font-medium flex items-center gap-2 disabled:opacity-60" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Course"}
            </button>
          </div>
          {errors.submit && <div className="text-xs text-[#EF4444] mt-2 text-center">{errors.submit}</div>}
        </form>
        {showWarning && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div className="bg-white rounded-lg p-6 shadow-xl text-center">
              <div className="text-[#101828] font-medium mb-2">Unsaved changes will be lost. Are you sure?</div>
              <div className="flex gap-4 justify-center mt-4">
                <button className="px-4 py-2 rounded bg-[#F3F4F6] text-[#101828]" onClick={() => setShowWarning(false)}>Go Back</button>
                <button className="px-4 py-2 rounded bg-[#F04438] text-white" onClick={() => { setShowWarning(false); onClose(); }}>Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}