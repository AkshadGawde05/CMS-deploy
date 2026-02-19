"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Edit,
  Eye,
  Trash2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { getEnquiriesByStatus, updateEnquiryStatus, type EnquiryDTO, deleteEnquiry } from "@/lib/api";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";

interface OutcomeTabProps {
  sources: string[];
  interests: string[];
  users: { _id: string; name: string; role: string }[];
  onAction?: () => void;
}

export default function OutcomeTab({ sources, interests, users, onAction }: OutcomeTabProps) {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [enquiries, setEnquiries] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeType, setOutcomeType] = useState<'enrolled' | 'lost'>('enrolled');
  const [sourceFilter, setSourceFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDTO | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Selection and Pagination state
  const [selectedEnquiries, setSelectedEnquiries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 50;

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (sourceFilter !== "all") params.source = sourceFilter;
      if (interestFilter !== "all") params.interest = interestFilter;
      if (assignedFilter !== "all") params.assignedTo = assignedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await getEnquiriesByStatus(outcomeType, params);

      if (response && response.success) {
        setEnquiries(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.total || 1);
          setTotalRecords(response.pagination.totalRecords || 0);
        }
      } else {
        setEnquiries([]);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch outcome enquiries'
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, outcomeType, sourceFilter, interestFilter, assignedFilter, fromDate, toDate, showToast]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  useEffect(() => {
    setPage(1);
    setSelectedEnquiries([]);
  }, [search, outcomeType, sourceFilter, interestFilter, assignedFilter, fromDate, toDate]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this enquiry?")) {
      try {
        await deleteEnquiry(id);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Enquiry deleted successfully'
        });
        fetchEnquiries();
        onAction?.();
      } catch {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete enquiry'
        });
      }
    }
  };

  const handleMoveBack = async (id: string) => {
    try {
      await updateEnquiryStatus(id, 'interested', 'Moved back to interested');
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Moved back to interested'
      });
      fetchEnquiries();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to move back'
      });
    }
  };

  const handleBulkMoveBack = async () => {
    if (selectedEnquiries.length === 0) return;
    try {
      for (const id of selectedEnquiries) {
        await updateEnquiryStatus(id, 'interested', `Bulk moved back from outcome`);
      }
      showToast({
        type: 'success',
        title: 'Success',
        message: `${selectedEnquiries.length} enquiries moved back successfully`
      });
      setSelectedEnquiries([]);
      fetchEnquiries();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Bulk action failed'
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedEnquiries.length === enquiries.length) {
      setSelectedEnquiries([]);
    } else {
      setSelectedEnquiries(enquiries.map(e => e._id));
    }
  };

  const handleSelectEnquiry = (id: string) => {
    if (selectedEnquiries.includes(id)) {
      setSelectedEnquiries(selectedEnquiries.filter(eid => eid !== id));
    } else {
      setSelectedEnquiries([...selectedEnquiries, id]);
    }
  };

  const isSelected = (id: string) => selectedEnquiries.includes(id);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Outcome Tracking</h2>
          <p className="text-xs sm:text-sm text-gray-600">Track final outcomes - conversions and lost enquiries</p>
        </div>

        {selectedEnquiries.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
              {selectedEnquiries.length} selected
            </span>
            <button
              onClick={handleBulkMoveBack}
              className="whitespace-nowrap flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Move Back
            </button>
          </div>
        )}
      </div>

      {/* Outcome Type Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setOutcomeType('enrolled')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${outcomeType === 'enrolled'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            Enrolled
          </button>
          <button
            onClick={() => setOutcomeType('lost')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${outcomeType === 'lost'
              ? 'border-gray-500 text-gray-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <TrendingDown className="h-4 w-4" />
            Lost
          </button>
        </nav>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder={`Search ${outcomeType} enquiries...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
        </div>

        {/* Source Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700 bg-white"
          >
            <option value="all">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        {/* Interest Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700 bg-white"
          >
            <option value="all">All Interests</option>
            {interests.map(interest => (
              <option key={interest} value={interest}>{interest}</option>
            ))}
          </select>
        </div>

        {/* Assigned To Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-gray-700 bg-white"
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
          className="text-xs text-blue-600 hover:text-blue-800 font-medium lg:col-span-1"
        >
          Clear All Filters
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={enquiries.length > 0 && selectedEnquiries.length === enquiries.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name & Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source & Interest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : enquiries.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No enquiries found</td></tr>
            ) : (
              enquiries.map((enquiry) => (
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
                    <div className="text-sm font-medium text-gray-900">{enquiry.fullName || enquiry.name}</div>
                    <div className="text-sm text-gray-500">{enquiry.phone}</div>
                    {enquiry.email && <div className="text-sm text-gray-500">{enquiry.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 w-fit">{enquiry.source}</span>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">{enquiry.interest}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enquiry.convertedDate
                      ? new Date(enquiry.convertedDate).toLocaleDateString()
                      : new Date(enquiry.updatedAt).toLocaleDateString()
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setSelectedEnquiry(enquiry); setShowViewModal(true); }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => { setSelectedEnquiry(enquiry); setShowEditModal(true); }}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleMoveBack(enquiry._id)}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition"
                        title="Move Back"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-0.5 border-l border-gray-200 ml-1 pl-1">
                        <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"><Phone className="h-4 w-4" /></button>
                        <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"><MessageCircle className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(enquiry._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg p-6 text-center text-sm text-gray-500 border border-gray-200">Loading...</div>
        ) : enquiries.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-sm text-gray-500 border border-gray-200">No enquiries found</div>
        ) : (
          enquiries.map((enquiry) => (
            <div key={enquiry._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-100">
                <input
                  type="checkbox"
                  checked={isSelected(enquiry._id)}
                  onChange={() => handleSelectEnquiry(enquiry._id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {outcomeType === 'enrolled' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-gray-600" />
                    )}
                    <div className="text-base font-semibold text-gray-900 break-words">{enquiry.fullName || enquiry.name}</div>
                  </div>
                  <div className="text-sm text-gray-600">{enquiry.phone}</div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Source:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{enquiry.source}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Interest:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{enquiry.interest}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Outcome Date:</span>
                  <span className="text-sm text-gray-900">
                    {enquiry.convertedDate
                      ? new Date(enquiry.convertedDate).toLocaleDateString()
                      : new Date(enquiry.updatedAt).toLocaleDateString()
                    }
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1 pt-3 border-t border-gray-100">
                <button onClick={() => { setSelectedEnquiry(enquiry); setShowViewModal(true); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"><Eye className="h-4 w-4" /></button>
                <button onClick={() => { setSelectedEnquiry(enquiry); setShowEditModal(true); }} className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleMoveBack(enquiry._id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"><ChevronLeft className="h-4 w-4" /></button>
                <button className="p-2 text-green-600 hover:bg-green-50 rounded transition"><Phone className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(enquiry._id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4" /></button>
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
              onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && selectedEnquiry && (
        <EditEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => { setShowEditModal(false); setSelectedEnquiry(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedEnquiry(null); fetchEnquiries(); onAction?.(); }}
        />
      )}

      {showViewModal && selectedEnquiry && (
        <ViewEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => { setShowViewModal(false); setSelectedEnquiry(null); }}
        />
      )}
    </div>
  );
}