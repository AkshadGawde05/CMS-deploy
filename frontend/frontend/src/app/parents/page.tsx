'use client';
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getAllParents, deleteParent } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import AddParentModal from '@/components/parents/AddParentModal';
import { useAuth } from '@/components/auth/AuthProvider';


interface Parent {
  _id: string;
  user_id: {
    _id: string;
    fname: string;
    lname: string;
    email: string;
    phone: string;
    status: boolean;
  };
  student_id: {
    _id: string;
    fname: string;
    lname: string;
    user_id: {
      email: string;
    };
  };
  aadhar?: string;
  relation: string;
  occupation?: string;
  annual_income?: number;
  status: boolean;
}

export default function ParentsPage() {
  const { user } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  useEffect(() => {
    filterParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, relationFilter, parents]);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const result = await getAllParents();
      setParents(result.parents || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parents');
    } finally {
      setLoading(false);
    }
  };

  const filterParents = () => {
    let filtered = [...parents];

    if (searchQuery) {
      filtered = filtered.filter(parent =>
        `${parent.user_id?.fname || ''} ${parent.user_id?.lname || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${parent.student_id?.fname || ''} ${parent.student_id?.lname || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parent.user_id?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parent.user_id?.phone?.includes(searchQuery)
      );
    }

    if (relationFilter !== 'all') {
      filtered = filtered.filter(parent => parent.relation === relationFilter);
    }

    setFilteredParents(filtered);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this parent?')) {
      try {
        await deleteParent(id);
        fetchParents();
      } catch {
        alert('Failed to delete parent');
      }
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setShowAddModal(true);
  };

  const getRelationColor = (relation: string) => {
    const colors = {
      father: 'text-blue-700 bg-blue-50 border-blue-200',
      mother: 'text-pink-700 bg-pink-50 border-pink-200',
      guardian: 'text-purple-700 bg-purple-50 border-purple-200'
    };
    return colors[relation as keyof typeof colors] || 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const formatIncome = (income?: number) => {
    if (!income) return 'N/A';
    return `₹${income.toLocaleString()}`;
  };

  return (
    <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />

        <main className="flex-1 overflow-y-auto mt-16">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Parents</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Manage parent and guardian records
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingParent(null);
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base whitespace-nowrap"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Add Parent
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parents"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={relationFilter}
                  onChange={(e) => setRelationFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Relations</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                </select>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <Filter className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Parent Name
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Relation
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Occupation
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Annual Income
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          Loading parents...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-red-500">
                          {error}
                        </td>
                      </tr>
                    ) : filteredParents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          No parents found
                        </td>
                      </tr>
                    ) : (
                      filteredParents.map((parent) => (
                        <tr key={parent._id} className="hover:bg-gray-50 transition">
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <span className="text-white font-semibold text-sm">
                                  {getInitials(parent.user_id?.fname, parent.user_id?.lname)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {parent.user_id.fname} {parent.user_id.lname}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {parent.user_id.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {parent.user_id.phone || 'No phone'}
                            </div>
                            {parent.aadhar && (
                              <div className="text-xs text-gray-600">
                                Aadhar: {parent.aadhar}
                              </div>
                            )}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-md border capitalize ${getRelationColor(parent.relation)}`}>
                              {parent.relation}
                            </span>
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {parent.student_id?.fname || 'N/A'} {parent.student_id?.lname || ''}
                            </div>
                            { user?.role !== 'SuperAdmin' && (
                              <div className="text-xs text-gray-600">
                                {parent.student_id?.fname || 'N/A'} {parent.student_id?.lname || ''}
                              </div>
                            )}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {parent.occupation || 'Not specified'}
                            </div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatIncome(parent.annual_income)}
                            </div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(parent)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit parent"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(parent._id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete parent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Card View - Visible on smaller screens */}
            <div className="lg:hidden space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
                  Loading parents...
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : filteredParents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
                  No parents found
                </div>
              ) : (
                filteredParents.map((parent) => (
                  <div key={parent._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                    {/* Header with Avatar and Name */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-white font-semibold text-base">
                            {getInitials(parent.user_id?.fname, parent.user_id?.lname)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold text-gray-900 truncate">
                            {parent.user_id.fname} {parent.user_id.lname}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded border capitalize ${getRelationColor(parent.relation)}`}>
                            {parent.relation}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(parent)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit parent"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(parent._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete parent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">Email:</span>
                        <span className="text-sm text-gray-900 break-all">{parent.user_id?.email || 'No email'}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">Phone:</span>
                        <span className="text-sm text-gray-900">{parent.user_id?.phone || 'No phone'}</span>
                      </div>
                      {parent.aadhar && (
                        <div className="flex items-start">
                          <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">Aadhar:</span>
                          <span className="text-sm text-gray-900">{parent.aadhar}</span>
                        </div>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">Student:</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {parent.student_id?.fname || 'N/A'} {parent.student_id?.lname || ''}
                          </div>
                          { user?.role !== 'SuperAdmin' && (
                              <div className="text-xs text-gray-600">
                                {parent.student_id?.fname || 'N/A'} {parent.student_id?.lname || ''}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Occupation</span>
                        <span className="text-sm text-gray-900">{parent.occupation || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Annual Income</span>
                        <span className="text-sm font-medium text-gray-900">{formatIncome(parent.annual_income)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredParents.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {filteredParents.length} of {parents.length} parents
                </p>
                <div className="flex gap-1">
                  <button className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                    Previous
                  </button>
                  <button className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded font-medium">
                    1
                  </button>
                  <button className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">
                    2
                  </button>
                  <button className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showAddModal && (
        <AddParentModal
          parent={editingParent || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingParent(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingParent(null);
            fetchParents();
          }}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}