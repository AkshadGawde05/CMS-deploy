"use client";

import { useState, useEffect } from "react";
import { X, Save, Check } from "lucide-react";
import { getResultsByExam, saveResult, ExamDTO } from "@/lib/api";

interface AddResultsModalProps {
  exam: ExamDTO;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentResult {
  student_id: string;
  student_name: string;
  marks_obtained: number | null;
  grade: string | null;
  result_id: string | null;
}

export default function AddResultsModal({ exam, onClose, onSuccess }: AddResultsModalProps) {
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedStudents, setSavedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const result = await getResultsByExam(exam._id!);
      setStudents(result.students);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (studentId: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, marks_obtained: value === "" ? null : parseFloat(value) }
          : s
      )
    );
    // Remove from saved set when marks are changed
    setSavedStudents(prev => {
      const newSet = new Set(prev);
      newSet.delete(studentId);
      return newSet;
    });
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, grade: value || null } : s))
    );
  };

  const handleSaveStudent = async (student: StudentResult) => {
    if (student.marks_obtained === null) {
      alert("Please enter marks for the student");
      return;
    }

    if (student.marks_obtained > (exam.total_marks || 100)) {
      alert(`Marks cannot exceed ${exam.total_marks}`);
      return;
    }

    try {
      setSaving(true);
      await saveResult({
        exam_id: exam._id!,
        student_id: student.student_id,
        marks_obtained: student.marks_obtained,
        grade: student.grade || undefined,
      });
      setSavedStudents(prev => new Set(prev).add(student.student_id));
    } catch (err: unknown) {
      alert(err instanceof Error && 'response' in err && typeof (err as Record<string, unknown>).response === 'object' && (err as Record<string, unknown>).response && 'data' in ((err as Record<string, unknown>).response as object) && typeof ((err as Record<string, unknown>).response as Record<string, unknown>).data === 'object' && ((err as Record<string, unknown>).response as Record<string, unknown>).data && 'message' in (((err as Record<string, unknown>).response as Record<string, unknown>).data as object) ? String((((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>).message) : "Failed to save result");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateGrade = (marks: number, total: number) => {
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "F";
  };

  const getBatchName = (batchId: Record<string, unknown> | string | undefined) => {
    if (typeof batchId === "object" && batchId?.name) {
      return batchId.name as string;
    }
    return "Unknown Batch";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-black-900">Add Results</h2>
            <p className="text-sm text-black-600 mt-1">
              {exam.topic} - {getBatchName(exam.batch_id)} (Total Marks: {exam.total_marks})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-black-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-black-500">No students found</div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  {/* Student Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black-900">
                      {student.student_name}
                    </p>
                  </div>

                  {/* Marks Input */}
                  <div className="w-32">
                    <input
                      type="number"
                      value={student.marks_obtained ?? ""}
                      onChange={(e) => handleMarksChange(student.student_id, e.target.value)}
                      placeholder="Marks"
                      min="0"
                      max={exam.total_marks}
                      step="0.5"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Grade Input */}
                  <div className="w-24">
                    <input
                      type="text"
                      value={student.grade || ""}
                      onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                      placeholder="Grade"
                      maxLength={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Auto-Calculate Grade Button */}
                  <button
                    onClick={() => {
                      if (student.marks_obtained !== null) {
                        const grade = calculateGrade(student.marks_obtained, exam.total_marks);
                        handleGradeChange(student.student_id, grade);
                      }
                    }}
                    disabled={student.marks_obtained === null}
                    className="px-3 py-2 text-xs font-medium text-black-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Auto-calculate grade"
                  >
                    Auto
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={() => handleSaveStudent(student)}
                    disabled={saving || student.marks_obtained === null}
                    className={`p-2 rounded-lg transition ${
                      savedStudents.has(student.student_id)
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={savedStudents.has(student.student_id) ? "Saved" : "Save"}
                  >
                    {savedStudents.has(student.student_id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-black-600">
              {savedStudents.size} of {students.length} results saved
            </p>
            <button
              onClick={onSuccess}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
