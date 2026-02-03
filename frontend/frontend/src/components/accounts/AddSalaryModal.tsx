'use client';
import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { createSalary, updateSalary, getAllTeachers } from '@/lib/api';

interface Teacher {
  _id: string;
  user_id: {
    _id: string;
    fname: string;
    lname: string;
  };
  emp_no?: string;
}

interface Salary {
  _id?: string;
  teacher_id?: { _id: string };
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  total_salary: number;
  paid_amount: number;
  payment_date?: string;
  payment_method: string;
  status: string;
  remarks?: string;
}

interface AddSalaryModalProps {
  salary?: Salary;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSalaryModal({ salary, onClose, onSuccess }: AddSalaryModalProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [formData, setFormData] = useState({
    teacher_id: salary?.teacher_id?._id || '',
    month: salary?.month || new Date().getMonth() + 1,
    year: salary?.year || new Date().getFullYear(),
    basic_salary: salary?.basic_salary || 0,
    allowances: salary?.allowances || 0,
    deductions: salary?.deductions || 0,
    bonus: salary?.bonus || 0,
    total_salary: salary?.total_salary || 0,
    paid_amount: salary?.paid_amount || 0,
    payment_date: salary?.payment_date ? new Date(salary.payment_date).toISOString().split('T')[0] : '',
    payment_method: salary?.payment_method || 'bank_transfer',
    status: salary?.status || 'pending',
    remarks: salary?.remarks || ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    // Auto-calculate total salary
    const total = formData.basic_salary + formData.allowances + formData.bonus - formData.deductions;
    setFormData(prev => ({ ...prev, total_salary: total }));
  }, [formData.basic_salary, formData.allowances, formData.deductions, formData.bonus]);

  const fetchTeachers = async () => {
    try {
      const result = await getAllTeachers();
      setTeachers(result.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (salary?._id) {
        await updateSalary(salary._id, formData);
      } else {
        await createSalary(formData);
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
      [name]: ['month', 'year', 'basic_salary', 'allowances', 'deductions', 'bonus', 'paid_amount'].includes(name)
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-black-900">
            {salary ? 'Edit Salary' : 'Add Salary'}
          </h2>
          <button onClick={onClose} className="text-black-400 hover:text-black-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Teacher */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-black-700 mb-1">Teacher *</label>
              <select
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.user_id?.fname} {teacher.user_id?.lname} - {teacher.emp_no}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Month *</label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Year *</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-black-900 mb-3 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Salary Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Salary */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Basic Salary *</label>
                <input
                  type="number"
                  name="basic_salary"
                  value={formData.basic_salary}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Allowances */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Allowances</label>
                <input
                  type="number"
                  name="allowances"
                  value={formData.allowances}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Bonus */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Bonus</label>
                <input
                  type="number"
                  name="bonus"
                  value={formData.bonus}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Deductions */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Deductions</label>
                <input
                  type="number"
                  name="deductions"
                  value={formData.deductions}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Total Salary (Auto-calculated) */}
            <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black-900">Total Salary:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{formData.total_salary.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-black-900 mb-3">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paid Amount */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Paid Amount</label>
                <input
                  type="number"
                  name="paid_amount"
                  value={formData.paid_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-black-700 mb-1">Payment Method</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-black-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-black-700 mb-1">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : salary ? 'Update Salary' : 'Generate Salary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
