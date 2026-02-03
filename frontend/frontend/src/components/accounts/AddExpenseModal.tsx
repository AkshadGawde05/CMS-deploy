'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createExpense, updateExpense, getExpenseMeta } from '@/lib/api';

interface Expense {
  _id?: string;
  category: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  vendor_name: string;
  invoice_number: string;
  status: string;
  receipt_url?: string;
}

interface AddExpenseModalProps {
  expense?: Expense;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ expense, onClose, onSuccess }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    category: expense?.category || '',
    title: expense?.title || '',
    description: expense?.description || '',
    amount: expense?.amount || 0,
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    payment_method: expense?.payment_method || '',
    vendor_name: expense?.vendor_name || '',
    invoice_number: expense?.invoice_number || '',
    status: expense?.status || ''
  });

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const meta = await getExpenseMeta();
        setCategories(meta.categories || []);
        setStatuses(meta.statuses || []);
        setPaymentModes(meta.payment_modes || []);
        // Initialize defaults when adding
        setFormData(prev => ({
          ...prev,
          category: prev.category || meta.categories?.[0]?.key || '',
          status: prev.status || meta.statuses?.[0] || 'pending',
          payment_method: prev.payment_method || meta.payment_modes?.[0] || 'cash',
        }));
      } catch {
        // silent
      } finally {
      }
    };
    fetchMeta();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => payload.append(k, String(v ?? '')));
      if (receiptFile) payload.append('receipt', receiptFile);
      if (expense?._id) {
        await updateExpense(expense._id, payload);
      } else {
        await createExpense(payload);
      }
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-black">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-black hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              >
                {categories.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Office Rent Payment"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Payment Method *</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              >
                {paymentModes.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Vendor Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Vendor Name</label>
              <input
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                placeholder="Vendor or payee name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                placeholder="INV-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Additional details about this expense..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-600"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Upload Receipt</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {expense?.receipt_url && (
              <div className="mt-2 text-sm">
                Current receipt: <a className="text-blue-600 underline" href={expense.receipt_url} target="_blank">View</a>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
