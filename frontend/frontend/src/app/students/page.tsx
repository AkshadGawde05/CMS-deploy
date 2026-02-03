'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Mail, AlertTriangle } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getAllStudents, deleteStudent, getParentsByStudent, getUserAttendanceStats } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import AddStudentModal from '@/components/students/AddStudentModal';
import BulkUploadModal from '@/components/students/BulkUploadModal';
import { useAuth } from '@/components/auth/AuthProvider';

interface Student {
  _id: string;
  fname: string;
  lname: string;
  user_id: {
    _id: string;
    email: string;
    phone: string;
    status: boolean;
  };
  course_id?: string;
  batch_id?: string;
  dob?: string;
  gender: string;
  aadhar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  admission_date: string;
  fee_status: string;
  status: boolean;
  parents?: Array<{
    _id: string;
    user_id: {
      fname: string;
      lname: string;
      phone: string;
    };
    relation: string;
  }>;
  metadata?: {
    attendance?: {
      total_classes: number;
      attended_classes: number;
      percentage: number;
    };
    test_progress?: {
      completed: number;
      total: number;
    };
    batch_info?: {
      _id: string;
      name: string;
    };
    course_info?: {
      _id: string;
      name: string;
    };
    fee_info?: {
      total: number;
      paid: number;
      percentage_paid: number;
    };
  };
}

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
  timestamp?: string;
}

