'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect } from 'react';
import { getAttendance, getExams, getStudentPayments, getUserAttendanceStats, getLectures, type LectureDTO } from '@/lib/api';
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

interface FeeInstallment {
  _id?: string;
  installment_no: number;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  last_paid_date?: string;
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<ExamRecord[]>([]);
  const [feeInstallments, setFeeInstallments] = useState<FeeInstallment[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [lectureStats, setLectureStats] = useState<LectureStats | null>(null);
  const [recentLectures, setRecentLectures] = useState<LectureDTO[]>([]);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchStudentData(user.id);
    }
  }, [user]);

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const attendanceResponse = await getAttendance({
        userType: 'Student',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        endDate: new Date().toISOString().split('T')[0],
        page: 1,
        limit: 50
      });

      if (attendanceResponse.success) {
        // Backend already filters for the logged-in student, no need to filter locally
        setAttendance(attendanceResponse.attendance || []);
      }

      // Fetch attendance stats
      const statsResponse = await getUserAttendanceStats(studentId, 'Student');
      if (statsResponse.success) {
        setAttendanceStats(statsResponse.data);
      } else {
        console.error('Failed to fetch attendance stats:', statsResponse);
      }

      // Fetch upcoming exams
      const today = new Date().toISOString().split('T')[0];
      const examsResponse = await getExams(1, 20);

      if (examsResponse.success) {
        // Filter exams for future dates
        const upcomingExamsData = examsResponse.exams.filter((exam) =>
          exam.date && exam.date >= today
        );
        setUpcomingExams(upcomingExamsData as ExamRecord[]);
      }

      // Fetch fee installments
      const feeResponse = await getStudentPayments({
        student: studentId
      });

      if (feeResponse.success) {
        // paymentRecords is the array returned from the backend
        const installments: FeeInstallment[] = feeResponse.paymentRecords || [];
        setFeeInstallments(installments);
      }

      // Fetch lecture data for the student's batch
      const lecturesResponse = await getLectures(1, 100); // Get more lectures to calculate stats

      if (lecturesResponse.success) {
        // Calculate lecture stats
        const lectures = lecturesResponse.lectures || [];
        // Save recent lectures (most recent first)
        setRecentLectures(lectures.slice(0, 8));
        const conducted = lectures.filter(lecture => lecture.status === 'completed').length;
        const cancelled = lectures.filter(lecture => lecture.status === 'cancelled').length;
        const total = conducted + cancelled;

        setLectureStats({
          conducted,
          cancelled,
          total
        });
      }

      // Fetch syllabus for student's batch
      try {
        const syllabusResponse = await fetch(`${API_BASE}/api/syllabus`, {
          credentials: 'include',
        });
        const syllabusData = await syllabusResponse.json();
        if (syllabusData.success && syllabusData.data && syllabusData.data.length > 0) {
          setSyllabus(syllabusData.data[0]); // Student will only get one syllabus (their batch's)
        }
      } catch (err) {
        console.error('Error fetching syllabus:', err);
      }

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Failed to load student data. Please try again.');
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

  const getFeeStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || user?.email}!
            </h1>
            <p className="text-gray-600 mt-2">Here&apos;s your dashboard overview.</p>
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
                  <h2 className="text-xl font-semibold text-gray-900">Lecture Status</h2>
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

              {/* Recent Lectures */}
              <div className="bg-white rounded-lg shadow-sm border lg:col-span-3">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Lectures</h2>
                  <a href="/lectures" className="text-sm text-blue-600">View all</a>
                </div>
                <div className="p-6">
                  {recentLectures.length > 0 ? (
                    <div className="space-y-3">
                      {recentLectures.map((lec) => (
                        <div key={lec._id} className="p-4 border border-gray-100 rounded-md flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{lec.subject || lec.topic}</div>
                            <div className="text-sm text-gray-600">{lec.topic || lec.subtopic}</div>
                            <div className="text-xs text-gray-500">{lec.date ? new Date(lec.date).toLocaleString() : ''}</div>
                          </div>
                          <div>
                            <a href="/lectures" className="text-sm text-blue-600">Open</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent lectures</p>
                  )}
                </div>
              </div>

              {/* Syllabus Section - Full Width */}
              {syllabus && (
                <div className="lg:col-span-3">
                  <SyllabusViewer
                    items={syllabus.items}
                    title="Your Course Syllabus"
                    academicYear={syllabus.academic_year}
                    batchName={syllabus.batch_id.name}
                    courseName={syllabus.course_id.name}
                    showProgress={false}
                  />
                </div>
              )}

              {/* Fee Installments Section - Full Width */}
              <div className="bg-white rounded-lg shadow-sm border lg:col-span-3">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Fee Installments & Status</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Installment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remaining
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {feeInstallments.length > 0 ? (
                          feeInstallments.map((installment) => (
                            <tr key={`installment-${installment.installment_no}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{installment.installment_no}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{installment.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{installment.paid_amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{installment.remaining_amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(installment.due_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFeeStatusColor(installment.status)}`}>
                                  {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                              No fee installments found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}