"use client";
import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AddBatchModal from "@/components/batches/AddBatchModal";
import BatchSyllabusModal from "@/components/syllabus/BatchSyllabusModal";
import { getBatches, addBatch, editBatch, archiveBatch } from "@/lib/api";
import type { BatchDTO } from "@/lib/api";
import { Search, Plus, Edit, Users, Archive } from "lucide-react";

interface BatchForm {
  course_id: string;
  name: string;
  subject: string;
  schedule: string; // JSON string
  teacher_id?: string; // optional for now (backend allows missing)
  selectedDays: string[];
  startTime: string;
  endTime: string;
}

interface Batch {
  _id: string;
  name: string;
  course_id: { _id: string; name: string } | null;
  teacher_id?: { _id: string; name: string } | null;
  schedule: string; // stored as JSON string in backend
  students_count?: number; // future enhancement
  fees_collected?: number; // placeholder until backend provides
  total_fees?: number; // placeholder
  test_completed?: number; // placeholder
  test_total?: number; // placeholder
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [editBatchData, setEditBatchData] = useState<Batch | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);
  const [selectedBatchForSyllabus, setSelectedBatchForSyllabus] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const toUIBatch = (b: BatchDTO): Batch => ({
    _id: String(b._id || ""),
    name: b.name,
    course_id: typeof b.course_id === 'string' ? { _id: b.course_id, name: '' } : (b.course_id || null),
    teacher_id: typeof b.teacher_id === 'string' ? { _id: b.teacher_id, name: '' } : (b.teacher_id || null),
    schedule: b.schedule,
    students_count: b.students_count,
    fees_collected: b.fees_collected,
    total_fees: b.total_fees,
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const data = await getBatches(page, limit);
      if (data.success) {
        setBatches(data.batches.map(toUIBatch));
        setTotal(data.total);
        setError("");
      } else {
        const maybeMessage: unknown = (data as unknown as { message?: string }).message;
        setError(typeof maybeMessage === 'string' ? maybeMessage : "Failed to fetch batches");
      }
    } catch {
      setError("Failed to fetch batches");
    }
    setLoading(false);
  };

  const handleAddBatch = async (batch: BatchForm) => {
    try {
      const data = await addBatch(batch);
      if (data.success) {
        setModalOpen(false);
        setEditBatchData(null);
        setPage(1);
        setToast("Batch created successfully.");
        setTimeout(() => setToast(null), 2500);
        fetchBatches();
      } else {
        throw new Error("Failed to add batch");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEditBatch = async (batch: BatchForm) => {
    if (!editBatchData) return;
    await editBatch(editBatchData._id, batch);
    setEditBatchData(null);
    setModalOpen(false);
    setPage(1);
    setToast("Batch edited successfully.");
    setTimeout(() => setToast(null), 2500);
    fetchBatches();
  };

  // Delete disabled: batches can only be archived

  const handleArchiveBatch = async () => {
    if (!archiveId) return;
    await archiveBatch(archiveId);
    setArchiveId(null);
    setToast("Batch archived successfully.");
    setTimeout(() => setToast(null), 2500);
    fetchBatches();
  };

  // const getSubjectColor = (subject: string) => {
  //   const colors: { [key: string]: string } = {
  //     Mathematics: "bg-blue-100 text-blue-800",
  //     Physics: "bg-purple-100 text-purple-800",
  //     Chemistry: "bg-green-100 text-green-800",
  //     Biology: "bg-red-100 text-red-800",
  //     English: "bg-yellow-100 text-yellow-800",
  //   };
  //   return colors[subject] || "bg-gray-100 text-gray-800";
  // };



  // Parse schedule helper
  const parseSchedule = (schedule: string): { days: string[]; start?: string; end?: string } => {
    try {
      const parsed = JSON.parse(schedule);
      if (parsed && Array.isArray(parsed.days)) return parsed;
      return { days: [] };
    } catch {
      return { days: [] };
    }
  };

  // Filter
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.name.toLowerCase().includes(searchTerm.toLowerCase()) || (batch.course_id?.name && batch.course_id.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = courseFilter === 'all' || courseFilter === 'All Courses' || (batch.course_id?.name && batch.course_id.name === courseFilter);
    return matchesSearch && matchesCourse;
  });

  const uniqueCourses = Array.from(new Set(batches.map(b => b.course_id?.name).filter(Boolean))) as string[];

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher"]}>
      <div className="min-h-screen bg-[#F8F9FD]">
        <Sidebar />
        <Navbar />
      <AddBatchModal
        open={modalOpen || !!editBatchData}
        onClose={() => { setModalOpen(false); setEditBatchData(null); }}
        onSave={editBatchData ? handleEditBatch : handleAddBatch}
        initialData={editBatchData ? {
          course_id: editBatchData.course_id?._id || "",
          name: editBatchData.name,
          subject: "",
          schedule: editBatchData.schedule,
          teacher_id: editBatchData.teacher_id?._id || undefined,
          selectedDays: [],
          startTime: "",
          endTime: ""
        } : undefined}
      />

      {selectedBatchForSyllabus && (
        <BatchSyllabusModal
          batchId={selectedBatchForSyllabus.id}
          batchName={selectedBatchForSyllabus.name}
          isOpen={syllabusModalOpen}
          onClose={() => {
            setSyllabusModalOpen(false);
            setSelectedBatchForSyllabus(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-[#2563EB] text-white px-6 py-3 rounded-lg shadow-lg animate-fadein">{toast}</div>
      )}
      
      <main className="lg:ml-64 pt-20 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-[24px] font-semibold mb-1 text-[#101828]">Batches</h1>
            <p className="text-sm sm:text-base text-[#475467]">Manage your course batches {/* and student groups*/} here</p>
          </div>
          <button 
            className="w-full sm:w-auto bg-[#2970FF] text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 flex items-center justify-center sm:justify-start gap-2 text-sm font-medium cursor-pointer"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={20} />
            Add Batch
          </button>
        </div>

        {/* Batch Management Section */}
        <div className="bg-white rounded-xl border border-[#EAECF0] mb-8">
          <div className="p-6 border-b border-[#EAECF0]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-[#101828]">Batch Management</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search batches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 text-gray-700"
                  />
                </div>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[20%]">BATCH NAME</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[15%]">COURSE</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">STUDENTS</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[25%]">FEES STATUS</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[15%]">TEST</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[15%]">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#475467]">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#EF4444]">{error}</td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#475467]">No batches found.</td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => {
                    const scheduleObj = parseSchedule(batch.schedule);
                    const feesPercent = batch.total_fees ? Math.round(((batch.fees_collected || 0) / batch.total_fees) * 100) : 0;
                    const feesBarWidth = Math.min(feesPercent, 100); // Cap at 100% for visual display
                    const testPercent = batch.test_total ? Math.round(((batch.test_completed || 0) / batch.test_total) * 100) : 0;
                    const testBarWidth = Math.min(testPercent, 100); // Cap at 100% for visual display
                    return (
                      <tr key={batch._id} className="border-b border-[#EAECF0] hover:bg-[#F9FAFB]">
                        <td className="py-3 px-4">
                          <div className="max-w-full">
                            <div className="font-medium text-[#101828] text-sm truncate">{batch.name}</div>
                            <div className="text-xs text-[#475467] truncate">{scheduleObj.days?.join(', ') || '-'}</div>
                            {scheduleObj.start && scheduleObj.end && (
                              <div className="text-[11px] text-[#667085]">{scheduleObj.start} - {scheduleObj.end}</div>
                            )}
                            {batch.teacher_id?.name && (
                              <div className="text-[11px] text-[#667085] truncate">👨‍🏫 {batch.teacher_id.name}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-[#101828] truncate">
                            {batch.course_id?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-[#475467] text-sm font-medium">{batch.students_count || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-[#101828] truncate">
                              ₹{(batch.fees_collected||0).toLocaleString()} / ₹{(batch.total_fees||0).toLocaleString()}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${feesBarWidth}%` }}></div>
                            </div>
                            <div className="text-xs text-[#475467]">{Math.min(feesPercent, 100)}% collected</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-[#101828]">
                              {batch.test_completed || 0} / {batch.test_total || 0}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${testBarWidth}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1.5 items-center">
                            <button className="p-1.5 hover:bg-[#F9FAFB] rounded-lg cursor-pointer transition-colors" onClick={() => setEditBatchData(batch)} title="Edit batch">
                              <Edit size={14} className="text-[#475467]" />
                            </button>
                            <button className="p-1.5 hover:bg-yellow-50 rounded-lg cursor-pointer transition-colors" onClick={() => setArchiveId(batch._id)} title="Archive batch">
                              <Archive size={14} className="text-[#B45309]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >Prev</button>
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
              <button
                key={i+1}
                className={`px-3 py-1 rounded transition-colors ${page === i+1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setPage(i+1)}
              >{i+1}</button>
            ))}
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              disabled={page === Math.ceil(total / limit)}
              onClick={() => setPage(page + 1)}
            >Next</button>
          </div>
        )}

  {/*
  Student Management Section (placeholder; future dynamic data)

  <div className="bg-white rounded-xl border border-[#EAECF0]">
    <div className="p-6 border-b border-[#EAECF0]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-[#101828]">
          Student Management
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search students..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         w-full sm:w-64 text-gray-700"
            />
          </div>

          <select className="px-4 py-2 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             text-gray-700">
            <option>All Batches</option>
          </select>
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#EAECF0] bg-gray-50">
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              STUDENT NAME
            </th>
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              CONTACT
            </th>
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              BATCH
            </th>
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              FEES STATUS
            </th>
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              TEST PROGRESS
            </th>
            <th className="text-left py-4 px-6 text-xs font-semibold text-[#475467]">
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="text-center py-8 text-[#475467]">
              No students found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
*/}

        {/* Delete disabled intentionally */}

        {/* Archive Confirmation Modal */}
        {archiveId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4 text-[#B45309]">Archive Batch?</h2>
              <p className="mb-6 text-[#475467]">Are you sure you want to archive this batch? It will be hidden from the list.</p>
              <div className="flex gap-4 justify-end">
                <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" onClick={() => setArchiveId(null)}>Cancel</button>
                <button className="px-4 py-2 rounded bg-[#B45309] text-white hover:bg-[#92400E] transition-colors" onClick={handleArchiveBatch}>Archive</button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </ProtectedRoute>
  );
}