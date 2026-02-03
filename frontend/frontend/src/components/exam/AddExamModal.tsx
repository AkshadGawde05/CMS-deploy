"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createExam, getBatches, BatchDTO } from "@/lib/api";

interface AddExamModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExamModal({ onClose, onSuccess }: AddExamModalProps) {
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    batch_id: "",
    exam_type: "on_theory",
    subject: "",
    topic: "",
    date: "",
    duration: "",
    total_marks: "",
    exam_link: "", // Add this
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const result = await getBatches(1, 100);
      setBatches(result.batches);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isOnlineExam = () => {
    return formData.exam_type === "on_theory" || formData.exam_type === "on_mcq";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.batch_id || !formData.exam_type || !formData.subject || 
        !formData.topic || !formData.date || !formData.total_marks) {
      setError("All fields are required");
      return;
    }

    if (isOnlineExam() && !formData.exam_link) {
      setError("Exam link is required for online exams");
      return;
    }

    if (parseInt(formData.total_marks) <= 0) {
      setError("Total marks must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      const examData: Record<string, unknown> = {
        batch_id: formData.batch_id,
        exam_type: formData.exam_type,
        subject: formData.subject,
        topic: formData.topic,
        date: formData.date,
        duration: formData.duration || null,
        total_marks: parseInt(formData.total_marks),
        status: "scheduled",
      };

      if (isOnlineExam() && formData.exam_link) {
        examData.exam_link = formData.exam_link;
      }

      await createExam(examData);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error && 'response' in err && typeof (err as Record<string, unknown>).response === 'object' && (err as Record<string, unknown>).response && 'data' in ((err as Record<string, unknown>).response as object) && typeof ((err as Record<string, unknown>).response as Record<string, unknown>).data === 'object' && ((err as Record<string, unknown>).response as Record<string, unknown>).data && 'message' in (((err as Record<string, unknown>).response as Record<string, unknown>).data as object) ? String((((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>).message) : "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  const getBatchName = (batch: BatchDTO) => {
    const courseName = typeof batch.course_id === "object" ? batch.course_id.name : "";
    return `${batch.name} ${courseName ? `- ${courseName}` : ""}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Add New Exam</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Batch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Batch <span className="text-red-500">*</span>
            </label>
            <select
              name="batch_id"
              value={formData.batch_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" className="text-gray-500">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id} className="text-gray-900">
                  {getBatchName(batch)}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Exam Type <span className="text-red-500">*</span>
            </label>
            <select
              name="exam_type"
              value={formData.exam_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="on_theory" className="text-gray-900">Online Theory</option>
              <option value="off_theory" className="text-gray-900">Offline Theory</option>
              <option value="on_mcq" className="text-gray-900">Online MCQ</option>
              <option value="off_mcq" className="text-gray-900">Offline MCQ</option>
            </select>
          </div>

          {/* Exam Link - Only show for online exams */}
          {isOnlineExam() && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Exam Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="exam_link"
                value={formData.exam_link}
                onChange={handleChange}
                required={isOnlineExam()}
                placeholder="https://example.com/exam-link"
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Enter the URL where students can access the online exam
              </p>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="e.g., Mathematics, Physics"
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              required
              placeholder="e.g., Algebra, Mechanics"
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Date, Duration & Total Marks in Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Duration
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 2 hours"
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Optional (e.g., 2h, 90 mins)
              </p>
            </div>

            {/* Total Marks */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Total Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                required
                min="1"
                placeholder="e.g., 100"
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
