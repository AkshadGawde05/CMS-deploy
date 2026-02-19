"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import RawDataManagementTab from "@/components/enquiry/RawDataManagementTab";
import LeadsTab from "@/components/enquiry/LeadsTab";
import ContactedTab from "@/components/enquiry/ContactedTab";
import ActionTab from "@/components/enquiry/ActionTab";
import OutcomeTab from "@/components/enquiry/OutcomeTab";
import { getEnquiryCounts } from "@/lib/api";

type TabType = "rawdata" | "leads" | "contacted" | "action" | "outcome";

interface TabCounts {
  rawdata: number;
  leads: number;
  contacted: number;
  action: number;
  outcome: number;
}

interface DetailedCounts {
  raw: number;
  cold_lead: number;
  warm_lead: number;
  hot_lead: number;
  contacted: number;
  interested: number;
  not_interested: number;
  enrolled: number;
  lost: number;
}

export default function EnquiryManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>("rawdata");
  const [counts, setCounts] = useState<TabCounts>({
    rawdata: 0,
    leads: 0,
    contacted: 0,
    action: 0,
    outcome: 0
  });
  const [detailedCounts, setDetailedCounts] = useState<DetailedCounts>({
    raw: 0,
    cold_lead: 0,
    warm_lead: 0,
    hot_lead: 0,
    contacted: 0,
    interested: 0,
    not_interested: 0,
    enrolled: 0,
    lost: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [countsError, setCountsError] = useState(false);

  // Fetch counts on component mount and set up refresh interval
  useEffect(() => {
    fetchCounts();

    // Refresh counts every 30 seconds to keep them updated
    const interval = setInterval(fetchCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      setLoadingCounts(true);
      const response = await getEnquiryCounts();

      console.log("🔍 Full API response:", response);

      if (response && response.success && response.data) {
        // Ensure all values are numbers and not NaN
        const safeNumber = (value: unknown): number => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        const detailed: DetailedCounts = {
          raw: safeNumber(response.data.raw),
          cold_lead: safeNumber(response.data.cold_lead),
          warm_lead: safeNumber(response.data.warm_lead),
          hot_lead: safeNumber(response.data.hot_lead),
          contacted: safeNumber(response.data.contacted),
          interested: safeNumber(response.data.interested),
          not_interested: safeNumber(response.data.not_interested),
          enrolled: safeNumber(response.data.enrolled),
          lost: safeNumber(response.data.lost),
        };

        const newCounts = {
          rawdata: detailed.raw,
          leads: detailed.cold_lead + detailed.warm_lead + detailed.hot_lead,
          contacted: detailed.contacted,
          action: detailed.interested + detailed.not_interested,
          outcome: detailed.enrolled + detailed.lost
        };

        console.log("📊 Setting counts:", newCounts);
        console.log("📊 Setting detailed counts:", detailed);
        setDetailedCounts(detailed);
        setCounts(newCounts);
        setCountsError(false);
      } else {
        console.warn("⚠️  Invalid response or no data:", response);
        setDetailedCounts({
          raw: 0,
          cold_lead: 0,
          warm_lead: 0,
          hot_lead: 0,
          contacted: 0,
          interested: 0,
          not_interested: 0,
          enrolled: 0,
          lost: 0,
        });
        setCounts({
          rawdata: 0,
          leads: 0,
          contacted: 0,
          action: 0,
          outcome: 0
        });
        setCountsError(true);
      }
    } catch (error) {
      console.error("❌ Failed to fetch counts:", error);
      setDetailedCounts({
        raw: 0,
        cold_lead: 0,
        warm_lead: 0,
        hot_lead: 0,
        contacted: 0,
        interested: 0,
        not_interested: 0,
        enrolled: 0,
        lost: 0,
      });
      setCounts({
        rawdata: 0,
        leads: 0,
        contacted: 0,
        action: 0,
        outcome: 0
      });
      setCountsError(true);
    } finally {
      setLoadingCounts(false);
    }
  };



  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "rawdata", label: "Raw Data Management", count: counts.rawdata },
    { id: "leads", label: "Leads", count: counts.leads },
    { id: "contacted", label: "Contacted", count: counts.contacted },
    { id: "action", label: "Action", count: counts.action },
    { id: "outcome", label: "Outcome", count: counts.outcome },
  ];

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Navbar />
        <main className="lg:ml-64 pt-16 px-3 sm:px-4 lg:px-6 pb-6">
          {/* Header */}
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-col gap-2">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Enquiry Management
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  Manage enquiries throughout the complete workflow
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {countsError && (
                  <span className="text-xs text-red-600">⚠️ Counts unavailable</span>
                )}
                <button
                  onClick={fetchCounts}
                  disabled={loadingCounts}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 whitespace-nowrap ${countsError
                      ? "text-red-600 bg-red-50 border border-red-200 hover:bg-red-100"
                      : "text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                    }`}
                >
                  {loadingCounts ? "Refreshing..." : countsError ? "Retry" : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 p-2 mb-3 sm:mb-4 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-none whitespace-nowrap px-3 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.label === "Raw Data Management" ? "Raw" :
                      tab.label === "Contacted" ? "Contact" :
                        tab.label}
                  </span>
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full inline-flex items-center justify-center min-w-[20px] ${activeTab === tab.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700"
                      }`}
                  >
                    {loadingCounts ? "..." : (isNaN(tab.count) ? "0" : tab.count)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {activeTab === "rawdata" && <RawDataManagementTab />}
            {activeTab === "leads" && <LeadsTab />}
            {activeTab === "contacted" && <ContactedTab />}
            {activeTab === "action" && <ActionTab />}
            {activeTab === "outcome" && <OutcomeTab />}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}