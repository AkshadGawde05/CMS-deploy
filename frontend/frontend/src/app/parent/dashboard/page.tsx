'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect } from 'react';

interface ChildDashboard {
  id: string;
  name: string;
  batch: string;
  course: string;
  feeStatus: string;
  admissionDate: string;
  attendance: {
    total: number;
    present: number;
    percentage: number;
  };
  syllabus: {
    id: string;
    name: string;
    itemsCount: number;
    academicYear: string;
  };
  lectures: {
    total: number;
    pending: number;
    recent: Array<{
      id: string;
      title: string;
      date: string;
      topics: string;
    }>;
  };
  recentActivity: {
    attendance: Array<{
      date: string;
      status: 'present' | 'late' | 'absent' | 'excused';
      source: string;
    }>;
  };
}

interface DashboardData {
  user: {
    id: string;
    name: string;
    role: string;
    relation: string;
  };
  children: ChildDashboard[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch parent dashboard data on component mount
  useEffect(() => {
    const fetchParentDashboard = async () => {
      if (!user || user.role !== 'Parent') return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/dashboard/parent`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        if (data.success) {
          setDashboardData(data.data);
        } else {
          setError(data.message || 'Failed to load dashboard');
        }
      } catch (err) {
        console.error('Error fetching parent dashboard:', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchParentDashboard();
  }, [user]);

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'excused': return 'text-blue-600 bg-blue-100';
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
    <ProtectedRoute allowedRoles={["Parent", "Admin", "SuperAdmin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Hello {user?.name || user?.email}
            </h1>
            <p className="text-gray-600 mt-2">
              {dashboardData?.children && dashboardData.children.length > 0
                ? `You are viewing ${dashboardData.children.length} child${dashboardData.children.length !== 1 ? 'ren' : ''}.`
                : 'Welcome to the Parent dashboard.'}
            </p>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading your children&apos;s data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && dashboardData && dashboardData.children && dashboardData.children.length > 0 ? (
            <div className="space-y-8">
              {dashboardData.children.map((child) => (
                <div key={child.id} className="border-t-4 border-blue-500 pt-8">
                  {/* Child Header */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{child.name}</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {child.batch} • {child.course} • Enrolled: {new Date(child.admissionDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Child Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Attendance */}
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getAttendanceColor(child.attendance.percentage)}`}>
                          {child.attendance.percentage}%
                        </div>
                        <div className="text-sm text-gray-600 mt-2">Attendance</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {child.attendance.present}/{child.attendance.total} days
                        </div>
                      </div>
                    </div>

                    {/* Lectures */}
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{child.lectures.total}</div>
                        <div className="text-sm text-gray-600 mt-2">Lectures</div>
                        <div className="text-xs text-gray-500 mt-1">{child.lectures.pending} pending</div>
                      </div>
                    </div>

                    {/* Syllabus */}
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">{child.syllabus.itemsCount}</div>
                        <div className="text-sm text-gray-600 mt-2">Syllabus Items</div>
                        <div className="text-xs text-gray-500 mt-1">{child.syllabus.name || 'Not defined'}</div>
                      </div>
                    </div>

                    {/* Fee Status */}
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFeeStatusColor(child.feeStatus)}`}>
                          {child.feeStatus.charAt(0).toUpperCase() + child.feeStatus.slice(1)}
                        </span>
                        <div className="text-sm text-gray-600 mt-2">Fee Status</div>
                      </div>
                    </div>
                  </div>

                  {/* Child Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Recent Lectures */}
                    <div className="bg-white rounded-lg shadow-sm border">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Lectures</h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {child.lectures.recent && child.lectures.recent.length > 0 ? (
                            child.lectures.recent.map((lecture) => (
                              <div key={lecture.id} className="p-3 bg-gray-50 rounded-md">
                                <div className="font-medium text-gray-900 text-sm">{lecture.title}</div>
                                <div className="text-xs text-gray-600 mt-1">{lecture.topics}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(lecture.date).toLocaleDateString()}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-4">No lectures available</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent Attendance */}
                    <div className="bg-white rounded-lg shadow-sm border">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Attendance</h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {child.recentActivity.attendance && child.recentActivity.attendance.length > 0 ? (
                            child.recentActivity.attendance.map((record, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {new Date(record.date).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-600">{record.source}</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-4">No attendance records</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-600">No children linked to your account.</p>
              </div>
            )
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
