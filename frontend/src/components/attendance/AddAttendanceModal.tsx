import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AddAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAttendanceModal({ isOpen, onClose, onSuccess }: AddAttendanceModalProps) {
  const [formData, setFormData] = useState({
    userId: '',
    userType: 'Student',
    status: 'present',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [students, setStudents] = useState<Array<{ _id: string; fname: string; lname: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ _id: string; user_id: { _id: string; fname: string; lname: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Array<{ _id: string; fname: string; lname: string }>>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Array<{ _id: string; user_id: { _id: string; fname: string; lname: string } }>>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = students.filter(s =>
      `${s.fname} ${s.lname}`.toLowerCase().includes(searchStudent.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchStudent, students]);

  useEffect(() => {
    const filtered = teachers.filter(t => {
      const firstName = t.user_id?.fname || '';
      const lastName = t.user_id?.lname || '';
      return `${firstName} ${lastName}`.toLowerCase().includes(searchTeacher.toLowerCase());
    });
    setFilteredTeachers(filtered);
  }, [searchTeacher, teachers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const [studentsRes, teachersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students?limit=1000`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Include httpOnly cookies
        }),
        fetch(`${API_BASE_URL}/api/teachers`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Include httpOnly cookies
        })
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || data.data || []);
      } else {
        console.error('Students API error:', studentsRes.status);
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers || data.data || []);
      } else {
        console.error('Teachers API error:', teachersRes.status);
      }

      setError('');
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      setError('Please select a person');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify({
          userId: formData.userId,
          userType: formData.userType,
          status: formData.status,
          date: formData.date,
          notes: formData.notes,
          source: 'manual'
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('Mark attendance error:', response.status, data);
        throw new Error(data.message || `Failed to mark attendance: ${response.status}`);
      }

      setError('');
      setFormData({
        userId: '',
        userType: 'Student',
        status: 'present',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setFormData(prev => ({ ...prev, userId: studentId, userType: 'Student' }));
    setSearchStudent('');
    setShowStudentDropdown(false);
  };

  const handleSelectTeacher = (userIdFromTeacher: string) => {
    setFormData(prev => ({ ...prev, userId: userIdFromTeacher, userType: 'Teacher' }));
    setSearchTeacher('');
    setShowTeacherDropdown(false);
  };

  if (!isOpen) return null;

  const selectedUser = formData.userType === 'Student'
    ? students.find(s => s._id === formData.userId)
    : teachers.find(t => t._id === formData.userId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
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

          {/* User Type */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Type</label>
            <select
              value={formData.userType}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, userType: e.target.value as 'Student' | 'Teacher', userId: '' }));
                setSearchStudent('');
                setSearchTeacher('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-medium"
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              {formData.userType}
            </label>
            <div className="relative">
              {formData.userType === 'Student' ? (
                <>
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchStudent}
                    onChange={(e) => {
                      setSearchStudent(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="p-3 text-gray-600 text-sm font-medium">No students found</div>
                      ) : (
                        filteredStudents.map(s => (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => handleSelectStudent(s._id)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-black font-medium"
                          >
                            {s.fname} {s.lname}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search teacher..."
                    value={searchTeacher}
                    onChange={(e) => {
                      setSearchTeacher(e.target.value);
                      setShowTeacherDropdown(true);
                    }}
                    onFocus={() => setShowTeacherDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  {showTeacherDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredTeachers.length === 0 ? (
                        <div className="p-3 text-gray-600 text-sm font-medium">No teachers found</div>
                      ) : (
                        filteredTeachers.map(t => (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() => handleSelectTeacher(t.user_id?._id || t._id)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-black font-medium"
                          >
                            {t.user_id?.fname} {t.user_id?.lname}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
              {selectedUser && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm text-black font-semibold">
                  Selected: {formData.userType === 'Student' ? `${'fname' in selectedUser ? selectedUser.fname : ''} ${'lname' in selectedUser ? selectedUser.lname : ''}` : `${'user_id' in selectedUser ? selectedUser.user_id?.fname : ''} ${'user_id' in selectedUser ? selectedUser.user_id?.lname : ''}`}
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-medium"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-medium"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.userId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Marking...' : 'Mark Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
