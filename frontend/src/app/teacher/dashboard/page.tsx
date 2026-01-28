'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect } from 'react';
import { getAttendance, getExams, getLectures, getAllBatches, getUserAttendanceStats, BatchDTO } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import SyllabusViewer from '@/components/syllabus/SyllabusViewer';

interface AttendanceRecord {
  _id: string;
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  source: string;
  notes?: string;
}

interface ExamRecord {
  _id: string;
  subject: string;
  topic: string;
  date: string;
  total_marks: number;
  exam_type: string;
  batch_id: {
    _id: string;
    name: string;
  };
}

interface AttendanceStats {
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  percentage: number;
  text: string;
}

interface LectureStats {
  conducted: number;
  cancelled: number;
  total: number;
}

interface SyllabusItem {
  _id?: string;
  subject: string;
  topic: string;
  subtopic?: string;
  description?: string;
  duration_hours?: number;
  order?: number;
}

interface Syllabus {
  _id: string;
  batch_id: { _id: string; name: string };
  course_id: { _id: string; name: string };
  academic_year: string;
  items: SyllabusItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<ExamRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStats | null>(null);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchTeacherData(user.id);
    }
  }, [user]);

  const fetchTeacherData = async (teacherId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch teacher's attendance
      const attendanceResponse = await getAttendance({
        userId: teacherId,
        userType: 'Teacher',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        endDate: new Date().toISOString().split('T')[0],
        page: 1,
        limit: 50
      });

      if (attendanceResponse.success) {
        setAttendance(attendanceResponse.attendance || []);
      }

      // Fetch attendance stats using the same API as student dashboard
      const statsResponse = await getUserAttendanceStats(teacherId, 'Teacher');
      if (statsResponse.success) {
        setAttendanceStats(statsResponse.data);
      } else {
        console.error('Failed to fetch teacher attendance stats:', statsResponse);
      }

      // First, get batches assigned to this teacher
      const batchesResponse = await getAllBatches();
      const teacherBatches: BatchDTO[] = batchesResponse.success
        ? batchesResponse.batches.filter((batch: BatchDTO) => batch.teacher_id === teacherId)
        : [];
      const teacherBatchIds = teacherBatches.map((batch: BatchDTO) => batch._id);

      // Fetch upcoming exams for batches assigned to this teacher
      const today = new Date().toISOString().split('T')[0];
      const examsResponse = await getExams(1, 100); // Get more exams to filter

      if (examsResponse.success) {
        // Filter exams for future dates and only for teacher's batches
        const upcomingExamsData = examsResponse.exams.filter((exam) =>
          exam.date && exam.date >= today &&
          teacherBatchIds.includes(typeof exam.batch_id === 'string' ? exam.batch_id : exam.batch_id?._id)
        );
        setUpcomingExams(upcomingExamsData as ExamRecord[]);
      }

      // Fetch lectures taught by this teacher (already filtered by teacher_id)
      const lecturesResponse = await getLectures(1, 100, { teacher_id: teacherId });

      if (lecturesResponse.success) {
        // Calculate lecture stats - only conducted and cancelled
        const lectures = lecturesResponse.lectures || [];
        const conducted = lectures.filter(lecture => lecture.status === 'completed').length;
        const cancelled = lectures.filter(lecture => lecture.status === 'cancelled').length;
        const total = conducted + cancelled;

        setLectureStats({
          conducted,
          cancelled,
          total
        });
      }

      // Fetch syllabi for teacher's assigned batches
      try {
        const syllabusResponse = await fetch(`${API_BASE}/api/syllabus`, {
          credentials: 'include',
        });
        const syllabusData = await syllabusResponse.json();
        if (syllabusData.success && syllabusData.data) {
          setSyllabi(syllabusData.data);
          if (syllabusData.data.length > 0) {
            setSelectedSyllabus(syllabusData.data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching syllabus:', err);
      }

    } catch (err) {
      console.error('Error fetching teacher data:', err);
      setError('Failed to load teacher data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getExamTypeColor = (examType: string) => {
    switch (examType) {
      case 'on_theory': return 'text-blue-600 bg-blue-100';
      case 'off_theory': return 'text-purple-600 bg-purple-100';
      case 'on_mcq': return 'text-green-600 bg-green-100';
      case 'off_mcq': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Teacher"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || user?.email}!
            </h1>
            <p className="text-gray-600 mt-2">Here&apos;s your teaching dashboard overview.</p>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading your data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Attendance Section */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Your Attendance</h2>
                  {attendanceStats && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{attendanceStats.percentage}%</div>
                        <div className="text-sm text-gray-600">Attendance Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{attendanceStats.presentCount}</div>
                        <div className="text-sm text-gray-600">Present Days</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {attendance.length > 0 ? (
                      attendance.slice(0, 10).map((record) => (
                        <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div>
                            <div className="font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(record.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No attendance records found</p>
                    )}
                  </div>
                  {attendance.length > 10 && (
                    <p className="text-sm text-gray-500 text-center mt-4">
                      Showing last 10 records. Total: {attendance.length}
                    </p>
                  )}
                </div>
              </div>

              {/* Upcoming Exams Section */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming Exams</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {upcomingExams.length > 0 ? (
                      upcomingExams.map((exam) => (
                        <div key={exam._id} className="p-4 border border-gray-200 rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900">{exam.subject}</h3>
                              <p className="text-sm text-gray-600">{exam.topic}</p>
                              <p className="text-sm text-gray-500">{exam.batch_id?.name}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(exam.date).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-600">
                                {exam.total_marks} marks
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 inline-block ${getExamTypeColor(exam.exam_type)}`}>
                                {exam.exam_type.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No upcoming exams</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lecture Status Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Your Lectures</h2>
                </div>
                <div className="p-6">
                  {lectureStats && lectureStats.total > 0 ? (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width={300} height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Conducted', value: lectureStats.conducted, fill: '#10B981' },
                              { name: 'Cancelled', value: lectureStats.cancelled, fill: '#EF4444' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{lectureStats.conducted}</div>
                          <div className="text-sm text-gray-600">Conducted</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{lectureStats.cancelled}</div>
                          <div className="text-sm text-gray-600">Cancelled</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No lecture data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Syllabus Section - Full Width */}
          {!loading && syllabi.length > 0 && (
            <div className="mt-6">
              {/* Batch Selection if multiple syllabi */}
              {syllabi.length > 1 && (
                <div className="mb-4 bg-white rounded-lg shadow-sm border p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Batch to View Syllabus:
                  </label>
                  <select
                    value={selectedSyllabus?._id || ''}
                    onChange={(e) => {
                      const selected = syllabi.find(s => s._id === e.target.value);
                      setSelectedSyllabus(selected || null);
                    }}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {syllabi.map((syl) => (
                      <option key={syl._id} value={syl._id}>
                        {syl.batch_id.name} - {syl.course_id.name} ({syl.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Display Selected Syllabus */}
              {selectedSyllabus && (
                <SyllabusViewer
                  items={selectedSyllabus.items}
                  title="Course Syllabus"
                  academicYear={selectedSyllabus.academic_year}
                  batchName={selectedSyllabus.batch_id.name}
                  courseName={selectedSyllabus.course_id.name}
                  showProgress={false}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