export default function StudentsPage() {
  const { hasPermission } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<{ [key: string]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [attendanceData, setAttendanceData] = useState<Map<string, { percentage: number; text: string }>>(new Map());

  // Check permissions
  const canEdit = hasPermission("canEditStudents");

  const [availableCourses, setAvailableCourses] = useState<Array<{id: string, name: string}>>([]);
  const [availableBatches, setAvailableBatches] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    fetchStudentsWithParents();
  }, []);

  useEffect(() => {
    filterStudents();
    extractFiltersData();
    setCurrentPage(1); // Reset to first page when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, courseFilter, batchFilter, students]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendanceForAllStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const fetchStudentsWithParents = async () => {
    try {
      setLoading(true);
      const result = await getAllStudents();
      const studentsData = result.students || [];
      
      const studentsWithParents = await Promise.all(
        studentsData.map(async (student: Student) => {
          try {
            const parentsResult = await getParentsByStudent(student._id);
            return {
              ...student,
              parents: parentsResult.parents || []
            };
          } catch {
            return { ...student, parents: [] };
          }
        })
      );
      
      setStudents(studentsWithParents);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForAllStudents = async () => {
    try {
      const newAttendanceData = new Map();
      
      await Promise.all(
        students.map(async (student) => {
          try {
            const result = await getUserAttendanceStats(student._id, 'Student');
            if (result.success && result.data) {
              newAttendanceData.set(student._id, {
                percentage: result.data.percentage,
                text: result.data.text
              });
            } else {
              console.warn(`Failed to fetch attendance for student ${student._id}:`, result);
              newAttendanceData.set(student._id, { percentage: 0, text: 'N/A' });
            }
          } catch (error) {
            console.error(`Error fetching attendance for student ${student._id}:`, error);
            newAttendanceData.set(student._id, { percentage: 0, text: 'N/A' });
          }
        })
      );
      
      setAttendanceData(newAttendanceData);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    }
  };

  const extractFiltersData = () => {
    const coursesMap = new Map();
    const batchesMap = new Map();
    
    students.forEach(student => {
      if (student.metadata?.course_info) {
        coursesMap.set(student.metadata.course_info._id, student.metadata.course_info.name);
      }
      if (student.metadata?.batch_info) {
        batchesMap.set(student.metadata.batch_info._id, student.metadata.batch_info.name);
      }
    });
    
    setAvailableCourses(Array.from(coursesMap, ([id, name]) => ({ id, name })));
    setAvailableBatches(Array.from(batchesMap, ([id, name]) => ({ id, name })));
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchQuery) {
      filtered = filtered.filter(student =>
        `${student.fname} ${student.lname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.user_id?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.user_id?.phone?.includes(searchQuery)
      );
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter(student => student.course_id === courseFilter);
    }

    if (batchFilter !== 'all') {
      filtered = filtered.filter(student => student.batch_id === batchFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(id);
        fetchStudentsWithParents();
      } catch {
        alert('Failed to delete student');
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowAddModal(true);
  };

  const handleSendCredentials = async (studentId: string) => {
    setSendingCredentials(prev => ({ ...prev, [studentId]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}/send-credentials`, {
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
      setSendingCredentials(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleBulkUploadSuccess = (failedData?: FailedEntry[]) => {
    if (failedData && failedData.length > 0) {
      setFailedEntries(prev => [...failedData.map(f => ({ 
        ...f, 
        timestamp: new Date().toISOString() 
      })), ...prev]);
    }
    fetchStudentsWithParents();
  };

  const clearFailedEntries = () => {
    if (confirm('Are you sure you want to clear all failed entries?')) {
      setFailedEntries([]);
    }
  };

  const getAttendanceData = (student: Student) => {
    const data = attendanceData.get(student._id);
    if (data) {
      return data;
    }
    return { percentage: 0, text: 'N/A' };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTestProgress = (student: Student) => {
    if (student.metadata?.test_progress) {
      return `${student.metadata.test_progress.completed}/${student.metadata.test_progress.total}`;
    }
    return 'N/A';
  };

  const getBatchName = (student: Student) => {
    return student.metadata?.batch_info?.name || 'No Batch';
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFeeStatusColor = (status: string) => {
    const colors = {
      paid: 'text-green-600 bg-green-50 border-green-200',
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      partial: 'text-blue-600 bg-blue-50 border-blue-200',
      overdue: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getAttendanceBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBarColor = (completed: number, total: number) => {
    const percentage = (completed / total) * 100;
    if (percentage >= 75) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-blue-400';
    return 'bg-blue-300';
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const formatFees = (student: Student) => {
    if (student.metadata?.fee_info) {
      const { total, paid, percentage_paid } = student.metadata.fee_info;
      return {
        display: `₹${paid.toLocaleString()} / ₹${total.toLocaleString()}`,
        percentage: `${percentage_paid}% Paid`
      };
    }
    return { display: 'N/A', percentage: '' };
  };

  const getParentsInfo = (student: Student) => {
    if (!student.parents || student.parents.length === 0) {
      return { text: 'No guardians', phone: '' };
    }
    
    const parentsList = student.parents.map(p => 
      `${p.user_id.fname} ${p.user_id.lname} (${p.relation})`
    ).join(', ');
    
    return { 
      text: parentsList,
      phone: student.parents[0]?.user_id.phone || ''
    };
  };

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher"]}>
      <div className="min-h-screen bg-[#F8F9FD]">
        <Sidebar />
        <Navbar />
      
      <main className="lg:ml-64 pt-16 px-3 sm:px-4 lg:px-6 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex-1">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-[#101828]">Students</h1>
            <p className="text-xs text-[#475467] mt-0.5">
              Manage student records and enrollments
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-row w-full sm:w-auto gap-2">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex-1 sm:flex-none bg-[#16A34A] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setShowAddModal(true);
                }}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Student</span>
              </button>
            </div>
          )}
        </div>

        {/* Failed Entries Section */}
        {failedEntries.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="text-xs sm:text-sm font-semibold text-red-900">
                  Failed Entries ({failedEntries.length})
                </h3>
              </div>
              <button
                onClick={clearFailedEntries}
                className="text-xs text-red-700 hover:text-red-900 underline font-medium"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {failedEntries.map((entry, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded border border-red-300 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-red-900 truncate">
                        Row {entry.row} - {entry.error}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                        {String(entry.data?.['First Name *'] || '')} {String(entry.data?.['Last Name *'] || '')} • {String(entry.data?.['Email *'] || '')}
                      </p>
                    </div>
                    {entry.timestamp && (
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
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
        <div className="bg-white rounded-lg border border-[#EAECF0] p-3 mb-3 sm:mb-4">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Courses</option>
                {availableCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Batches</option>
                {availableBatches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden lg:block bg-white rounded-lg border border-[#EAECF0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-[#EAECF0] bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[15%]">STUDENT</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">CONTACT</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[13%]">GUARDIAN</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[10%]">BATCH</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">ATTENDANCE</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[14%]">FEES STATUS</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">TEST</th>
                  {canEdit && (
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475467] tracking-wider w-[12%]">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="px-4 py-12 text-center text-sm text-[#475467]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        Loading students...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="px-4 py-12 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="px-4 py-12 text-center text-sm text-[#475467]">
                      No students found
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const attendance = getAttendanceData(student);
                    const fees = formatFees(student);
                    const testProgress = student.metadata?.test_progress;
                    const parentsInfo = getParentsInfo(student);
                    
                    return (
                      <tr key={student._id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-white font-semibold text-xs">
                                {getInitials(student.fname, student.lname)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-[#101828] truncate">
                                {student.fname} {student.lname}
                              </div>
                              <div className="text-xs text-[#667085] truncate">
                                {student.user_id?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-[#101828] truncate">
                            {student.user_id?.phone || 'No phone'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="min-w-0">
                            <div className="text-sm text-[#101828] truncate" title={parentsInfo.text}>
                              {parentsInfo.text}
                            </div>
                            {parentsInfo.phone && (
                              <div className="text-xs text-[#667085] truncate">
                                📞 {parentsInfo.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200 whitespace-nowrap">
                            {getBatchName(student)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all ${getAttendanceBarColor(attendance.percentage)}`}
                                  style={{ width: `${attendance.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-[#475467] whitespace-nowrap">
                                {attendance.percentage}%
                              </span>
                            </div>
                            <div className="text-xs text-[#667085]">{attendance.text}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-[#101828] truncate">{fees.display}</div>
                            <span className={`text-xs font-medium ${
                              student.fee_status === 'paid' ? 'text-green-600' : 
                              student.fee_status === 'partial' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {fees.percentage || student.fee_status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {testProgress ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all ${getProgressBarColor(testProgress.completed, testProgress.total)}`}
                                    style={{ width: `${Math.min(100, (testProgress.completed / testProgress.total) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium text-[#475467] whitespace-nowrap">
                                  {testProgress.completed}/{testProgress.total}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#667085]">N/A</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSendCredentials(student._id)}
                                disabled={sendingCredentials[student._id]}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Send login credentials"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit student"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(student._id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete student"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-[#101828] font-medium">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
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
                  // Show first page, last page, current page, and pages around current
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
        <div className="lg:hidden space-y-2 sm:space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg border border-[#EAECF0] p-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-xs sm:text-sm text-[#475467]">Loading students...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-[#EAECF0] p-8 sm:p-12 text-center">
              <p className="text-xs sm:text-sm text-red-500">{error}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#EAECF0] p-8 sm:p-12 text-center">
              <p className="text-xs sm:text-sm text-[#475467]">No students found</p>
            </div>
          ) : (
            paginatedStudents.map((student) => {
              const attendance = getAttendanceData(student);
              const fees = formatFees(student);
              const testProgress = student.metadata?.test_progress;
              const parentsInfo = getParentsInfo(student);
              
              return (
                <div key={student._id} className="bg-white rounded-lg border border-[#EAECF0] p-3 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start gap-2.5 pb-2.5 border-b border-gray-100">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">
                        {getInitials(student.fname, student.lname)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#101828] text-sm sm:text-base">
                        {student.fname} {student.lname}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#667085] truncate">{student.user_id?.email}</p>
                      <p className="text-xs sm:text-sm text-[#667085]">{student.user_id?.phone}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 pt-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs text-[#667085] font-medium">Guardian</span>
                      <div className="text-right max-w-[60%]">
                        <p className="text-xs text-[#101828] font-medium truncate">{parentsInfo.text}</p>
                        {parentsInfo.phone && (
                          <p className="text-xs text-[#667085]">📞 {parentsInfo.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#667085] font-medium">Batch</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                        {getBatchName(student)}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#667085] font-medium">Attendance</span>
                        <span className="text-xs font-semibold text-[#475467]">{attendance.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getAttendanceBarColor(attendance.percentage)}`}
                          style={{ width: `${attendance.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-[#667085] mt-1">{attendance.text}</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#667085] font-medium">Fees</span>
                        <span className={`text-xs font-medium ${
                          student.fee_status === 'paid' ? 'text-green-600' : 
                          student.fee_status === 'partial' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {fees.percentage || student.fee_status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">{fees.display}</p>
                    </div>

                    {testProgress && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-[#667085] font-medium">Tests</span>
                          <span className="text-xs font-semibold text-[#475467]">
                            {testProgress.completed}/{testProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${getProgressBarColor(testProgress.completed, testProgress.total)}`}
                            style={{ width: `${Math.min(100, (testProgress.completed / testProgress.total) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-gray-100">
                      <button
                        onClick={() => handleSendCredentials(student._id)}
                        disabled={sendingCredentials[student._id]}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 text-xs font-medium"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-xs font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Pagination - Mobile */}
          {filteredStudents.length > 0 && (
            <div className="bg-white rounded-lg border border-[#EAECF0] p-3 mt-2">
              <p className="text-xs text-center text-[#101828] font-medium mb-2">
                {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
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

      {showAddModal && (
        <AddStudentModal
          student={editingStudent || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingStudent(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingStudent(null);
            fetchStudentsWithParents();
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
