"use client";

import { useState, useEffect } from "react";
import { Search, Upload, Edit } from "lucide-react";
import { getExams, ExamDTO, ResultDTO } from "@/lib/api";
import AddResultsModal from "./AddResultsModal";
import BulkUploadResultsModal from "./BulkUploadResultsModal";
import { useAuth } from "@/components/auth/AuthProvider";

export default function ResultsTab() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("canEditExams");
  
  const [completedExams, setCompletedExams] = useState<ExamDTO[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamDTO | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Fetch exams on mount
  useEffect(() => {
    fetchCompletedExams();
  }, []);

  // Re-filter exams whenever searchQuery, studentId, or completedExams change
  useEffect(() => {
    filterExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, studentId, completedExams]);

  const fetchCompletedExams = async () => {
    try {
      setLoading(true);
      const result = await getExams(1, 100, { status: "completed" });
      setCompletedExams(result.exams);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch completed exams");
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...completedExams];

    // Filter by topic/subject search
    if (searchQuery) {
      filtered = filtered.filter(
        (exam) =>
          exam.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by student ID
    if (studentId) {
      filtered = filtered.filter((exam) =>
        exam.results?.some(
          (result: ResultDTO) =>
            typeof result.student_id === "string"
              ? result.student_id === studentId
              : result.student_id._id === studentId
        )
      );
    }

    setFilteredExams(filtered);
  };

  const getBatchName = (batchId: Record<string, unknown> | string | undefined) => {
    if (typeof batchId === "object" && batchId?.name) return batchId.name as string;
    return "Unknown Batch";
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getExamTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      on_theory: "Online Theory",
      off_theory: "Offline Theory",
      on_mcq: "Online MCQ",
      off_mcq: "Offline MCQ",
    };
    return labels[type] || type;
  };

  return (
    <>
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search completed exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
          />
        </div>

        <div className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Filter by student ID..."
            value={studentId || ""}
            onChange={(e) => setStudentId(e.target.value || null)}
            className="w-full pl-3 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
          />
        </div>

        <div className="text-sm text-gray-600 ml-0 md:ml-4">
          {completedExams.length} completed exam(s)
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Loading completed exams...
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No completed exams found. Mark exams as completed to add results.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam._id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {exam.topic}
                  </h3>
                  <p className="text-sm text-gray-600">{exam.subject}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                  {getExamTypeLabel(exam.exam_type)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Batch:</span>
                  <span className="font-medium text-gray-900">
                    {getBatchName(exam.batch_id)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(exam.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Marks:</span>
                  <span className="font-medium text-gray-900">
                    {exam.total_marks}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                {canEdit && (
                  <>
                    <button
                      onClick={() => setSelectedExam(exam)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit className="h-4 w-4" />
                      Add Results
                    </button>
                    <button
                      onClick={() => {
                        setSelectedExam(exam);
                        setShowBulkUpload(true);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition"
                      title="Bulk Upload"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </>
                )}
                {!canEdit && (
                  <div className="flex-1 text-center py-2 text-sm text-gray-500">
                    Exam Completed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedExam && !showBulkUpload && (
        <AddResultsModal
          exam={selectedExam}
          onClose={() => setSelectedExam(null)}
          onSuccess={() => {
            setSelectedExam(null);
            fetchCompletedExams();
          }}
        />
      )}

      {selectedExam && showBulkUpload && (
        <BulkUploadResultsModal
          exam={selectedExam}
          onClose={() => {
            setSelectedExam(null);
            setShowBulkUpload(false);
          }}
          onSuccess={() => {
            setSelectedExam(null);
            setShowBulkUpload(false);
            fetchCompletedExams();
          }}
        />
      )}
    </>
  );
}
