"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Edit, Eye, TrendingUp, TrendingDown, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getEnquiriesByStatus, updateEnquiryStatus, type EnquiryDTO } from "@/lib/api";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";

type TabType = "rawdata" | "leads" | "contacted" | "action" | "outcome";

interface OutcomeTabProps {
  onNavigate?: (tab: TabType) => void;
  counts?: { enrolled: number; lost: number };
}

export default function OutcomeTab({ onNavigate, counts = { enrolled: 0, lost: 0 } }: OutcomeTabProps) {
  const [enquiries, setEnquiries] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeType, setOutcomeType] = useState<'enrolled' | 'lost'>('enrolled');
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryDTO | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<EnquiryDTO | null>(null);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (search) params.search = search;
      
      const response = await getEnquiriesByStatus(outcomeType, params);
      setEnquiries(response.data);
    } catch (error) {
      console.error("Failed to fetch outcome enquiries:", error);
    } finally {
      setLoading(false);
    }
  }, [search, outcomeType]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateEnquiryStatus(id, newStatus, `Status updated to ${newStatus}`);
      fetchEnquiries();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleMoveBack = async (id: string) => {
    try {
      // Move back from outcome to action (interested status)
      await updateEnquiryStatus(id, 'interested', `Moved back to action from outcome`);
      fetchEnquiries();
    } catch {
      alert("Failed to move back");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => onNavigate?.("action")}
          className="flex-shrink-0 p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition border-2 border-blue-300 shadow-sm"
          title="Back to Action"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 w-full">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Outcome Tracking</h2>
            <p className="text-xs sm:text-sm text-gray-600">Track final outcomes - conversions and lost enquiries</p>
          </div>
        </div>
      </div>

      {/* Outcome Type Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setOutcomeType('enrolled')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              outcomeType === 'enrolled'
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Enrolled
            <span
              className={`ml-2 px-2 py-1 text-xs rounded-full ${
                outcomeType === 'enrolled'
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {counts.enrolled}
            </span>
          </button>
          <button
            onClick={() => setOutcomeType('lost')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              outcomeType === 'lost'
                ? "border-gray-500 text-gray-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            Lost
            <span
              className={`ml-2 px-2 py-1 text-xs rounded-full ${
                outcomeType === 'lost'
                  ? "bg-gray-100 text-gray-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {counts.lost}
            </span>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={`Search ${outcomeType} enquiries...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
        />
      </div>

      {/* Desktop Enquiries Table - Hidden on mobile */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
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
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : enquiries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No {outcomeType} enquiries found
                </td>
              </tr>
            ) : (
              enquiries.map((enquiry) => (
                <tr key={enquiry._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {enquiry.firstName} {enquiry.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{enquiry.phone}</div>
                      {enquiry.email && (
                        <div className="text-sm text-gray-500">{enquiry.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {enquiry.source}
                      </span>
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {enquiry.interest}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enquiry.convertedDate 
                      ? new Date(enquiry.convertedDate).toLocaleDateString()
                      : new Date(enquiry.updatedAt).toLocaleDateString()
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingEnquiry(enquiry)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => setEditingEnquiry(enquiry)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                        title="Edit"
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
                      
                      {outcomeType === 'lost' && (
                        <button
                          onClick={() => handleStatusChange(enquiry._id, 'interested')}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 transition"
                          title="Reactivate as Interested"
                        >
                          Reactivate
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
        ) : enquiries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            No {outcomeType} enquiries found
          </div>
        ) : (
          enquiries.map((enquiry) => (
            <div key={enquiry._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  {outcomeType === 'enrolled' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-gray-600" />
                  )}
                  <div className="text-base font-semibold text-gray-900">
                    {enquiry.firstName} {enquiry.lastName}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">{enquiry.phone}</div>
                {enquiry.email && <div className="text-sm text-gray-600 break-all">{enquiry.email}</div>}
              </div>

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
                <div className="flex items-center justify-between">
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
                <button
                  onClick={() => setViewingEnquiry(enquiry)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingEnquiry(enquiry)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveBack(enquiry._id)}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                  title="Back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {outcomeType === 'lost' && (
                  <button
                    onClick={() => handleStatusChange(enquiry._id, 'interested')}
                    className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 transition"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingEnquiry && (
        <EditEnquiryModal
          enquiry={editingEnquiry}
          onClose={() => setEditingEnquiry(null)}
          onSuccess={() => {
            setEditingEnquiry(null);
            fetchEnquiries();
          }}
        />
      )}

      {/* View Modal */}
      {viewingEnquiry && (
        <ViewEnquiryModal
          enquiry={viewingEnquiry}
          onClose={() => setViewingEnquiry(null)}
        />
      )}
    </div>
  );
}