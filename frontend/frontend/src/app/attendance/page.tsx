'use client';
import { useState, useEffect } from 'react';
import { Plus, Filter, Edit, Trash2, Download, Calendar, Users, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/components/auth/AuthProvider';
import AddAttendanceModal from '@/components/attendance/AddAttendanceModal';
import ViewDetailsModal from '@/components/attendance/ViewDetailsModal';
import EditAttendanceModal from '@/components/attendance/EditAttendanceModal';
import { deleteAttendance } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface UserInfo {
  _id: string;
  fname: string;
  lname: string;
  email?: string;
}

interface BatchInfo {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  _id: string;
  userId?: UserInfo;
  studentId?: UserInfo;
  userType: 'Student' | 'Teacher';
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  source: 'biometric' | 'manual' | 'bulk_upload';
  deviceId: string;
  verifyMode?: string;
  notes?: string;
  batchId?: BatchInfo;
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission("canEditAttendance");

  // Determine which tabs should be visible based on user role
  const getInitialTab = (): 'Student' | 'Teacher' => {
    if (user?.role === 'Teacher') return 'Teacher';
    if (user?.role === 'Student') return 'Student';
    if (user?.role === 'Parent') return 'Student'; // Parents only see student attendance
    return 'Student'; // Admin/SuperAdmin default to Student
  };

  const canViewStudentAttendance = !user?.role || ['Admin', 'SuperAdmin', 'Student', 'Parent'].includes(user.role);
  const canViewTeacherAttendance = !user?.role || ['Admin', 'SuperAdmin', 'Teacher'].includes(user.role);

  const [activeTab, setActiveTab] = useState<'Student' | 'Teacher'>(getInitialTab());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterUserType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, total: 0 });

  // Update activeTab when user data loads
  useEffect(() => {
    if (user) {
      const correctTab = getInitialTab();
      if (correctTab !== activeTab) {
        setActiveTab(correctTab);
        setPage(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, filterUserType, filterSource, startDate, endDate, activeTab]);

  useEffect(() => {
    filterAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, attendance]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Always filter by active tab's user type
      params.append('userType', activeTab);
      
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSource !== 'all') params.append('source', filterSource);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Note: Credentials are automatically sent via httpOnly cookies
      const response = await fetch(`${API_BASE_URL}/api/attendance?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // This tells fetch to include cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      setAttendance(data.attendance || []);
      setTotal(data.pagination?.total || 0);

      // Fetch stats for active tab
      const statsParams = new URLSearchParams();
      statsParams.append('userType', activeTab);
      if (startDate) statsParams.append('startDate', startDate);
      if (endDate) statsParams.append('endDate', endDate);

      const statsResponse = await fetch(`${API_BASE_URL}/api/attendance/stats?${statsParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include httpOnly cookies
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats API Response:', statsData);
        setStats({
          present: statsData.stats?.present || 0,
          late: statsData.stats?.late || 0,
          absent: statsData.stats?.absent || 0,
          total: statsData.stats?.totalRecords || 0
        });
      } else {
        console.error('Stats API Error:', statsResponse.status);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const filterAttendance = () => {
    let filtered = [...attendance];

    if (searchQuery) {
      filtered = filtered.filter(record => {
        const user = record.studentId || record.userId;
        // Handle both Student (f_name/l_name) and User (fname/lname)
        const firstName = user?.fname || user?.fname || '';
        const lastName = user?.lname || user?.lname || '';
        const fullName = `${firstName} ${lastName}`;
        return fullName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    setFilteredAttendance(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAttendance(id);
      setDeleteConfirmId(null);
      fetchAttendance();
    } catch (err) {
      console.error('Error deleting attendance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete attendance record';
      alert(errorMessage);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterUserType !== 'all') params.append('userType', filterUserType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/api/attendance/export?${params}`, {
        method: 'GET',
        credentials: 'include' // Include httpOnly cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to export: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string; size?: number }> }> = {
      present: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      late: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      absent: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      excused: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle }
    };

    const badge = badges[status] || badges.absent;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={16} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, string> = {
      biometric: 'bg-purple-100 text-purple-800',
      manual: 'bg-blue-100 text-blue-800',
      bulk_upload: 'bg-indigo-100 text-indigo-800'
    };

    if (!source) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[source] || badges.manual}`}>
        {source === 'bulk_upload' ? 'Bulk' : source.charAt(0).toUpperCase() + source.slice(1)}
      </span>
    );
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher", "Student", "Parent"]}>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="lg:ml-64 pt-20 px-4 sm:px-6 lg:px-8 pb-8 flex-1">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-gray-900 tracking-tight">Attendance Management</h1>
                <p className="text-sm sm:text-base text-gray-600">Track and manage attendance records</p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                  <button
                    onClick={handleExport}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecord(null);
                      setShowAddModal(true);
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Plus size={18} />
                    <span>Mark Attendance</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-1 inline-flex shadow-sm">
                {canViewStudentAttendance && (
                  <button
                    onClick={() => {
                      setActiveTab('Student');
                      setPage(1);
                    }}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'Student'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Students
                  </button>
                )}
                {canViewTeacherAttendance && (
                  <button
                    onClick={() => {
                      setActiveTab('Teacher');
                      setPage(1);
                    }}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'Teacher'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Teachers
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 text-xs sm:text-sm font-semibold uppercase tracking-wide">Total Records</p>
                    <p className="text-3xl sm:text-4xl font-bold text-blue-900 mt-2">{stats.total}</p>
                  </div>
                  <div className="bg-blue-200 p-3 rounded-xl">
                    <Users className="text-blue-700" size={28} />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border-2 border-green-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 text-xs sm:text-sm font-semibold uppercase tracking-wide">Present</p>
                    <p className="text-3xl sm:text-4xl font-bold text-green-900 mt-2">{stats.present}</p>
                  </div>
                  <div className="bg-green-200 p-3 rounded-xl">
                    <CheckCircle className="text-green-700" size={28} />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl border-2 border-yellow-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-700 text-xs sm:text-sm font-semibold uppercase tracking-wide">Late</p>
                    <p className="text-3xl sm:text-4xl font-bold text-yellow-900 mt-2">{stats.late}</p>
                  </div>
                  <div className="bg-yellow-200 p-3 rounded-xl">
                    <Clock className="text-yellow-700" size={28} />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border-2 border-red-200 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-700 text-xs sm:text-sm font-semibold uppercase tracking-wide">Absent</p>
                    <p className="text-3xl sm:text-4xl font-bold text-red-900 mt-2">{stats.absent}</p>
                  </div>
                  <div className="bg-red-200 p-3 rounded-xl">
                    <AlertCircle className="text-red-700" size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-gray-200 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="text-gray-700" size={20} />
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg focus:ring-2 focus:ring-[#2970FF] focus:border-transparent text-sm text-black font-medium placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg focus:ring-2 focus:ring-[#2970FF] focus:border-transparent text-sm text-black font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => {
                      setFilterSource(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg focus:ring-2 focus:ring-[#2970FF] focus:border-transparent text-sm text-black font-medium"
                  >
                    <option value="all">All Sources</option>
                    <option value="biometric">Biometric</option>
                    <option value="manual">Manual</option>
                    <option value="bulk_upload">Bulk Upload</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg focus:ring-2 focus:ring-[#2970FF] focus:border-transparent text-sm text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg focus:ring-2 focus:ring-[#2970FF] focus:border-transparent text-sm text-black font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 text-sm font-medium shadow-sm flex items-center gap-2">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-700 font-medium">Loading attendance records...</p>
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <Calendar size={48} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium text-lg">No attendance records found</p>
                  <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or add new attendance records</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Date & Time</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Name</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Status</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Source</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Device</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-900 tracking-wider uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttendance.map((record, index) => (
                            <tr key={record._id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <Calendar size={16} className="text-[#98A2B3]" />
                                  <div>
                                    <div className="text-sm font-medium text-[#101828]">{new Date(record.date).toLocaleDateString()}</div>
                                    <div className="text-xs text-[#98A2B3]">
                                      {new Date(record.timestamp).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-sm font-medium text-[#101828]">
                                  {(() => {
                                    const user = record.studentId || record.userId;
                                    // Handle both Student (f_name/l_name) and User (fname/lname)
                                    const firstName = user?.fname || user?.fname || '';
                                    const lastName = user?.lname || user?.lname || '';
                                    return user ? `${firstName} ${lastName}`.trim() : '-';
                                  })()}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                {getStatusBadge(record.status)}
                              </td>
                              <td className="py-4 px-6">
                                {getSourceBadge(record.source)}
                              </td>
                              <td className="py-4 px-6 text-sm text-[#475467]">
                                <span>{record.deviceId || '-'}</span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(record);
                                      setShowDetailsModal(true);
                                    }}
                                    className="text-[#2970FF] hover:text-[#1D4ED8] transition inline-flex items-center gap-1 text-sm font-medium"
                                    title="View details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedRecord(record);
                                          setShowEditModal(true);
                                        }}
                                        className="text-[#F79009] hover:text-[#DC6803] transition inline-flex items-center gap-1 text-sm font-medium"
                                        title="Edit attendance"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      {record.source === 'manual' && (
                                        deleteConfirmId === record._id ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDelete(record._id)}
                                              className="text-[#F04438] hover:text-[#B42318] text-xs font-medium px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                                            >
                                              Confirm
                                            </button>
                                            <button
                                              onClick={() => setDeleteConfirmId(null)}
                                              className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setDeleteConfirmId(record._id)}
                                            className="text-[#F04438] hover:text-[#B42318] transition inline-flex items-center gap-1 text-sm font-medium"
                                            title="Delete attendance"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {filteredAttendance.map((record) => (
                      <div key={record._id} className="p-4 hover:bg-blue-50 transition-colors duration-150">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-bold text-gray-900">
                                {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2">
                              {(() => {
                                const user = record.studentId || record.userId;
                                // Handle both Student (f_name/l_name) and User (fname/lname)
                                const firstName = user?.fname || user?.fname || '';
                                const lastName = user?.lname || user?.lname || '';
                                return user ? `${firstName} ${lastName}`.trim() : '-';
                              })()}
                            </h3>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowDetailsModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setShowEditModal(true);
                                  }}
                                  className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition"
                                  title="Edit attendance"
                                >
                                  <Edit size={18} />
                                </button>
                                {record.source === 'manual' && (
                                  deleteConfirmId === record._id ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleDelete(record._id)}
                                        className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="px-2 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteConfirmId(record._id)}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                      title="Delete attendance"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Status</span>
                            {getStatusBadge(record.status)}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Source</span>
                            {getSourceBadge(record.source)}
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Device</span>
                            <span className="text-xs font-medium text-gray-900">{record.deviceId || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="px-4 sm:px-6 py-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700 font-semibold order-2 sm:order-1">
                        Page <span className="text-blue-600 font-bold">{page}</span> of <span className="font-bold">{pages}</span>
                        <span className="text-gray-500 ml-2">({total} total record{total !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center order-1 sm:order-2">
                        <button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1 || loading}
                          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 text-sm font-bold text-gray-700 transition-all duration-200 shadow-sm hover:shadow"
                        >
                          Previous
                        </button>
                        <div className="hidden sm:flex gap-2">
                          {[...Array(Math.min(5, pages))].map((_, i) => {
                            const pageNum = Math.max(1, page - 2) + i;
                            if (pageNum > pages) return null;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                disabled={loading}
                                className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-bold min-w-[44px] ${
                                  page === pageNum
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                                    : 'bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 shadow-sm hover:shadow'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setPage(Math.min(pages, page + 1))}
                          disabled={page === pages || loading}
                          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 text-sm font-bold text-gray-700 transition-all duration-200 shadow-sm hover:shadow"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddAttendanceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchAttendance();
          }}
        />
      )}

      {showDetailsModal && selectedRecord && (
        <ViewDetailsModal
          record={selectedRecord}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {showEditModal && selectedRecord && (
        <EditAttendanceModal
          record={selectedRecord}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRecord(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRecord(null);
            fetchAttendance();
          }}
        />
      )}
    </ProtectedRoute>
  );
}