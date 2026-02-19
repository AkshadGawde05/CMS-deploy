'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Upload, AlertTriangle, Calendar, Clock, Users, Archive } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getAllLectures, deleteLecture, archiveLecture, getArchivedLectures, restoreLecture } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import AddLectureModal from '@/components/lectures/AddLectureModal';
import BulkUploadModal from '@/components/lectures/BulkUploadModal';
import { useAuth } from '@/components/auth/AuthProvider';

interface CourseInfo {
  _id: string;
  name: string;
}

interface BatchInfo {
  _id: string;
  name: string;
}

interface TeacherInfo {
  _id: string;
  fname: string;
  lname: string;
}

interface Lecture {
  _id: string;
  course_id: CourseInfo | string;
  batch_id: BatchInfo | string;
  subject: string;
  teacher_id: TeacherInfo | string;
  date: string;
  lecture_start: string;
  lecture_end: string;
  topic: string;
  subtopic?: string;
  note?: string;
  status: string;
  total_students?: number;
  attended_students?: number;
  archived?: boolean;
  isArchived?: boolean;
}

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
  timestamp?: string;
}

export default function LecturesPage() {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission("canEditBatches"); // Lectures are tied to batches
  
  console.log("🔍 [FRONTEND] Current user:", user);
  console.log("🔍 [FRONTEND] Can edit:", canEdit);
  
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedFilter, setArchivedFilter] = useState('active');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [availableCourses, setAvailableCourses] = useState<Array<{id: string, name: string}>>([]);
  const [availableBatches, setAvailableBatches] = useState<Array<{id: string, name: string}>>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    console.log("🔍 [FRONTEND] useEffect triggered, archivedFilter:", archivedFilter);
    fetchLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivedFilter]); // Re-fetch when archive filter changes

  useEffect(() => {
    filterLectures();
    extractFiltersData();
    setCurrentPage(1); // Reset to first page when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, archivedFilter, courseFilter, batchFilter, lectures]);

  const fetchLectures = async () => {
    try {
      console.log("🔍 [FRONTEND] Starting fetchLectures");
      console.log("🔍 [FRONTEND] archivedFilter:", archivedFilter);
      setLoading(true);
      let result;
      
      if (archivedFilter === 'archived') {
        console.log("🔍 [FRONTEND] Fetching archived lectures...");
        // Fetch archived lectures
        result = await getArchivedLectures(1, 1000); // Get all archived
      } else {
        console.log("🔍 [FRONTEND] Fetching active lectures...");
        // Fetch active lectures
        result = await getAllLectures();
      }
      
      console.log("🔍 [FRONTEND] API result:", result);
      console.log("🔍 [FRONTEND] Lectures count:", result?.lectures?.length || 0);
      
      setLectures((result.lectures || []).map(lecture => ({
        ...lecture,
        _id: lecture._id || '',
        date: typeof lecture.date === 'string' ? lecture.date : lecture.date?.toISOString() || '',
        lecture_start: typeof lecture.lecture_start === 'string' ? lecture.lecture_start : lecture.lecture_start?.toISOString() || '',
        lecture_end: typeof lecture.lecture_end === 'string' ? lecture.lecture_end : lecture.lecture_end?.toISOString() || '',
        status: lecture.status || ''
      })));
      setError('');
    } catch (err) {
      console.error("🔍 [FRONTEND] Error fetching lectures:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lectures');
    } finally {
      setLoading(false);
    }
  };

  const filterLectures = () => {
    let filtered = [...lectures];

    if (searchQuery) {
      filtered = filtered.filter(lecture =>
        lecture.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lecture.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lecture.subtopic?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (courseFilter !== 'all') {
      filtered = filtered.filter(lecture => {
        const courseId = typeof lecture.course_id === 'object' ? lecture.course_id?._id : lecture.course_id;
        return String(courseId) === courseFilter;
      });
    }

    if (batchFilter !== 'all') {
      filtered = filtered.filter(lecture => {
        const batchId = typeof lecture.batch_id === 'object' ? lecture.batch_id?._id : lecture.batch_id;
        return String(batchId) === batchFilter;
      });
    }

    setFilteredLectures(filtered);
  };

  const extractFiltersData = () => {
    const coursesMap = new Map<string, string>();
    const batchesMap = new Map<string, string>();

    lectures.forEach(lecture => {
      if (lecture.course_id) {
        const courseId = typeof lecture.course_id === 'object' ? lecture.course_id._id : lecture.course_id;
        const courseName = typeof lecture.course_id === 'object' ? lecture.course_id.name : 'Unknown Course';
        coursesMap.set(courseId, courseName);
      }
      if (lecture.batch_id) {
        const batchId = typeof lecture.batch_id === 'object' ? lecture.batch_id._id : lecture.batch_id;
        const batchName = typeof lecture.batch_id === 'object' ? lecture.batch_id.name : 'Unknown Batch';
        batchesMap.set(batchId, batchName);
      }
    });
    
    setAvailableCourses(Array.from(coursesMap, ([id, name]) => ({ id, name })));
    setAvailableBatches(Array.from(batchesMap, ([id, name]) => ({ id, name })));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lecture?')) {
      try {
        await deleteLecture(id);
        fetchLectures();
      } catch {
        alert('Failed to delete lecture');
      }
    }
  };

  const handleArchive = async (id: string) => {
    if (confirm('Are you sure you want to archive this lecture?')) {
      try {
        await archiveLecture(id);
        fetchLectures();
      } catch {
        alert('Failed to archive lecture');
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('Are you sure you want to restore this lecture?')) {
      try {
        await restoreLecture(id);
        fetchLectures();
      } catch {
        alert('Failed to restore lecture');
      }
    }
  };

  const handleEdit = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setShowAddModal(true);
  };

  const handleBulkUploadSuccess = (failedData?: FailedEntry[]) => {
    if (failedData && failedData.length > 0) {
      setFailedEntries(prev => [...failedData.map(f => ({ 
        ...f, 
        timestamp: new Date().toISOString() 
      })), ...prev]);
    }
    fetchLectures();
  };

  const clearFailedEntries = () => {
    if (confirm('Are you sure you want to clear all failed entries?')) {
      setFailedEntries([]);
    }
  };

  const getCourseName = (courseId: CourseInfo | string) => {
    if (typeof courseId === 'object' && courseId?.name) return courseId.name;
    return 'Unknown Course';
  };

  const getBatchName = (batchId: BatchInfo | string) => {
    if (typeof batchId === 'object' && batchId?.name) return batchId.name;
    return 'Unknown Batch';
  };

  const getTeacherName = (teacherId: TeacherInfo | string) => {
    if (typeof teacherId === 'object' && teacherId) {
      // teacher_id is populated with User data directly
      return `${teacherId.fname || ''} ${teacherId.lname || ''}`.trim();
    }
    return 'Unknown Teacher';
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      ongoing: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getAttendancePercentage = (lecture: Lecture) => {
    if (!lecture.total_students || lecture.total_students === 0) return 0;
    return Math.round(((lecture.attended_students || 0) / lecture.total_students) * 100);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLectures.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLectures = filteredLectures.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Teacher", "Student", "Parent"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />

        <main className="flex-1 overflow-y-auto mt-16">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lectures/Sessions</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Schedule and manage lecture sessions
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-green-700 transition font-medium shadow-sm text-sm"
                  >
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Bulk Upload</span>
                    <span className="xs:hidden">Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingLecture(null);
                      setShowAddModal(true);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm text-sm"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Schedule Lecture</span>
                    <span className="xs:hidden">Schedule</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Failed Entries Section */}
          {failedEntries.length > 0 && (
            <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 xs:gap-0 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  <h3 className="text-sm sm:text-base font-semibold text-red-900">
                    Failed Import Entries ({failedEntries.length})
                  </h3>
                </div>
                <button
                  onClick={clearFailedEntries}
                  className="text-xs sm:text-sm text-red-700 hover:text-red-900 underline self-start xs:self-auto"
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
                          {String(entry.data?.['Topic *'] || '')} • {String(entry.data?.['Subject *'] || '')}
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
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search lectures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Courses</option>
                  {availableCourses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Batches</option>
                  {availableBatches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
                <select
                  value={archivedFilter}
                  onChange={(e) => setArchivedFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <Filter className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Topic & Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Course & Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Attendance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      {canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="px-6 py-12 text-center text-sm text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            Loading lectures...
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="px-6 py-12 text-center text-sm text-red-500">
                          {error}
                        </td>
                      </tr>
                    ) : paginatedLectures.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 8 : 7} className="px-6 py-12 text-center text-sm text-gray-500">
                          No lectures found
                        </td>
                      </tr>
                    ) : (
                      paginatedLectures.map((lecture) => {
                        const attendancePercentage = getAttendancePercentage(lecture);
                        
                        return (
                          <tr key={lecture._id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{lecture.topic}</div>
                                {lecture.subtopic && (
                                  <div className="text-xs text-gray-600 mt-1">{lecture.subtopic}</div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(lecture.date)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{getCourseName(lecture.course_id)}</div>
                              <div className="text-xs text-gray-600 mt-1">{getBatchName(lecture.batch_id)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                                {lecture.subject}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-gray-900">
                                <Clock className="h-4 w-4 text-gray-400" />
                                {formatTime(lecture.lecture_start)}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                to {formatTime(lecture.lecture_end)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{getTeacherName(lecture.teacher_id)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className={`px-2 py-1 text-xs font-medium rounded border ${
                                  attendancePercentage >= 85 ? 'bg-green-100 text-green-800 border-green-200' :
                                  attendancePercentage >= 72 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  'bg-red-100 text-red-800 border-red-200'
                                }`}>
                                  {attendancePercentage}%
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {lecture.attended_students || 0}/{lecture.total_students || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusColor(lecture.status)}`}>
                                {lecture.status}
                              </span>
                            </td>
                            {canEdit && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {archivedFilter !== 'archived' ? (
                                    <>
                                      <button
                                        onClick={() => handleEdit(lecture)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                        title="Edit lecture"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleArchive(lecture._id)}
                                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition"
                                        title="Archive lecture"
                                      >
                                        <Archive className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleRestore(lecture._id)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                      title="Restore lecture"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(lecture._id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                    title="Delete lecture"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
            </div>

            {/* Mobile Card View - Visible on smaller screens */}
            <div className="lg:hidden space-y-3 sm:space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Loading lectures...
                  </div>
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : paginatedLectures.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center text-sm text-gray-500">
                  No lectures found
                </div>
              ) : (
                paginatedLectures.map((lecture) => {
                  const attendancePercentage = getAttendancePercentage(lecture);
                  
                  return (
                    <div key={lecture._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                      {/* Header */}
                      <div className="mb-3 pb-3 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold text-gray-900 break-words">{lecture.topic}</div>
                            {lecture.subtopic && (
                              <div className="text-xs text-gray-600 mt-1">{lecture.subtopic}</div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${getStatusColor(lecture.status)}`}>
                            {lecture.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lecture.date)}
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Course & Batch:</span>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">{getCourseName(lecture.course_id)}</div>
                            <div className="text-xs text-gray-600">{getBatchName(lecture.batch_id)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Subject:</span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded border border-purple-200">
                            {lecture.subject}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Time:</span>
                          <div className="flex items-center gap-1 text-sm text-gray-900">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatTime(lecture.lecture_start)} - {formatTime(lecture.lecture_end)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Teacher:</span>
                          <span className="text-sm text-gray-900">{getTeacherName(lecture.teacher_id)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Attendance:</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                              attendancePercentage >= 85 ? 'bg-green-100 text-green-800 border-green-200' :
                              attendancePercentage >= 72 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {attendancePercentage}%
                            </span>
                            <span className="text-xs text-gray-600">
                              ({lecture.attended_students || 0}/{lecture.total_students || 0})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                          {archivedFilter !== 'archived' ? (
                            <>
                              <button
                                onClick={() => handleEdit(lecture)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit lecture"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleArchive(lecture._id)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded transition"
                                title="Archive lecture"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(lecture._id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                              title="Restore lecture"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(lecture._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete lecture"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary */}
            {filteredLectures.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredLectures.length)} of {filteredLectures.length} lectures
                </p>
                <div className="flex gap-1 flex-wrap justify-center sm:justify-end">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs text-gray-800 font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  }).map((show, _, arr) => {
                    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) => {
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    });
                    return pages;
                  }).flat().map((page, index, array) => {
                    // Add ellipsis
                    const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors ${
                            currentPage === page
                              ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-gray-800 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs text-gray-800 font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <AddLectureModal
          lecture={editingLecture ? {
            ...editingLecture,
            status: editingLecture.status as 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | undefined
          } : undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingLecture(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingLecture(null);
            fetchLectures();
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
