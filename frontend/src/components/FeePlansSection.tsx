'use client';

import { useState, useEffect } from 'react';
import { getFeePlans, deleteFeePlan, type FeePlanDTO } from '@/lib/api';
import AddFeePlanModal from '@/components/accounts/AddFeePlanModal';
import ViewFeePlanModal from '@/components/accounts/ViewFeePlanModal';
import EditFeePlanModal from '@/components/accounts/EditFeePlanModal';

type FeePlan = FeePlanDTO;

export default function FeePlansSection() {
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPlan, setViewPlan] = useState<FeePlan | null>(null);
  const [editPlan, setEditPlan] = useState<FeePlan | null>(null);

  const getBatchName = (b: FeePlanDTO['batch_id']) => {
    if (b && typeof b === 'object' && 'name' in b) {
      return (b as { name: string }).name ?? '-';
    }
    return '-';
  };

  const getCourseNameFromBatch = (b: FeePlanDTO['batch_id']) => {
    if (b && typeof b === 'object' && 'course_id' in b) {
      const c = (b as { course_id?: string | { _id: string; name: string } }).course_id;
      if (c && typeof c === 'object' && 'name' in c) return (c as { name: string }).name;
    }
    return '-';
  };

  useEffect(() => {
    fetchFeePlans();
  }, []);

  const fetchFeePlans = async () => {
    try {
      setLoading(true);
      const res = await getFeePlans();
      setFeePlans(res.plans || []);
    } catch (err) {
      console.error('Error fetching fee plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee plan?')) return;
    try {
      await deleteFeePlan(id);
      fetchFeePlans();
    } catch (err) {
      console.error('Error deleting fee plan:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          onClick={() => setShowAddModal(true)}
        >
          Add Fee Plan
        </button>
      </div>

      {showAddModal && (
        <AddFeePlanModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchFeePlans();
          }}
        />
      )}

      {/* Desktop/tablet table */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase">Course</th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase">Batch</th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase">Amount</th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase">Installments</th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-black">
                  Loading...
                </td>
              </tr>
            ) : feePlans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-black">
                  No fee plans found
                </td>
              </tr>
            ) : (
              feePlans.map((plan) => (
                <tr key={String(plan._id)} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-black">{getCourseNameFromBatch(plan.batch_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-black">{getBatchName(plan.batch_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-black">
                    ₹{plan.total_amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-black">{plan.num_installments}</td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-3">
                    <button
                      title="View"
                      aria-label="View"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700"
                      onClick={() => setViewPlan(plan)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      title="Edit"
                      aria-label="Edit"
                      className="inline-flex items-center text-gray-700 hover:text-black"
                      onClick={() => setEditPlan(plan)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
                        <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => plan._id && handleDelete(String(plan._id))}
                      className="inline-flex items-center text-red-600 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm-3 6h2v10H6V9zm4 0h2v10H10V9zm4 0h2v10h-2V9z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-sm text-gray-600">Loading...</div>
        ) : feePlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-sm text-gray-600">No fee plans found</div>
        ) : (
          feePlans.map((plan) => (
            <div key={String(plan._id)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-black">{getCourseNameFromBatch(plan.batch_id)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{getBatchName(plan.batch_id)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    title="View"
                    aria-label="View"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => setViewPlan(plan)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button
                    title="Edit"
                    aria-label="Edit"
                    className="text-gray-700 hover:text-black"
                    onClick={() => setEditPlan(plan)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    title="Delete"
                    aria-label="Delete"
                    onClick={() => plan._id && handleDelete(String(plan._id))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm-3 6h2v10H6V9zm4 0h2v10H10V9zm4 0h2v10h-2V9z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-600">Amount</span><span className="font-semibold text-black">₹{plan.total_amount?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Installments</span><span className="font-medium text-black">{plan.num_installments}</span></div>
              </div>
            </div>
          ))
        )}
      </div>

      {viewPlan && (
        <ViewFeePlanModal
          plan={viewPlan}
          onClose={() => setViewPlan(null)}
        />
      )}

      {editPlan && (
        <EditFeePlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onUpdated={() => {
            setEditPlan(null);
            fetchFeePlans();
          }}
        />
      )}
    </div>
  );
}
