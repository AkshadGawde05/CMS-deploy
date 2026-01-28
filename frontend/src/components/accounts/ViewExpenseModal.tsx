"use client";
import React from 'react';

interface ExpenseItem {
  _id: string;
  category: string;
  title: string;
  description?: string;
  amount: number;
  date: string;
  payment_method: string;
  vendor_name?: string;
  invoice_number?: string;
  status: string;
  receipt_url?: string;
}

export default function ViewExpenseModal({ expense, onClose, categoryLabel }: { expense: ExpenseItem; onClose: () => void; categoryLabel?: (k: string) => string }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-sm text-black-600 w-40">{label}</div>
      <div className="flex-1 text-sm text-black break-words">{value}</div>
    </div>
  );

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-black">Expense Details</h3>
        </div>
        <div className="px-5 py-4">
          <Row label="Title" value={expense.title} />
          <Row label="Category" value={categoryLabel ? categoryLabel(expense.category) : expense.category} />
          <Row label="Amount" value={fmtCurrency(expense.amount)} />
          <Row label="Date" value={fmtDate(expense.date)} />
          <Row label="Payment Method" value={expense.payment_method} />
          {expense.vendor_name && <Row label="Vendor" value={expense.vendor_name} />}
          {expense.invoice_number && <Row label="Invoice #" value={expense.invoice_number} />}
          <Row label="Status" value={expense.status} />
          {expense.description && <Row label="Description" value={expense.description} />}
          {expense.receipt_url && (
            <Row label="Receipt" value={<a className="text-blue-600 underline" href={expense.receipt_url} target="_blank">View</a>} />
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-3 py-2 border rounded text-sm text-black">Close</button>
        </div>
      </div>
    </div>
  );
}
