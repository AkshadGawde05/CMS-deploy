'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getPaymentStats, getExpenseStats, getSalaryStats } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import StudentPaymentsSection from '@/components/StudentPaymentsSection';
import FeePlansSection from '@/components/FeePlansSection';
import ExpensesSection from '@/components/ExpensesSection';

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState('fees');
  const [activeFeesTab, setActiveFeesTab] = useState('feeplans'); // NEW: Sub-tab for fees section
  type NumericStats = Record<string, number> | null;
  const [paymentStats, setPaymentStats] = useState<NumericStats>(null);
  const [expenseStats, setExpenseStats] = useState<NumericStats>(null);
  const [salaryStats, setSalaryStats] = useState<NumericStats>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [payments, expenses, salaries] = await Promise.all([
        getPaymentStats(),
        getExpenseStats(),
        getSalaryStats(),
      ]);
      setPaymentStats(payments.stats);
      setExpenseStats(expenses.stats);
      setSalaryStats(salaries.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('en-IN');

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Navbar />
        <main className="lg:ml-64 pt-16 px-3 sm:px-4 lg:px-6 pb-6">
          {/* Page Title */}
          <div className="mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#101828]">Accounts</h1>
            <p className="text-xs sm:text-sm text-[#475467] mt-0.5">Manage fees, expenses, and financial records</p>
          </div>

          {/* Main Tabs */}
          <div className="bg-white rounded-lg border border-[#EAECF0] mb-3 sm:mb-4 overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-max">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'fees', label: 'Fees' },
                { key: 'expenses', label: 'Expenses' },
                { key: 'salaries', label: 'Salaries' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-[#475467] hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Revenue', value: paymentStats?.totalAmount, color: 'green' },
                { label: 'Pending Payments', value: paymentStats?.pending, color: 'orange' },
                { label: 'Total Expenses', value: expenseStats?.totalAmount, color: 'red' },
                { label: 'Monthly Salaries', value: salaryStats?.monthlyTotal, color: 'blue' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-[#EAECF0]">
                  <p className="text-xs text-[#475467]">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-[#101828] mt-1">
                    {stat.value ? `₹${formatCurrency(stat.value)}` : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Fees Management Tab - With Sub-tabs */}
          {activeTab === 'fees' && (
            <div>
              {/* Sub-tabs for Fees Section */}
              <div className="bg-white rounded-lg border border-[#EAECF0] p-2 mb-3 sm:mb-4 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  <button
                    onClick={() => setActiveFeesTab('feeplans')}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                      activeFeesTab === 'feeplans'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-[#101828] hover:bg-gray-100'
                    }`}
                  >
                    Fee Plans
                  </button>
                  <button
                    onClick={() => setActiveFeesTab('payments')}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                      activeFeesTab === 'payments'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-[#101828] hover:bg-gray-100'
                    }`}
                  >
                    Student Payments
                  </button>
                </div>
              </div>

              {/* Fee Plans Section - Only visible when activeFeesTab === 'feeplans' */}
              {activeFeesTab === 'feeplans' && <FeePlansSection />}

              {/* Student Payments Section - Only visible when activeFeesTab === 'payments' */}
              {activeFeesTab === 'payments' && <StudentPaymentsSection />}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div>
              <ExpensesSection />
            </div>
          )}


          {/* Salaries Tab */}
          {activeTab === 'salaries' && (
            <div className="bg-white rounded-lg border border-[#EAECF0] p-8 text-center">
              <p className="text-sm text-gray-500">Salary Calculation Section</p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
