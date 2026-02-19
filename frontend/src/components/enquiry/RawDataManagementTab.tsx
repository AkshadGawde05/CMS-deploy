"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import BulkUploadEnquiryModal from "./BulkUploadEnquiryModal";
import AddEnquiryModal from "./AddEnquiryModal";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";
import { getRawEnquiries, deleteEnquiry, updateEnquiryStatus, type EnquiryDTO } from "@/lib/api";

type TabType = "rawdata" | "leads" | "contacted" | "action" | "outcome";

interface RawDataManagementTabProps {
  sources: string[];
  interests: string[];
  users: { _id: string; name: string; role: string }[];
  onAction?: () => void;
}

export default function RawDataManagementTab({ sources, interests, users, onAction }: RawDataManagementTabProps) {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [enquiries, setEnquiries] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDTO | null>(null);
  const [selectedEnquiries, setSelectedEnquiries] = useState<string[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 50;


  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching enquiries...");
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (interestFilter !== 'all') params.interest = interestFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await getRawEnquiries(params);
      console.log("📊 Enquiries response:", response);

      if (response && response.success) {
        setEnquiries(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.total || 1);
          setTotalRecords(response.pagination.totalRecords || 0);
        }
      } else {
        setEnquiries([]);
      }
      console.log("✅ Enquiries updated in state");
    } catch (error) {
      console.error("Failed to fetch enquiries", error);
      showToast({
        type: 'error',
        title: 'Failed to Load Data',
        message: 'Unable to fetch enquiries. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, interestFilter, assignedFilter, fromDate, toDate, showToast]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, interestFilter, assignedFilter, fromDate, toDate]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this enquiry?")) {
      try {
        await deleteEnquiry(id);
        showToast({
          type: 'success',
          title: 'Enquiry Deleted',
          message: 'Enquiry has been deleted successfully'
        });
        fetchEnquiries();
        onAction?.();
      } catch (error) {
        console.error("Failed to delete enquiry", error);
        showToast({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete enquiry. Please try again.'
        });
      }
    }
  };

  const handleMoveToLeads = async (id: string) => {
    try {
      await updateEnquiryStatus(id, 'cold_lead', 'Moved to cold leads');
      showToast({
        type: 'success',
        title: 'Moved to Leads',
        message: 'Enquiry has been moved to cold leads'
      });
      fetchEnquiries();
    } catch (error) {
      console.error("Failed to move enquiry to leads", error);
      showToast({
        type: 'error',
        title: 'Move Failed',
        message: 'Failed to move enquiry to leads. Please try again.'
      });
    }
  };

  const handleBulkMoveToLeads = async () => {
    if (selectedEnquiries.length === 0) return;

    try {
      for (const id of selectedEnquiries) {
        await updateEnquiryStatus(id, 'cold_lead', 'Bulk moved to cold leads');
      }
      showToast({
        type: 'success',
        title: 'Bulk Move Complete',
        message: `${selectedEnquiries.length} enquiries moved to cold leads`
      });
      setSelectedEnquiries([]);
      fetchEnquiries();
    } catch (error) {
      console.error("Failed to move enquiries to leads", error);
      showToast({
        type: 'error',
        title: 'Bulk Move Failed',
        message: 'Failed to move enquiries to leads. Please try again.'
      });
    }
  };

  // No longer need client-side filtering since API handles it
  const filteredEnquiries = enquiries;

  const handleSelectAll = () => {
    if (selectedEnquiries.length === filteredEnquiries.length) {
      setSelectedEnquiries([]);
    } else {
      setSelectedEnquiries(filteredEnquiries.map(e => e._id));
    }
  };

  const isSelected = (id: string) => selectedEnquiries.includes(id);

  const handleSelectEnquiry = (id: string) => {
    if (isSelected(id)) {
      setSelectedEnquiries(selectedEnquiries.filter(eid => eid !== id));
    } else {
      setSelectedEnquiries([...selectedEnquiries, id]);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Raw Data Management</h2>
          <p className="text-xs sm:text-sm text-gray-600">Manage raw enquiry data and move to leads</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {hasPermission("canEditUsers") && (
            <>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                Add Enquiry
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
        </div>

        {/* Source Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700"
          >
            <option value="all">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        {/* Interest Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700"
          >
            <option value="all">All Interests</option>
            {interests.map(interest => (
              <option key={interest} value={interest}>{interest}</option>
            ))}
          </select>
        </div>

        {/* Assigned To Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700"
          >
            <option value="all">All Assigned</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range - From */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>

        {/* Date Range - To */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => {
            setSearch("");
            setSourceFilter("all");
            setInterestFilter("all");
            setAssignedFilter("all");
            setFromDate("");
            setToDate("");
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear All Filters
        </button>

        {/* Bulk Actions */}
        {selectedEnquiries.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedEnquiries.length} selected
            </span>
            <button
              onClick={handleBulkMoveToLeads}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
            >
              <ArrowRight className="h-4 w-4" />
              Move to Leads
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={filteredEnquiries.length > 0 && selectedEnquiries.length === filteredEnquiries.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name & Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Interest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredEnquiries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No enquiries found
                </td>
              </tr>
            ) : (
              filteredEnquiries.map((enquiry) => (
                <tr key={enquiry._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected(enquiry._id)}
                      onChange={() => handleSelectEnquiry(enquiry._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {enquiry.fullName || `${enquiry.firstName || ''} ${enquiry.lastName || ''}`.trim() || enquiry.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {enquiry.phone}
                      </div>
                      {enquiry.email && (
                        <div className="text-sm text-gray-500">
                          {enquiry.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {enquiry.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {enquiry.interest}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enquiry.location || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(enquiry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setShowViewModal(true);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {hasPermission("canEditUsers") && (
                        <button
                          onClick={() => {
                            setSelectedEnquiry(enquiry);
                            setShowEditModal(true);
                          }}
                          className="p-1 text-gray-500 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleMoveToLeads(enquiry._id)}
                        className="p-1 text-gray-500 hover:text-green-600 transition"
                        title="Move to Leads"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      {hasPermission("canEditUsers") && (
                        <button
                          onClick={() => handleDelete(enquiry._id)}
                          className="p-1 text-gray-500 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Visible on smaller screens */}
      <div className="lg:hidden space-y-3 sm:space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            No enquiries found
          </div>
        ) : (
          filteredEnquiries.map((enquiry) => (
            <div key={enquiry._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              {/* Header with checkbox and name */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected(enquiry._id)}
                    onChange={() => handleSelectEnquiry(enquiry._id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-900 break-words">
                      {enquiry.fullName || `${enquiry.firstName || ''} ${enquiry.lastName || ''}`.trim() || enquiry.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{enquiry.phone}</div>
                    {enquiry.email && (
                      <div className="text-sm text-gray-600 break-all">{enquiry.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Source:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {enquiry.source}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Interest:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {enquiry.interest}
                  </span>
                </div>
                {enquiry.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Location:</span>
                    <span className="text-sm text-gray-900">{enquiry.location}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Date Added:</span>
                  <span className="text-sm text-gray-900">{new Date(enquiry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedEnquiry(enquiry);
                    setShowViewModal(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {hasPermission("canEditUsers") && (
                  <button
                    onClick={() => {
                      setSelectedEnquiry(enquiry);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => handleMoveToLeads(enquiry._id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                  title="Move to Leads"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>

                {hasPermission("canEditUsers") && (
                  <button
                    onClick={() => handleDelete(enquiry._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * LIMIT) + 1} to {Math.min(page * LIMIT, totalRecords)} of {totalRecords} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddEnquiryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchEnquiries();
          }}
        />
      )}

      {showEditModal && selectedEnquiry && (
        <EditEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEnquiry(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEnquiry(null);
            fetchEnquiries();
          }}
        />
      )}

      {showViewModal && selectedEnquiry && (
        <ViewEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowViewModal(false);
            setSelectedEnquiry(null);
          }}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadEnquiryModal
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={(failedEntries?: unknown[]) => {
            console.log("🎉 Bulk upload success callback triggered");
            setShowBulkUploadModal(false);
            console.log("🔄 Calling fetchEnquiries after bulk upload...");
            fetchEnquiries();
            onAction?.();
            if (!failedEntries || failedEntries.length === 0) {
              showToast({
                type: 'success',
                title: 'Bulk Upload Complete',
                message: 'All enquiries have been uploaded successfully'
              });
            }
          }}
        />
      )}
    </div>
  );
}