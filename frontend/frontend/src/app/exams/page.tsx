"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ExamsTab from "@/components/exam/ExamTab";
import ResultsTab from "@/components/exam/ResultTab";

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState<"exams" | "results">("exams");

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher", "Student", "Parent"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto mt-16 p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#101828]">
              Exams & Results
            </h1>
            <p className="text-sm text-[#475467] mt-1">
              Manage exams and student results
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-[#EAECF0] mb-6 overflow-x-auto">
            <div className="flex gap-2 p-2 min-w-max">
              <button
                onClick={() => setActiveTab("exams")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "exams"
                    ? "bg-blue-600 text-white"
                    : "text-[#475467] hover:bg-gray-50"
                }`}
              >
                Exams
              </button>
              <button
                onClick={() => setActiveTab("results")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "results"
                    ? "bg-blue-600 text-white"
                    : "text-[#475467] hover:bg-gray-50"
                }`}
              >
                Results
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "exams" ? <ExamsTab /> : <ResultsTab />}
          </div>
        </main>
      </div>
      </div>
    </ProtectedRoute>
  );
}
