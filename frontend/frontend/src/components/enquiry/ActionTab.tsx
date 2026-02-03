"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Edit, Eye } from "lucide-react";
import { getEnquiriesByStatus, updateEnquiryStatus, type EnquiryDTO } from "@/lib/api";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";

export default function ActionTab() {
  const [enquiries, setEnquiries] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState<'interested' | 'not_interested'>('interested');
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryDTO | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<EnquiryDTO | null>(null);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (search) params.search = search;
      
      const response = await getEnquiriesByStatus(actionType, params);
      setEnquiries(response.data);
    } catch (error) {
      console.error("Failed to fetch action enquiries:", error);
    } finally {
      setLoading(false);
    }
  }, [search, actionType]);

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

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Action Required</h2>
          <p className="text-xs sm:text-sm text-gray-600">Manage enquiries requiring follow-up action</p>
        </div>
      </div>

      {/* Action Type Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActionType('interested')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              actionType === 'interested'
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Interested
            <span
              className={`ml-2 px-2 py-1 text-xs rounded-full ${
                actionType === 'interested'
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {enquiries.length}
            </span>
          </button>
          <button
            onClick={() => setActionType('not_interested')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              actionType === 'not_interested'
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Not Interested
            <span
              className={`ml-2 px-2 py-1 text-xs rounded-full ${
                actionType === 'not_interested'
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {enquiries.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={`Search ${actionType.replace('_', ' ')} enquiries...`}
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
                Status
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
                  No {actionType.replace('_', ' ')} enquiries found
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      enquiry.status === 'interested' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {enquiry.status.replace('_', ' ')}
                    </span>
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
                        className="p-1 text-gray-500 hover:text-blue-600 transition"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      {actionType === 'interested' && (
                        <button
                          onClick={() => handleStatusChange(enquiry._id, 'enrolled')}
                          className="px-2 py-1 text-xs font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 transition"
                          title="Mark as Enrolled"
                        >
                          Enrolled
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStatusChange(enquiry._id, 'lost')}
                        className="px-2 py-1 text-xs font-medium text-white bg-gray-600 border border-gray-600 rounded hover:bg-gray-700 transition"
                        title="Mark as Lost"
                      >
                        Lost
                      </button>
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
            No {actionType.replace('_', ' ')} enquiries found
          </div>
        ) : (
          enquiries.map((enquiry) => (
            <div key={enquiry._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="text-base font-semibold text-gray-900">{enquiry.firstName} {enquiry.lastName}</div>
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
                  <span className="text-xs font-medium text-gray-500">Status:</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    enquiry.status === 'interested' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {enquiry.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setViewingEnquiry(enquiry)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingEnquiry(enquiry)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {actionType === 'interested' && (
                  <button
                    onClick={() => handleStatusChange(enquiry._id, 'enrolled')}
                    className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition"
                  >
                    Enrolled
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(enquiry._id, 'lost')}
                  className="px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded hover:bg-gray-700 transition"
                >
                  Lost
                </button>
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