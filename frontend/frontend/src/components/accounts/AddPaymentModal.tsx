'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPayment, updatePayment, getAllStudents, getAllCourses, getAllBatches, type CourseDTO } from '@/lib/api';

interface Student {
  _id: string;
  fname: string;
  lname: string;
  user_id: { email: string };
}

interface Batch {
  _id: string;
  name: string;
}

interface Payment {
  _id?: string;
  student_id?: { _id: string };
  course_id?: { _id: string };
  batch_id?: { _id: string };
  installment_number: number;
  amount: number;
  paid_amount: number;
  due_date?: string;
  paid_date?: string;
  status: string;
  payment_method: string;
  transaction_id?: string;
  remarks?: string;
  receipt_number?: string;
}

interface AddPaymentModalProps {
  payment?: Payment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPaymentModal({ payment, onClose, onSuccess }: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [formData, setFormData] = useState({
    student_id: payment?.student_id?._id || '',
    course_id: payment?.course_id?._id || '',
    batch_id: payment?.batch_id?._id || '',
    installment_number: payment?.installment_number || 1,
    amount: payment?.amount || 0,
    paid_amount: payment?.paid_amount || 0,
    due_date: payment?.due_date ? new Date(payment.due_date).toISOString().split('T')[0] : '',
    paid_date: payment?.paid_date ? new Date(payment.paid_date).toISOString().split('T')[0] : '',
    status: payment?.status || 'pending',
    payment_method: payment?.payment_method || 'cash',
    transaction_id: payment?.transaction_id || '',
    remarks: payment?.remarks || '',
    receipt_number: payment?.receipt_number || ''
  });

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [studentsRes, coursesRes, batchesRes] = await Promise.all([
        getAllStudents(),
        getAllCourses(),
        getAllBatches()
      ]);
      setStudents(studentsRes.students || []);
      setCourses(coursesRes.courses || []);
      setBatches(batchesRes.batches || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (payment?._id) {
        await updatePayment(payment._id, formData);
      } else {
        await createPayment(formData);
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
      [name]: name === 'amount' || name === 'paid_amount' || name === 'installment_number' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-black-900">
            {payment ? 'Edit Payment' : 'Add Payment'}
          </h2>
          <button onClick={onClose} className="text-black-400 hover:text-black-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Student *</label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Student</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.fname} {student.lname}
                  </option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Course *</label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>{course.name}</option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Batch *</label>
              <select
                name="batch_id"
                value={formData.batch_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch._id} value={batch._id}>{batch.name}</option>
                ))}
              </select>
            </div>

            {/* Installment Number */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Installment # *</label>
              <input
                type="number"
                name="installment_number"
                value={formData.installment_number}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

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

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Due Date *</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Paid Date */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Paid Date</label>
              <input
                type="date"
                name="paid_date"
                value={formData.paid_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                <option value="overdue">Overdue</option>
              </select>
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
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Transaction ID</label>
              <input
                type="text"
                name="transaction_id"
                value={formData.transaction_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Receipt Number */}
            <div>
              <label className="block text-sm font-medium text-black-700 mb-1">Receipt Number</label>
              <input
                type="text"
                name="receipt_number"
                value={formData.receipt_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-black-700 mb-1">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
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
              {loading ? 'Saving...' : payment ? 'Update Payment' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
