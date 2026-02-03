"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { recordPayment, UpdatedInstallmentDTO } from "@/lib/api";

export type PaymentMode = "cash" | "card" | "upi" | "bank_transfer" | "cheque";

export interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: UpdatedInstallmentDTO) => void;
  context: {
    student_id: string;
    student_name: string;
    student_phone?: string;
    course_name?: string;
    batch_name?: string;
    fee_plan_id: string;
    installment_no: number;
    amount: number;
    paid_amount: number; // total paid so far for this installment
    remaining_amount: number;
    overall_remaining?: number; // remaining against total course fee (cap)
    due_date: string | Date;
  };
}

export default function RecordPaymentModal({ open, onClose, onSuccess, context }: RecordPaymentModalProps) {
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidDate, setPaidDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment adjustment calculations
  const paymentAdjustment = useMemo(() => {
    const remaining = context.remaining_amount;
    const paid = paidAmount;
    
    if (paid <= 0) {
      return { type: 'none', amount: 0, message: '' };
    }
    
    if (paid > remaining) {
      const excess = paid - remaining;
      return {
        type: 'overpayment',
        amount: excess,
        message: `₹${excess.toFixed(2)} will be credited to the next installment`
      };
    }
    
    if (paid < remaining) {
      const shortfall = remaining - paid;
      return {
        type: 'underpayment',
        amount: shortfall,
        message: `₹${shortfall.toFixed(2)} balance will carry forward to the next installment`
      };
    }
    
    return { type: 'exact', amount: 0, message: 'Installment will be fully paid' };
  }, [paidAmount, context.remaining_amount]);

  const statusPreview = useMemo<"paid" | "partial">(() => {
    if (paidAmount >= context.remaining_amount) return "paid";
    return "partial";
  }, [paidAmount, context.remaining_amount]);

  const validate = (): string | null => {
    if (paidAmount <= 0) return "Paid amount must be greater than 0";
    // Enforce global remaining cap across the entire course fee
    const cap = typeof context.overall_remaining === 'number' ? context.overall_remaining : Infinity;
    if (cap <= 0) return "Course fee fully paid. No additional payments can be recorded.";
    // Add small tolerance (0.02) for floating-point precision issues
    if (paidAmount > cap + 0.02) {
      return `Cannot record payment. Remaining balance: ₹${cap.toFixed(2)}. Please enter an amount ≤ ₹${cap.toFixed(2)}`;
    }
    const pd = new Date(paidDate);
    if (isNaN(pd.getTime())) return "Paid date is invalid";
    if (pd > new Date()) return "Payment date cannot be in the future";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const resp = await recordPayment({
        student_id: context.student_id,
        fee_plan_id: context.fee_plan_id,
        installment_no: context.installment_no,
        paid_amount: paidAmount,
        paid_date: paidDate,
        payment_mode: paymentMode,
        transaction_id: transactionId || undefined,
        receipt_no: receiptNo || undefined,
        remarks: remarks || undefined,
      });
      if (resp?.success) {
        onSuccess(resp.updated_installment);
      } else {
        setError(resp?.message || "Failed to record payment");
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } ; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message
        || "Failed to record payment";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-2xl mx-auto my-6">
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
            <h2 className="text-lg font-semibold text-black">Record Payment</h2>
            <button onClick={onClose} className="text-black hover:text-gray-700" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-black">Student</label>
                <input value={context.student_name} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Course</label>
                <input value={context.course_name || "-"} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Batch</label>
                <input value={context.batch_name || "-"} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-black">Installment #</label>
                  <input value={context.installment_no} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-black">Due Date</label>
                  <input value={new Date(context.due_date).toLocaleDateString("en-IN")} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Amount</label>
                <input value={`₹${(context.amount || 0).toFixed(2)}`} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-black">Paid So Far</label>
                  <input value={`₹${(context.paid_amount || 0).toFixed(2)}`} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-black">Remaining</label>
                  <input value={`₹${(context.remaining_amount || 0).toFixed(2)}`} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-black">Paid Amount *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                />
                {typeof context.overall_remaining === 'number' && (
                  <div className="mt-1 text-[11px] text-black">
                    Remaining overall: <span className="font-semibold">₹{context.overall_remaining.toFixed(2)}</span> · Max allowed
                    <span className="font-semibold"> ₹{context.overall_remaining.toFixed(2)}</span>
                  </div>
                )}
                {paidAmount > 0 && paymentAdjustment.type !== 'none' && (
                  <div className={`mt-1.5 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                    paymentAdjustment.type === 'overpayment' 
                      ? 'bg-blue-50 text-blue-700' 
                      : paymentAdjustment.type === 'underpayment'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    <svg className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="flex-1">{paymentAdjustment.message}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Paid Date *</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Payment Method *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Receipt Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-black">
                  <svg className="inline h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Receipt will be auto-generated and stored
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-black">Transaction ID (optional)</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-black">Remarks (optional)</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer (sticky) */}
            <div className="sticky bottom-0 -mx-6 mt-4 border-t bg-white px-6 py-4">
              {/* Payment Summary */}
              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-black">
                  <span>Payment Summary</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    statusPreview === 'paid' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {statusPreview.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-black">Installment Amount:</span>
                    <span className="font-medium text-black">₹{context.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Already Paid:</span>
                    <span className="font-medium text-green-600">₹{(context.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Remaining Before:</span>
                    <span className="font-medium text-red-600">₹{context.remaining_amount.toFixed(2)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <>
                      <div className="border-t border-gray-300 my-1.5"></div>
                      <div className="flex justify-between">
                        <span className="text-black">Paying Now:</span>
                        <span className="font-semibold text-blue-600">₹{paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Remaining After:</span>
                        <span className="font-semibold text-black">
                          ₹{Math.max(0, context.remaining_amount - paidAmount).toFixed(2)}
                        </span>
                      </div>
                      {paymentAdjustment.type === 'overpayment' && (
                        <div className="flex justify-between text-blue-700">
                          <span className="font-medium">Credit to Next:</span>
                          <span className="font-semibold">₹{paymentAdjustment.amount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-black">
                  <svg className="inline h-3.5 w-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Receipt will be auto-generated
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-black hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (typeof context.overall_remaining === 'number' && context.overall_remaining <= 0)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Record Payment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
