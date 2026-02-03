import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { updateAttendance } from '@/lib/api';

interface User {
  _id: string;
  fname?: string;
  lname?: string;
  email?: string;
}

interface Batch {
  _id: string;
  name?: string;
}

interface AttendanceRecord {
  _id: string;
  userId?: User;
  studentId?: User;
  userType: 'Student' | 'Teacher';
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  source: 'biometric' | 'manual' | 'bulk_upload';
  deviceId: string;
  verifyMode?: string;
  notes?: string;
  batchId?: Batch;
}

interface EditAttendanceModalProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAttendanceModal({ record, isOpen, onClose, onSuccess }: EditAttendanceModalProps) {
  const [formData, setFormData] = useState({
    status: record.status,
    notes: record.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        status: record.status,
        notes: record.notes || ''
      });
      setError('');
    }
  }, [isOpen, record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      await updateAttendance(record._id, {
        status: formData.status,
        notes: formData.notes
      });

      onSuccess();
    } catch (err: unknown) {
      console.error('Error updating attendance:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setError(error.response?.data?.message || error.message || 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const user = record.studentId || record.userId;
  const fullName = user ? `${user.fname || ''} ${user.lname || ''}`.trim() : '-';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Attendance</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold text-gray-700">Name:</span>
                <span className="ml-2 text-sm text-black font-semibold">{fullName}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700">Type:</span>
                <span className="ml-2 text-sm text-black font-medium">{record.userType}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700">Date:</span>
                <span className="ml-2 text-sm text-black font-medium">{new Date(record.date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700">Source:</span>
                <span className="ml-2 text-sm text-black font-medium capitalize">{record.source}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'present' | 'late' | 'absent' | 'excused' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-medium"
              disabled={loading}
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
              disabled={loading}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              'Update Attendance'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
