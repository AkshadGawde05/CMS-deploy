"use client";
import React, { useEffect, useState } from 'react';
import { createFeePlan, getAllBatches } from '@/lib/api';

type BatchOption = {
  _id: string;
  name: string;
  course_id?: { _id: string; name: string } | string;
};

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function AddFeePlanModal({ onClose, onCreated }: Props) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [numInstallments, setNumInstallments] = useState<string>('1');
  const [discountTypes, setDiscountTypes] = useState<Array<{ code: string; name: string; discount_percent: number }>>([
    { code: 'full', name: 'Full Payment', discount_percent: 0 }
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAllBatches();
        // Expect { success, batches }
        const items: BatchOption[] = (res?.batches || res || []) as BatchOption[];
        setBatches(items);
      } catch {
        // ignore
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!batchId || !totalAmount || !numInstallments) {
      setError('Please fill all required fields');
      return;
    }
    // Validate discount types
    if (discountTypes.length === 0) {
      setError('At least one discount type is required');
      return;
    }
    for (const dt of discountTypes) {
      if (!dt.code || !dt.name || dt.discount_percent < 0 || dt.discount_percent > 100) {
        setError('Invalid discount type data');
        return;
      }
    }
    try {
      setSubmitting(true);
      await createFeePlan({
        batch_id: batchId,
        total_amount: Number(totalAmount),
        num_installments: Number(numInstallments),
        discount_types: discountTypes,
      });
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create fee plan';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const addDiscountType = () => {
    setDiscountTypes([...discountTypes, { code: '', name: '', discount_percent: 0 }]);
  };

  const removeDiscountType = (index: number) => {
    if (discountTypes.length <= 1) {
      setError('At least one discount type is required');
      return;
    }
    setDiscountTypes(discountTypes.filter((_, i) => i !== index));
  };

  const updateDiscountType = (index: number, field: keyof typeof discountTypes[0], value: string | number) => {
    const updated = [...discountTypes];
    if (field === 'discount_percent') {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = String(value);
    }
    setDiscountTypes(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b text-black z-10">
          <h3 className="text-lg font-semibold ">Add Fee Plan</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Batch</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm text-gray-600"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              required
            >
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {typeof b.course_id === 'object' ? `${b.course_id.name} — ${b.name}` : b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Total Amount (₹)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-3 py-2 text-sm text-gray-600"
              placeholder="e.g. 30000"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Installments</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2 text-sm text-gray-600"
              placeholder="e.g. 3"
              value={numInstallments}
              onChange={(e) => setNumInstallments(e.target.value)}
              required
            />
          </div>

          {/* Discount Types Management */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-black">Discount Types</label>
              <button
                type="button"
                onClick={addDiscountType}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                + Add Discount
              </button>
            </div>
            
            <div className="space-y-3">
              {discountTypes.map((dt, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded border">
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-600 mb-1">Code</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="full"
                      value={dt.code}
                      onChange={(e) => updateDiscountType(idx, 'code', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Full Payment"
                      value={dt.name}
                      onChange={(e) => updateDiscountType(idx, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-600 mb-1">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="0"
                      value={dt.discount_percent}
                      onChange={(e) => updateDiscountType(idx, 'discount_percent', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeDiscountType(idx)}
                      className="w-full px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      title="Remove"
                      disabled={discountTypes.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 border rounded text-sm text-black">Cancel</button>
            <button type="submit" disabled={submitting} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-60">
              {submitting ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
