"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { getExams, deleteExam, completeExam, ExamDTO } from "@/lib/api";
import AddExamModal from "./AddExamModal";
import EditExamModal from "./EditExamModal";
import BulkUploadExamsModal from "./BulkUploadExamsModal";
import { useAuth } from "@/components/auth/AuthProvider";

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
}

export default function ExamsTab() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("canEditExams");
  
  const [exams, setExams] = useState<ExamDTO[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamDTO | null>(null);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    filterExams();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, exams]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const result = await getExams(1, 100);
      setExams(result.exams);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];

    if (searchQuery) {
      filtered = filtered.filter(
        (exam) =>
          exam.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((exam) => exam.status === statusFilter);
    }

    setFilteredExams(filtered);
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this exam? All results will also be deleted."
      )
    ) {
      try {
        await deleteExam(id);
        fetchExams();
      } catch {
        alert("Failed to delete exam");
      }
    }
  };

  const handleComplete = async (id: string) => {
    if (
      confirm("Mark this exam as completed? It will move to Results section.")
    ) {
      try {
        await completeExam(id);
        fetchExams();
      } catch {
        alert("Failed to complete exam");
      }
    }
  };

  const handleEdit = (exam: ExamDTO) => {
    setEditingExam(exam);
  };

  const getBatchName = (batchId: Record<string, unknown> | string | undefined) => {
    if (typeof batchId === "object" && batchId?.name) {
      return batchId.name as string;
    }
    return "Unknown Batch";
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getExamTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      on_theory: "Online Theory",
      off_theory: "Offline Theory",
      on_mcq: "Online MCQ",
      off_mcq: "Offline MCQ",
    };
    return labels[type] || type;
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExams = filteredExams.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Failed Entries Alert */}
      {failedEntries.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                Failed to Upload {failedEntries.length} Exam(s)
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {failedEntries.map((entry, idx) => (
                  <p key={idx} className="text-xs text-yellow-800">
                    Row {entry.row}: {entry.error}
                  </p>
                ))}
              </div>
              <button
                onClick={() => setFailedEntries([])}
                className="mt-3 text-xs font-medium text-yellow-700 hover:text-yellow-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams by topic or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {canEdit && (
            <>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium shadow-sm text-sm whitespace-nowrap"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm text-sm whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Exam
              </button>
            </>
          )}
        </div>
      </div>

      {/* Exams Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="border-b border-[#EAECF0] bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[18%]">
                  TOPIC & SUBJECT
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">
                  BATCH
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[14%]">
                  EXAM TYPE
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[14%]">
                  DATE
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">
                  DURATION
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">
                  TOTAL MARKS
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">
                  STATUS
                </th>
                {canEdit && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[16%]">
                    ACTIONS
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-4 py-12 text-center text-sm text-[#475467]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      Loading exams...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-4 py-12 text-center text-sm text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-4 py-12 text-center text-sm text-[#475467]"
                  >
                    No exams found
                  </td>
                </tr>
              ) : (
                paginatedExams.map((exam) => (
                  <tr key={exam._id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#101828] truncate">
                          {exam.topic}
                        </div>
                        <div className="text-xs text-[#667085] truncate mt-1">
                          {exam.subject}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#101828] truncate">
                        {getBatchName(exam.batch_id)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200 whitespace-nowrap">
                        {getExamTypeLabel(exam.exam_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-[#101828]">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{formatDate(exam.date)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {exam.duration ? (
                        <span className="text-sm text-[#101828]">{exam.duration}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-[#101828]">
                        {exam.total_marks}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${getStatusColor(
                          exam.status || "scheduled"
                        )}`}
                      >
                        {exam.status || "scheduled"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {exam.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => handleComplete(exam._id!)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Mark as completed"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleEdit(exam)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit exam"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(exam._id!)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete exam"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredExams.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-[#101828] font-medium">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredExams.length)} of{" "}
              {filteredExams.length} exams
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "text-[#101828] border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-[#101828]">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm text-[#475467]">Loading exams...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
            <p className="text-sm text-[#475467]">No exams found</p>
          </div>
        ) : (
          paginatedExams.map((exam) => (
            <div
              key={exam._id}
              className="bg-white rounded-xl border border-[#EAECF0] p-4"
            >
              {/* Header */}
              <div className="pb-3 border-b border-gray-100">
                <h3 className="font-semibold text-[#101828] text-base">
                  {exam.topic}
                </h3>
                <p className="text-sm text-[#667085] mt-1">{exam.subject}</p>
              </div>

              {/* Details */}
              <div className="space-y-3 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#667085] font-medium">
                    Batch
                  </span>
                  <span className="text-sm text-[#101828] font-medium">
                    {getBatchName(exam.batch_id)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#667085] font-medium">
                    Exam Type
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                    {getExamTypeLabel(exam.exam_type)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#667085] font-medium">
                    Date
                  </span>
                  <div className="flex items-center gap-1.5 text-sm text-[#101828]">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(exam.date)}
                  </div>
                </div>

                {exam.duration && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#667085] font-medium">
                      Duration
                    </span>
                    <span className="text-sm text-[#101828]">
                      {exam.duration}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#667085] font-medium">
                    Total Marks
                  </span>
                  <span className="text-sm font-semibold text-[#101828]">
                    {exam.total_marks}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#667085] font-medium">
                    Status
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusColor(
                      exam.status || "scheduled"
                    )}`}
                  >
                    {exam.status || "scheduled"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
                  {exam.status === "scheduled" && (
                    <>
                      <button
                        onClick={() => handleComplete(exam._id!)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleEdit(exam)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(exam._id!)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination - Mobile */}
        {filteredExams.length > 0 && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs text-[#101828] font-medium">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredExams.length)} of{" "}
              {filteredExams.length} exams
            </p>
            <div className="flex gap-1 flex-wrap justify-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "text-[#101828] border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-[#101828]">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddExamModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchExams();
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadExamsModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={(failedData) => {
            setShowBulkUpload(false);
            if (failedData && failedData.length > 0) {
              setFailedEntries(failedData);
            }
            fetchExams();
          }}
        />
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSuccess={() => {
            setEditingExam(null);
            fetchExams();
          }}
        />
      )}
    </>
  );
}
