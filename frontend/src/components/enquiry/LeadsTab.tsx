"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  Star,
  ArrowLeft,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { getColdLeads, getWarmLeads, getHotLeads, updateEnquiryStatus, addContactAttempt, type EnquiryDTO, deleteEnquiry } from "@/lib/api";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";

type TabType = "rawdata" | "leads" | "contacted" | "action" | "outcome";


interface LeadsTabProps {
  sources: string[];
  interests: string[];
  users: { _id: string; name: string; role: string }[];
  onAction?: () => void;
}

export default function LeadsTab({ sources, interests, users, onAction }: LeadsTabProps) {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [leads, setLeads] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [leadType, setLeadType] = useState<'cold_lead' | 'warm_lead' | 'hot_lead'>('cold_lead');
  const [sourceFilter, setSourceFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryDTO | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<EnquiryDTO | null>(null);

  // Selection and Pagination state
  const [selectedEnquiries, setSelectedEnquiries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 50;


  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (interestFilter !== 'all') params.interest = interestFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      let response;
      switch (leadType) {
        case 'cold_lead':
          response = await getColdLeads(params);
          break;
        case 'warm_lead':
          response = await getWarmLeads(params);
          break;
        case 'hot_lead':
          response = await getHotLeads(params);
          break;
      }

      if (response && response.success) {
        setLeads(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.total || 1);
          setTotalRecords(response.pagination.totalRecords || 0);
        }
      } else {
        setLeads([]);
      }
    } catch {
      console.error("Failed to fetch leads");
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch leads'
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, interestFilter, assignedFilter, fromDate, toDate, leadType, showToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setPage(1);
    setSelectedEnquiries([]);
  }, [search, sourceFilter, interestFilter, assignedFilter, fromDate, toDate, leadType]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await deleteEnquiry(id);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Lead deleted successfully'
        });
        fetchLeads();
        onAction?.();
      } catch {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete lead'
        });
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateEnquiryStatus(id, newStatus, `Status updated to ${newStatus}`);
      showToast({
        type: 'success',
        title: 'Success',
        message: `Status updated to ${newStatus.replace('_', ' ')}`
      });
      fetchLeads();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update status'
      });
    }
  };

  const handleContact = async (id: string, method: 'phone' | 'email' | 'whatsapp', response: string) => {
    try {
      await addContactAttempt(id, {
        method,
        response: response as 'answered' | 'no_answer' | 'busy' | 'invalid_number',
        notes: `Contact attempt via ${method}`
      });
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Contact attempt recorded'
      });
      fetchLeads();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to record contact attempt'
      });
    }
  };

  const handleMoveForward = async (id: string) => {
    try {
      let newStatus = leadType as string;
      if (leadType === 'cold_lead') newStatus = 'warm_lead';
      else if (leadType === 'warm_lead') newStatus = 'hot_lead';
      else if (leadType === 'hot_lead') newStatus = 'contacted';

      await updateEnquiryStatus(id, newStatus, `Moved forward from ${leadType.replace('_', ' ')}`);
      showToast({
        type: 'success',
        title: 'Success',
        message: `Moved forward to ${newStatus.replace('_', ' ')}`
      });
      fetchLeads();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to move forward'
      });
    }
  };

  const handleMoveBack = async (id: string) => {
    try {
      let newStatus = leadType as string;
      if (leadType === 'warm_lead') newStatus = 'cold_lead';
      else if (leadType === 'hot_lead') newStatus = 'warm_lead';

      if (newStatus !== leadType) {
        await updateEnquiryStatus(id, newStatus, `Moved back from ${leadType.replace('_', ' ')}`);
        showToast({
          type: 'success',
          title: 'Success',
          message: `Moved back to ${newStatus.replace('_', ' ')}`
        });
        fetchLeads();
        onAction?.();
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to move back'
      });
    }
  };

  const handleBulkMove = async (targetStatus: string) => {
    if (selectedEnquiries.length === 0) return;
    try {
      for (const id of selectedEnquiries) {
        await updateEnquiryStatus(id, targetStatus, `Bulk moved from ${leadType.replace('_', ' ')}`);
      }
      showToast({
        type: 'success',
        title: 'Success',
        message: `${selectedEnquiries.length} leads moved successfully`
      });
      setSelectedEnquiries([]);
      fetchLeads();
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Bulk action failed'
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedEnquiries.length === leads.length) {
      setSelectedEnquiries([]);
    } else {
      setSelectedEnquiries(leads.map((lead: EnquiryDTO) => lead._id));
    }
  };

  const handleSelectEnquiry = (id: string) => {
    if (selectedEnquiries.includes(id)) {
      setSelectedEnquiries(selectedEnquiries.filter((eid: string) => eid !== id));
    } else {
      setSelectedEnquiries([...selectedEnquiries, id]);
    }
  };

  const isSelected = (id: string) => selectedEnquiries.includes(id);

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'cold_lead': return 'bg-blue-100 text-blue-800';
      case 'warm_lead': return 'bg-yellow-100 text-yellow-800';
      case 'hot_lead': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeadTypeIcon = (score: number) => {
    if (score >= 70) return <Star className="h-4 w-4 text-red-500" />;
    if (score >= 40) return <Star className="h-4 w-4 text-yellow-500" />;
    return <Star className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Leads Management</h2>
          <p className="text-xs sm:text-sm text-gray-600">Manage and track qualified leads</p>
        </div>

        {selectedEnquiries.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
              {selectedEnquiries.length} selected
            </span>
            <div className="flex gap-1 overflow-x-auto">
              {leadType !== 'hot_lead' && (
                <button
                  onClick={() => handleBulkMove(leadType === 'cold_lead' ? 'warm_lead' : 'hot_lead')}
                  className="whitespace-nowrap flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Move {leadType === 'cold_lead' ? 'Warm' : 'Hot'}
                </button>
              )}
              {leadType === 'hot_lead' && (
                <button
                  onClick={() => handleBulkMove('contacted')}
                  className="whitespace-nowrap flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Mark Contacted
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lead Type Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          {[
            { id: 'cold_lead', label: 'Cold Leads', color: 'text-blue-600 border-blue-500' },
            { id: 'warm_lead', label: 'Warm Leads', color: 'text-yellow-600 border-yellow-500' },
            { id: 'hot_lead', label: 'Hot Leads', color: 'text-red-600 border-red-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeadType(tab.id as 'cold_lead' | 'warm_lead' | 'hot_lead')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition ${leadType === tab.id
                ? tab.color
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
        </div>

        {/* Source Filter */}
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

      {/* Desktop Leads Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && selectedEnquiries.length === leads.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source & Interest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No {leadType.replace('_', ' ')} found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected(lead._id)}
                      onChange={() => handleSelectEnquiry(lead._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="text-sm text-gray-500">
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 w-fit">
                        {lead.source}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">
                        {lead.interest}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getLeadTypeIcon(lead.leadScore || 0)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeadTypeColor(lead.status)}`}>
                        {lead.leadScore || 0}/100
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.lastContactedAt
                      ? new Date(lead.lastContactedAt).toLocaleDateString()
                      : "Never"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingEnquiry(lead)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setEditingEnquiry(lead)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {(leadType === 'warm_lead' || leadType === 'hot_lead') && (
                        <button
                          onClick={() => handleMoveBack(lead._id)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition"
                          title="Move Back"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleMoveForward(lead._id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                        title="Move Forward"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-0.5 border-l border-gray-200 ml-1 pl-1">
                        <button
                          onClick={() => handleContact(lead._id, 'phone', 'answered')}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleContact(lead._id, 'whatsapp', 'answered')}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
      <div className="lg:hidden space-y-3 sm:space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            No {leadType.replace('_', ' ')} found
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-100">
                <input
                  type="checkbox"
                  checked={isSelected(lead._id)}
                  onChange={() => handleSelectEnquiry(lead._id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900 break-words">
                    {lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{lead.phone}</div>
                  {lead.email && <div className="text-sm text-gray-600 break-all">{lead.email}</div>}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Source:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {lead.source}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Interest:</span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {lead.interest}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Lead Score:</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getLeadTypeColor(lead.status)}`}>
                    {lead.leadScore || 0}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Last Contact:</span>
                  <span className="text-sm text-gray-900">
                    {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setViewingEnquiry(lead)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingEnquiry(lead)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveForward(lead._id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                  title="Forward"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {(leadType === 'warm_lead' || leadType === 'hot_lead') && (
                  <button
                    onClick={() => handleMoveBack(lead._id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                    title="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleContact(lead._id, 'phone', 'answered')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleContact(lead._id, 'whatsapp', 'answered')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
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
      {editingEnquiry && (
        <EditEnquiryModal
          enquiry={editingEnquiry}
          onClose={() => setEditingEnquiry(null)}
          onSuccess={() => {
            setEditingEnquiry(null);
            fetchLeads();
            onAction?.();
          }}
        />
      )}

      {viewingEnquiry && (
        <ViewEnquiryModal
          enquiry={viewingEnquiry}
          onClose={() => setViewingEnquiry(null)}
        />
      )}
    </div>
  );
}