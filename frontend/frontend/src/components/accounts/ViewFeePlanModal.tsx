"use client";
import React from 'react';
import type { FeePlanDTO } from '@/lib/api';

type Props = {
  plan: FeePlanDTO;
  onClose: () => void;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <div className="text-sm text-black-600 w-40">{label}</div>
    <div className="flex-1 text-sm text-black break-words">{value}</div>
  </div>
);

export default function ViewFeePlanModal({ plan, onClose }: Props) {
  const planId = plan.plan_code || plan._id?.slice(-6) || '-';
  const courseName = typeof plan.batch_id === 'object'
    ? (typeof plan.batch_id.course_id === 'object' ? plan.batch_id.course_id?.name : '-')
    : '-';
  const batchName = typeof plan.batch_id === 'object' ? plan.batch_id.name : '-';
  const createdAt = plan.created_at
    ? new Date(typeof plan.created_at === 'string' ? plan.created_at : plan.created_at.toString()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-black">Fee Plan Details</h3>
        </div>
        <div className="px-5 py-4">
          <Row label="Plan ID" value={String(planId)} />
          <Row label="Course" value={courseName} />
          <Row label="Batch" value={batchName} />
          <Row label="Total Amount" value={`₹${(plan.total_amount || 0).toLocaleString('en-IN')}`} />
          <Row label="Installments" value={plan.num_installments} />
          <Row label="Created At" value={createdAt} />
        </div>
        <div className="px-5 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-3 py-2 border rounded text-sm text-black">Close</button>
        </div>
      </div>
    </div>
  );
}
