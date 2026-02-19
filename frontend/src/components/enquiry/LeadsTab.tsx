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
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getColdLeads, getWarmLeads, getHotLeads, updateEnquiryStatus, addContactAttempt, type EnquiryDTO } from "@/lib/api";
import EditEnquiryModal from "./EditEnquiryModal";
import ViewEnquiryModal from "./ViewEnquiryModal";

type TabType = "rawdata" | "leads" | "contacted" | "action" | "outcome";

interface LeadsTabProps {
  onNavigate?: (tab: TabType) => void;
  counts?: { cold: number; warm: number; hot: number };
}

export default function LeadsTab({ onNavigate, counts = { cold: 0, warm: 0, hot: 0 } }: LeadsTabProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [leadType, setLeadType] = useState<'cold_lead' | 'warm_lead' | 'hot_lead'>('cold_lead');
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryDTO | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<EnquiryDTO | null>(null);
  
  const sources = ["Website", "Facebook", "Google Ads", "Referral", "Walk-in", "Phone Call"];

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (search) params.search = search;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      
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
      
      setLeads(response);
    } catch {
      console.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, leadType]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateEnquiryStatus(id, newStatus, `Status updated to ${newStatus}`);
      fetchLeads();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleContact = async (id: string, method: 'phone' | 'email' | 'whatsapp', response: string) => {
    try {
      await addContactAttempt(id, {
        method,
        response: response as 'answered' | 'no_answer' | 'busy' | 'invalid_number',
        notes: `Contact attempt via ${method}`
      });
      fetchLeads();
    } catch {
      alert("Failed to record contact attempt");
    }
  };

  const handleMoveForward = async (id: string) => {
    try {
      let newStatus = leadType;
      if (leadType === 'cold_lead') newStatus = 'warm_lead';
      else if (leadType === 'warm_lead') newStatus = 'hot_lead';
      else if (leadType === 'hot_lead') newStatus = 'contacted';
      
      await updateEnquiryStatus(id, newStatus, `Moved forward from ${leadType.replace('_', ' ')}`);
      fetchLeads();
    } catch {
      alert("Failed to move forward");
    }
  };

  const handleMoveBack = async (id: string) => {
    try {
      let newStatus = leadType;
      if (leadType === 'warm_lead') newStatus = 'cold_lead';
      else if (leadType === 'hot_lead') newStatus = 'warm_lead';
      
      if (newStatus !== leadType) {
        await updateEnquiryStatus(id, newStatus, `Moved back from ${leadType.replace('_', ' ')}`);
        fetchLeads();
      }
    } catch {
      alert("Failed to move back");
    }
  };

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
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => onNavigate?.("rawdata")}
          className="flex-shrink-0 p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition border-2 border-blue-300 shadow-sm"
          title="Back to Raw Data"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 w-full">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Leads Management</h2>
            <p className="text-xs sm:text-sm text-gray-600">Manage and track qualified leads</p>
          </div>
        </div>
      </div>

      {/* Lead Type Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          {[
            { id: 'cold_lead', label: 'Cold Leads', color: 'text-blue-600 border-blue-500', count: counts.cold },
            { id: 'warm_lead', label: 'Warm Leads', color: 'text-yellow-600 border-yellow-500', count: counts.warm },
            { id: 'hot_lead', label: 'Hot Leads', color: 'text-red-600 border-red-500', count: counts.hot }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeadType(tab.id as 'cold_lead' | 'warm_lead' | 'hot_lead')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                leadType === tab.id
                  ? tab.color
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  leadType === tab.id
                    ? "bg-white text-current"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
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
      </div>

      {/* Desktop Leads Table - Hidden on mobile */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No {leadType.replace('_', ' ')} found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name}
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
                    <div className="space-y-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {lead.source}
                      </span>
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {lead.interest}
                        </span>
                      </div>
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
                      : "Never contacted"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      {/* Core Action Buttons */}
                      <button
                        onClick={() => setEditingEnquiry(lead)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                        title="Edit Enquiry"
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

                      {leadType !== 'hot_lead' && (
                        <button
                          onClick={() => handleMoveForward(lead._id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                          title="Move Forward"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}

                     

                      {/* Extra Action Buttons */}
                      <button
                        onClick={() => handleContact(lead._id, 'phone', 'answered')}
                        className="p-1 text-gray-500 hover:text-green-600 transition"
                        title="Call"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      
                      {lead.email && (
                        <button
                          onClick={() => handleContact(lead._id, 'email', 'answered')}
                          className="p-1 text-gray-500 hover:text-blue-600 transition"
                          title="Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleContact(lead._id, 'whatsapp', 'answered')}
                        className="p-1 text-gray-500 hover:text-green-600 transition"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      
                      {/* {leadType === 'cold_lead' && (
                        <button
                          onClick={() => handleStatusChange(lead._id, 'warm_lead')}
                          className="p-1 text-gray-500 hover:text-yellow-600 transition"
                          title="Move to Warm"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      
                      {leadType === 'warm_lead' && (
                        <button
                          onClick={() => handleStatusChange(lead._id, 'hot_lead')}
                          className="p-1 text-gray-500 hover:text-red-600 transition"
                          title="Move to Hot"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      
                      {leadType === 'hot_lead' && (
                        <button
                          onClick={() => handleStatusChange(lead._id, 'contacted')}
                          className="p-1 text-gray-500 hover:text-blue-600 transition"
                          title="Mark as Contacted"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )} */}
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
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
            No {leadType.replace('_', ' ')} found
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              {/* Header */}
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="text-base font-semibold text-gray-900 mb-2">{lead.name}</div>
                <div className="text-sm text-gray-600 mb-1">{lead.phone}</div>
                {lead.email && <div className="text-sm text-gray-600 break-all">{lead.email}</div>}
              </div>

              {/* Details */}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100 flex-wrap">
                {/* Core Action Buttons */}
                <button
                  onClick={() => setEditingEnquiry(lead)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>

                {leadType !== 'hot_lead' && (
                  <button
                    onClick={() => handleMoveForward(lead._id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                    title="Forward"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}

                {(leadType === 'warm_lead' || leadType === 'hot_lead') && (
                  <button
                    onClick={() => handleMoveBack(lead._id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                    title="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                {/* Extra Action Buttons */}
                <button
                  onClick={() => handleContact(lead._id, 'phone', 'answered')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                  title="Call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleContact(lead._id, 'email', 'answered')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Email"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleContact(lead._id, 'whatsapp', 'answered')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleStatusChange(lead._id, 'contacted')}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                  title="Mark Contacted"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {editingEnquiry && (
        <EditEnquiryModal
          enquiry={editingEnquiry}
          isOpen={!!editingEnquiry}
          onClose={() => setEditingEnquiry(null)}
          onSave={() => {
            setEditingEnquiry(null);
            fetchLeads();
          }}
        />
      )}

      {viewingEnquiry && (
        <ViewEnquiryModal
          enquiry={viewingEnquiry}
          isOpen={!!viewingEnquiry}
          onClose={() => setViewingEnquiry(null)}
        />
      )}
    </div>
  );
}