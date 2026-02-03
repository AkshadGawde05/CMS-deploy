"use client";

import React, { Fragment, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BatchDTO, CourseDTO, getAllBatches, getAllCourses, getStudentPayments } from "@/lib/api";
import RecordPaymentModal from "./accounts/RecordPaymentModal";

interface InstallmentRecord {
  student_id: string;
  student_name: string;
  student_phone: string;
  course_name: string;
  batch_name: string;
  fee_plan_id: string;
  installment_no: number;
  total_installments: number;
  due_date: string | Date;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: "paid" | "partial" | "pending" | "overdue" | string;
  last_paid_date?: string | Date;
  receipt_no?: string;
}

interface StudentGroupRow {
  student_id: string;
  student_name: string;
  student_phone: string;
  course_name: string;
  batch_name: string;
  inst_paid_count: number;
  inst_total: number;
  earliest_due_unpaid?: string | Date;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  status: "overdue" | "pending" | "paid";
  installments: InstallmentRecord[];
}

export default function StudentPaymentsSection() {
  const [groups, setGroups] = useState<StudentGroupRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);

  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCtx, setModalCtx] = useState<null | {
    student_id: string;
    student_name: string;
    student_phone?: string;
    course_name?: string;
    batch_name?: string;
    fee_plan_id: string;
    installment_no: number;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    overall_remaining?: number;
    due_date: string | Date;
  }>(null);

  useEffect(() => {
    fetchPaymentFilters();
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStudentPayments({
        course: courseFilter !== "all" ? courseFilter : undefined,
        batch: batchFilter !== "all" ? batchFilter : undefined,
        student: undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      const rows: InstallmentRecord[] = result?.paymentRecords || [];
      setGroups(groupByStudent(rows));
    } catch (err) {
      console.error("Error fetching payments:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [courseFilter, batchFilter, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const fetchPaymentFilters = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        getAllCourses(),
        getAllBatches(),
      ]);
      setCourses(coursesRes.courses || []);
      setBatches(batchesRes.batches || []);
    } catch (err) {
      console.error("Error fetching filters:", err);
    }
  };

  const groupByStudent = (rows: InstallmentRecord[]): StudentGroupRow[] => {
    const map = new Map<string, StudentGroupRow>();
    for (const r of rows) {
      const key = r.student_id;
      if (!map.has(key)) {
        map.set(key, {
          student_id: r.student_id,
          student_name: r.student_name,
          student_phone: r.student_phone,
          course_name: r.course_name,
          batch_name: r.batch_name,
          inst_paid_count: 0,
          inst_total: r.total_installments,
          earliest_due_unpaid: undefined,
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          status: "pending",
          installments: [],
        });
      }
      const g = map.get(key)!;
      g.installments.push(r);
      g.total_amount += r.amount || 0;
      g.total_paid += r.paid_amount || 0;
      g.total_remaining += r.remaining_amount || 0;
      if ((r.paid_amount || 0) > 0 || r.status === "paid") g.inst_paid_count += 1;
      if ((r.remaining_amount || 0) > 0) {
        const d = new Date(r.due_date);
        if (!g.earliest_due_unpaid || d < new Date(g.earliest_due_unpaid)) {
          g.earliest_due_unpaid = r.due_date;
        }
      }
    }

    const out: StudentGroupRow[] = [];
    for (const g of map.values()) {
      const hasOverdue = g.installments.some((r) => r.status === "overdue");
      const hasPendingOrPartial = g.installments.some(
        (r) => r.status === "pending" || r.status === "partial"
      );
      if (hasOverdue) g.status = "overdue";
      else if (hasPendingOrPartial) g.status = "pending";
      else g.status = "paid";

      g.installments.sort((a, b) => a.installment_no - b.installment_no);
      out.push(g);
    }

    out.sort((a, b) => {
      const maxA = Math.max(...a.installments.map((r) => new Date(r.due_date).getTime()));
      const maxB = Math.max(...b.installments.map((r) => new Date(r.due_date).getTime()));
      return maxB - maxA;
    });
    return out;
  };

  const formatDate = (date: string | Date) => new Date(date).toLocaleDateString("en-IN");
  
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-50 text-green-700 border-green-200",
      partial: "bg-yellow-50 text-yellow-700 border-yellow-200",
      pending: "bg-orange-50 text-orange-700 border-orange-200",
      overdue: "bg-red-50 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const openRecordModal = (row: InstallmentRecord, group: StudentGroupRow) => {
    const overallRemaining = Math.max(0, (group.total_amount || 0) - (group.total_paid || 0));
    setModalCtx({
      student_id: row.student_id,
      student_name: row.student_name,
      student_phone: row.student_phone,
      course_name: row.course_name,
      batch_name: row.batch_name,
      fee_plan_id: row.fee_plan_id,
      installment_no: row.installment_no,
      amount: row.amount,
      paid_amount: row.paid_amount,
      remaining_amount: row.remaining_amount,
      overall_remaining: overallRemaining,
      due_date: row.due_date,
    });
    setModalOpen(true);
  };

  const onPaymentSuccess = async () => {
    setModalOpen(false);
    await fetchPayments();
    if (expandedId) setExpandedId(expandedId);
    setSuccessMsg("Payment recorded successfully");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const clearFilters = () => {
    setCourseFilter("all");
    setBatchFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = courseFilter !== "all" || batchFilter !== "all" || statusFilter !== "all" || searchQuery.trim() !== "";

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((g) =>
      g.student_name.toLowerCase().includes(query) ||
      g.student_phone?.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, batchFilter, statusFilter, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalAmount = filteredGroups.reduce((sum, g) => sum + g.total_amount, 0);
    const totalPaid = filteredGroups.reduce((sum, g) => sum + g.total_paid, 0);
    const totalRemaining = filteredGroups.reduce((sum, g) => sum + g.total_remaining, 0);
    const overdueCount = filteredGroups.filter(g => g.status === "overdue").length;
    return { totalAmount, totalPaid, totalRemaining, overdueCount };
  }, [filteredGroups]);

  return (
    <div className="space-y-4">
      {/* Success Toast */}
        {successMsg && (
          <div className="fixed right-6 top-6 z-50 animate-fade-in-down rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Payments</h1>
            <p className="mt-1 text-sm text-gray-600">Manage and track student payment installments</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Amount</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-gray-900">₹{stats.totalAmount.toFixed(0)}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Paid</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-green-600">₹{stats.totalPaid.toFixed(0)}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Remaining</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-red-600">₹{stats.totalRemaining.toFixed(0)}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Overdue Students</p>
                <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-orange-600">{stats.overdueCount}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">Course</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={String(c._id)} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={String(b._id)} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 pl-9 sm:pl-10 text-xs sm:text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <svg
                  className="absolute left-2.5 sm:left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-sm text-gray-600">Loading payments...</p>
              </div>
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Course/Batch</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Installments</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Next Due</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Paid</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Remaining</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="mt-4 text-sm font-medium text-gray-900">No payment records found</p>
                          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedGroups.map((g) => (
                      <Fragment key={g.student_id}>
                        <tr className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                {g.student_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <Link
                                  href={`/students?student=${g.student_id}`}
                                  className="block font-medium text-gray-900 hover:text-blue-600"
                                >
                                  {g.student_name}
                                </Link>
                                <div className="text-sm text-gray-500">{g.student_phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{g.course_name}</div>
                            <div className="text-sm text-gray-500">{g.batch_name}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                              {g.inst_paid_count}/{g.inst_total}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {g.earliest_due_unpaid ? formatDate(g.earliest_due_unpaid) : "-"}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                            ₹{g.total_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                            ₹{g.total_paid.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                            ₹{g.total_remaining.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(g.status)}`}>
                              {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setExpandedId((prev) => (prev === g.student_id ? null : g.student_id))}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              {expandedId === g.student_id ? (
                                <>
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                  Hide
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  View
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Installment Details */}
                        {expandedId === g.student_id && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50 px-6 py-6">
                              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                                  <h3 className="text-sm font-semibold text-gray-900">Installment Details</h3>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Inst #</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Due Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Amount</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Paid</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Remaining</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Payment Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Receipt #</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {g.installments.map((r) => (
                                        <tr key={r.installment_id} className="transition-colors hover:bg-gray-50">
                                          <td className="px-4 py-3">
                                            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                              #{r.installment_no}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(r.due_date)}</td>
                                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                            ₹{r.amount.toFixed(2)}
                                          </td>
                                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                                            ₹{r.paid_amount.toFixed(2)}
                                          </td>
                                          <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">
                                            ₹{r.remaining_amount.toFixed(2)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadge(r.status)}`}>
                                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-900">
                                            {r.last_paid_date ? formatDate(r.last_paid_date) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-900">
                                            {r.receipt_no || <span className="text-gray-400">-</span>}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {r.remaining_amount > 0 ? (
                                              <button
                                                onClick={() => openRecordModal(r, g)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                                              >
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Record
                                              </button>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Paid
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                
                                {/* Summary Footer */}
                                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-8">
                                      <div>
                                        <p className="text-xs text-gray-500">Total Amount</p>
                                        <p className="text-sm font-semibold text-gray-900">₹{g.total_amount.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Total Paid</p>
                                        <p className="text-sm font-semibold text-green-600">₹{g.total_paid.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Total Remaining</p>
                                        <p className="text-sm font-semibold text-red-600">₹{g.total_remaining.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Payment Progress</p>
                                      <div className="mt-1 flex items-center gap-2">
                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                                          <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${Math.min((g.total_paid / g.total_amount) * 100, 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                          {Math.min(((g.total_paid / g.total_amount) * 100), 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3 p-3">
              {paginatedGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4 text-sm font-medium text-gray-900">No payment records found</p>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                paginatedGroups.map((g) => (
                  <div key={g.student_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Student Header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 flex-shrink-0">
                          {g.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/students?student=${g.student_id}`}
                            className="block font-medium text-gray-900 hover:text-blue-600 truncate"
                          >
                            {g.student_name}
                          </Link>
                          <div className="text-xs text-gray-500 mt-0.5">{g.student_phone}</div>
                          <div className="text-xs text-gray-700 font-medium mt-1">{g.course_name}</div>
                          <div className="text-xs text-gray-500">{g.batch_name}</div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap ${getStatusBadge(g.status)}`}>
                          {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Summary Info */}
                    <div className="p-4 bg-white border-b border-gray-200">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Installments</span>
                          <div className="font-semibold text-gray-900 mt-0.5">
                            {g.inst_paid_count}/{g.inst_total}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Next Due</span>
                          <div className="font-medium text-gray-900 mt-0.5">
                            {g.earliest_due_unpaid ? formatDate(g.earliest_due_unpaid) : "-"}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount</span>
                          <div className="font-semibold text-gray-900 mt-0.5">₹{g.total_amount.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Paid</span>
                          <div className="font-semibold text-green-600 mt-0.5">₹{g.total_paid.toFixed(2)}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Remaining</span>
                          <div className="font-semibold text-red-600 mt-0.5">₹{g.total_remaining.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Payment Progress</span>
                          <span className="font-semibold text-gray-900">{Math.min(((g.total_paid / g.total_amount) * 100), 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${Math.min((g.total_paid / g.total_amount) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId((prev) => (prev === g.student_id ? null : g.student_id))}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      {expandedId === g.student_id ? (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Hide Installments
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          View Installments
                        </>
                      )}
                    </button>

                    {/* Expanded Installments - Mobile */}
                    {expandedId === g.student_id && (
                      <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
                        {g.installments.map((r) => (
                          <div key={r.installment_id} className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  Inst #{r.installment_no}
                                </span>
                                <div className="text-xs text-gray-600 mt-1">Due: {formatDate(r.due_date)}</div>
                              </div>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadge(r.status)}`}>
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-gray-600">Amount</span>
                                <div className="font-semibold text-gray-900 mt-0.5">₹{r.amount.toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Paid</span>
                                <div className="font-semibold text-green-600 mt-0.5">₹{r.paid_amount.toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Remaining</span>
                                <div className="font-semibold text-red-600 mt-0.5">₹{r.remaining_amount.toFixed(2)}</div>
                              </div>
                            </div>

                            {(r.last_paid_date || r.receipt_no) && (
                              <div className="text-xs text-gray-600 mb-2">
                                {r.last_paid_date && <div>Paid: {formatDate(r.last_paid_date)}</div>}
                                {r.receipt_no && <div>Receipt: {r.receipt_no}</div>}
                              </div>
                            )}

                            {r.remaining_amount > 0 ? (
                              <button
                                onClick={() => openRecordModal(r, g)}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Record Payment
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-xs text-green-600 py-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Fully Paid
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            </>
          )}
        </div>

        {/* Results Count */}
        {!loading && filteredGroups.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(endIndex, filteredGroups.length)}</span> of <span className="font-semibold text-gray-900">{filteredGroups.length}</span> student{filteredGroups.length !== 1 ? 's' : ''}
            </p>
            {hasActiveFilters && (
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="font-medium text-blue-600">{filteredGroups.length}</span> of{' '}
                <span className="font-medium text-gray-900">{groups.length}</span> total records
              </p>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:px-6 py-3 sm:py-4">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">First</span>
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-1 sm:gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border text-xs sm:text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <span className="hidden sm:inline">Next</span>
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <span className="hidden sm:inline">Last</span>
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      {/* Record Payment Modal */}
      {modalOpen && modalCtx && (
        <RecordPaymentModal
          open={modalOpen}
          context={modalCtx}
          onClose={() => setModalOpen(false)}
          onSuccess={onPaymentSuccess}
        />
      )}
    </div>
  );
}