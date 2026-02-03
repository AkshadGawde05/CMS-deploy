'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Mail, AlertTriangle } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getAllTeachers, deleteTeacher, getUserAttendanceStats } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import AddTeacherModal from '@/components/teachers/AddTeacherModal';
import BulkUploadModal from '@/components/teachers/BulkUploadModal';

interface Teacher {
  _id: string;
  user_id: {
    _id: string;
    fname: string;
    lname: string;
    email: string;
    phone: string;
    status: boolean;
  };
  subjects: string[];
  emp_no: string;
  joining_date: string;
  salary: number;
  status: boolean;
  assigned_batches?: string[];
}

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
  timestamp?: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [attendanceData, setAttendanceData] = useState<Map<string, { percentage: number; text: string }>>(new Map());

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    filterTeachers();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSubject, selectedStatus, teachers]);

  useEffect(() => {
    if (teachers.length > 0) {
      fetchAttendanceForAllTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const result = await getAllTeachers();
      setTeachers(result.teachers || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForAllTeachers = async () => {
    try {
      const newAttendanceData = new Map();
      
      await Promise.all(
        teachers.map(async (teacher) => {
          try {
            const result = await getUserAttendanceStats(teacher.user_id._id, 'Teacher');
            if (result.success && result.data) {
              newAttendanceData.set(teacher._id, {
                percentage: result.data.percentage,
                text: result.data.text
              });
            } else {
              console.warn(`Failed to fetch attendance for teacher ${teacher.user_id._id}:`, result);
              newAttendanceData.set(teacher._id, { percentage: 0, text: 'N/A' });
            }
          } catch (error) {
            console.error(`Error fetching attendance for teacher ${teacher.user_id._id}:`, error);
            newAttendanceData.set(teacher._id, { percentage: 0, text: 'N/A' });
          }
        })
      );
      
      setAttendanceData(newAttendanceData);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    }
  };

  const filterTeachers = () => {
    let filtered = [...teachers];

    if (searchQuery) {
      filtered = filtered.filter(teacher =>
        `${teacher.user_id.fname} ${teacher.user_id.lname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.user_id.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.user_id.phone?.includes(searchQuery) ||
        teacher.emp_no?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedSubject) {
      filtered = filtered.filter(teacher =>
        teacher.subjects && teacher.subjects.some(subject => 
          subject.toLowerCase().includes(selectedSubject.toLowerCase())
        )
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter(teacher => {
        const isActive = teacher.user_id.status;
        return selectedStatus === 'active' ? isActive : !isActive;
      });
    }

    setFilteredTeachers(filtered);
  };

  // Get unique subjects from all teachers
  const getUniqueSubjects = () => {
    const allSubjects = teachers.flatMap(teacher => teacher.subjects || []);
    return [...new Set(allSubjects)].sort();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('');
    setSelectedStatus('');
  };

  const hasActiveFilters = searchQuery || selectedSubject || selectedStatus;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this teacher?')) {
      try {
        await deleteTeacher(id);
        fetchTeachers();
      } catch {
        alert('Failed to delete teacher');
      }
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowAddModal(true);
  };

  const handleSendCredentials = async (teacherId: string) => {
    setSendingCredentials(prev => ({ ...prev, [teacherId]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/teachers/${teacherId}/send-credentials`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Credentials logged to console!\n\nCheck backend terminal for details.`);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      alert('Failed to send credentials: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSendingCredentials(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  const handleBulkUploadSuccess = (failedData?: FailedEntry[]) => {
    if (failedData && failedData.length > 0) {
      setFailedEntries(prev => [...failedData.map(f => ({ 
        ...f, 
        timestamp: new Date().toISOString() 
      })), ...prev]);
    }
    fetchTeachers();
  };

  const getAttendanceData = (teacher: Teacher) => {
    const data = attendanceData.get(teacher._id);
    if (data) {
      return data;
    }
    return { percentage: 0, text: 'N/A' };
  };

  const getAttendanceBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const clearFailedEntries = () => {
    if (confirm('Are you sure you want to clear all failed entries?')) {
      setFailedEntries([]);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const formatSalary = (salary: number) => {
    return `₹${salary.toLocaleString()}`;
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />

        <main className="flex-1 overflow-y-auto mt-16 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#101828]">Teachers</h1>
              <p className="text-sm text-[#475467] mt-1">
                Manage teaching staff and assignments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition font-medium shadow-sm text-sm"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </button>
              <button
                onClick={() => {
                  setEditingTeacher(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Teacher
              </button>
            </div>
          </div>

          {/* Failed Entries Section */}
          {failedEntries.length > 0 && (
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">
                    Failed Import Entries ({failedEntries.length})
                  </h3>
                </div>
                <button
                  onClick={clearFailedEntries}
                  className="text-sm text-red-700 hover:text-red-900 underline"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {failedEntries.map((entry, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-red-300 text-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-red-900">
                          Row {entry.row} - {entry.error}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {String(entry.data?.['First Name *'] || '')} {String(entry.data?.['Last Name *'] || '')} • {String(entry.data?.['Email *'] || '')}
                        </p>
                      </div>
                      {entry.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 mb-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search Bar */}
              <div className="flex-1 lg:max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm text-[#101828] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Subject Filter */}
              <div className="w-full lg:w-48">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#101828] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Subjects</option>
                  {getUniqueSubjects().map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full lg:w-40">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#101828] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-[#101828] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table - Desktop */}
          <div className="hidden lg:block bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="border-b border-[#EAECF0] bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[18%]">TEACHER</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">CONTACT</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[8%]">EMP NO</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[16%]">SUBJECTS</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">SALARY</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">ATTENDANCE</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[8%]">STATUS</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[18%]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#475467]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          Loading teachers...
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-500">
                        {error}
                      </td>
                    </tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#475467]">
                        No teachers found
                      </td>
                    </tr>
                  ) : (
                    paginatedTeachers.map((teacher) => (
                      <tr key={teacher._id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-xs">
                                {getInitials(teacher.user_id.fname, teacher.user_id.lname)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[#101828] truncate">
                                {teacher.user_id.fname} {teacher.user_id.lname}
                              </div>
                              <div className="text-xs text-[#667085] truncate">
                                {teacher.user_id.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-[#101828] truncate">
                            {teacher.user_id.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200 whitespace-nowrap">
                            {teacher.emp_no}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-[#101828] truncate">
                            {teacher.subjects && teacher.subjects.length > 0 
                              ? teacher.subjects.join(', ') 
                              : 'Not assigned'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold text-[#101828]">
                            {formatSalary(teacher.salary)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#667085] font-medium">
                                {getAttendanceData(teacher).text}
                              </span>
                              <span className="text-[#101828] font-semibold">
                                {getAttendanceData(teacher).percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${getAttendanceBarColor(getAttendanceData(teacher).percentage)}`}
                                style={{ width: `${Math.min(getAttendanceData(teacher).percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${
                            teacher.status 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {teacher.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendCredentials(teacher._id)}
                              disabled={sendingCredentials[teacher._id]}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Send login credentials"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleEdit(teacher)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit teacher"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete teacher"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTeachers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-[#101828] font-medium">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTeachers.length)} of {filteredTeachers.length} teachers
                </p>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-[#101828] border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-[#101828]">...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-[#475467]">Loading teachers...</span>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EAECF0] p-12 text-center">
                <p className="text-sm text-[#475467]">No teachers found</p>
              </div>
            ) : (
              paginatedTeachers.map((teacher) => (
                <div key={teacher._id} className="bg-white rounded-xl border border-[#EAECF0] p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {getInitials(teacher.user_id.fname, teacher.user_id.lname)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#101828] text-base">
                        {teacher.user_id.fname} {teacher.user_id.lname}
                      </h3>
                      <p className="text-sm text-[#667085] truncate">{teacher.user_id.email}</p>
                      <p className="text-sm text-[#667085]">{teacher.user_id.phone}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#667085] font-medium">Employee No</span>
                      <span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                        {teacher.emp_no}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[#667085] font-medium">Subjects</span>
                      <p className="text-sm text-[#101828] mt-1">
                        {teacher.subjects && teacher.subjects.length > 0 
                          ? teacher.subjects.join(', ') 
                          : 'Not assigned'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#667085] font-medium">Salary</span>
                      <span className="text-sm font-semibold text-[#101828]">
                        {formatSalary(teacher.salary)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[#667085] font-medium">Attendance</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-[#667085] font-medium">
                          {getAttendanceData(teacher).text}
                        </span>
                        <span className="text-sm text-[#101828] font-semibold">
                          {getAttendanceData(teacher).percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${getAttendanceBarColor(getAttendanceData(teacher).percentage)}`}
                          style={{ width: `${Math.min(getAttendanceData(teacher).percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#667085] font-medium">Status</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                        teacher.status 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {teacher.status ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleSendCredentials(teacher._id)}
                      disabled={sendingCredentials[teacher._id]}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <Mail className="h-4 w-4" />
                      Send
                    </button>
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Pagination - Mobile */}
            {filteredTeachers.length > 0 && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <p className="text-xs text-[#101828] font-medium">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTeachers.length)} of {filteredTeachers.length} teachers
                </p>
                <div className="flex gap-1 flex-wrap justify-center">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-[#101828] border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-[#101828]">...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs text-[#101828] font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showAddModal && (
        <AddTeacherModal
          teacher={editingTeacher || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingTeacher(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingTeacher(null);
            fetchTeachers();
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={(failedData) => {
            setShowBulkUpload(false);
            handleBulkUploadSuccess(failedData);
          }}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}
