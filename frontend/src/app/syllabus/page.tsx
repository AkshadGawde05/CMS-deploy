'use client';
import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import BulkUploadModal from '@/components/syllabus/BulkUploadModal';
import { Plus, Edit, Trash2, Search, AlertCircle, Upload } from 'lucide-react';

interface SyllabusItem {
  _id?: string;
  subject: string;
  topic: string;
  subtopic?: string;
  description?: string;
  duration_hours?: number;
  order?: number;
  created_at?: string;
}

interface Syllabus {
  _id: string;
  batch_id: { _id: string; name: string };
  course_id: { _id: string; name: string };
  academic_year: string;
  items: SyllabusItem[];
  created_by: { name: string; email: string };
  updated_at: string;
}

interface Batch {
  _id: string;
  name: string;
  course_id: string;
}

interface Course {
  _id: string;
  name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SyllabusPage() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingItemId, setEditingItemId] = useState<{ syllabusId: string; itemId: string } | null>(null);
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    batch_id: '',
    course_id: '',
    academic_year: new Date().getFullYear().toString(),
    subject: '',
    topic: '',
    subtopic: '',
    description: '',
    duration_hours: 1,
  });

  useEffect(() => {
    fetchSyllabi();
    fetchBatches();
    fetchCourses();
  }, []);

  const fetchSyllabi = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/syllabus`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi(data.data);
        setError('');
      } else {
        setError('Failed to fetch syllabi');
      }
    } catch (err) {
      setError('Error fetching syllabi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/batches`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success || Array.isArray(data.batches)) {
        setBatches(data.batches || data.data || []);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/courses`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success || Array.isArray(data.courses)) {
        setCourses(data.courses || data.data || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id) {
      setError('Please select a course');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/syllabus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batch_id: formData.batch_id,
          course_id: formData.course_id,
          academic_year: formData.academic_year,
          items: [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi([...syllabi, data.data]);
        setShowCreateForm(false);
        setFormData({
          batch_id: '',
          course_id: '',
          academic_year: new Date().getFullYear().toString(),
          subject: '',
          topic: '',
          subtopic: '',
          description: '',
          duration_hours: 1,
        });
        setError('');
      } else {
        setError(data.message || 'Failed to create syllabus');
      }
    } catch (err) {
      setError('Error creating syllabus');
      console.error(err);
    }
  };

  const handleAddItem = async (syllabusId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.topic) {
      setError('Subject and topic are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/syllabus/${syllabusId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: formData.subject,
          topic: formData.topic,
          subtopic: formData.subtopic,
          description: formData.description,
          duration_hours: formData.duration_hours,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi(
          syllabi.map(s =>
            s._id === syllabusId ? data.data : s
          )
        );
        setFormData({
          ...formData,
          subject: '',
          topic: '',
          subtopic: '',
          description: '',
          duration_hours: 1,
        });
        setError('');
      } else {
        setError(data.message || 'Failed to add item');
      }
    } catch (err) {
      setError('Error adding item');
      console.error(err);
    }
  };

  const handleUpdateItem = async (syllabusId: string, itemId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.topic) {
      setError('Subject and topic are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/syllabus/${syllabusId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: formData.subject,
          topic: formData.topic,
          subtopic: formData.subtopic,
          description: formData.description,
          duration_hours: formData.duration_hours,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi(
          syllabi.map(s =>
            s._id === syllabusId ? data.data : s
          )
        );
        setEditingItemId(null);
        setFormData({
          batch_id: '',
          course_id: '',
          academic_year: new Date().getFullYear().toString(),
          subject: '',
          topic: '',
          subtopic: '',
          description: '',
          duration_hours: 1,
        });
        setError('');
      } else {
        setError(data.message || 'Failed to update item');
      }
    } catch (err) {
      setError('Error updating item');
      console.error(err);
    }
  };

  const handleDeleteItem = async (syllabusId: string, itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/syllabus/${syllabusId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi(
          syllabi.map(s =>
            s._id === syllabusId ? data.data : s
          )
        );
        setError('');
      } else {
        setError(data.message || 'Failed to delete item');
      }
    } catch (err) {
      setError('Error deleting item');
      console.error(err);
    }
  };

  const handleDeleteSyllabus = async (syllabusId: string) => {
    if (!confirm('Are you sure you want to delete this entire syllabus?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/syllabus/${syllabusId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setSyllabi(syllabi.filter(s => s._id !== syllabusId));
        setError('');
      } else {
        setError(data.message || 'Failed to delete syllabus');
      }
    } catch (err) {
      setError('Error deleting syllabus');
      console.error(err);
    }
  };

  const filteredSyllabi = syllabi.filter(s => {
  const batchName =
    typeof s.batch_id === 'object' && s.batch_id?.name
      ? s.batch_id.name.toLowerCase()
      : '';

  const courseName =
    typeof s.course_id === 'object' && s.course_id?.name
      ? s.course_id.name.toLowerCase()
      : '';

  const year = s.academic_year?.toLowerCase() || '';
  const query = searchQuery.toLowerCase();

  return (
    batchName.includes(query) ||
    courseName.includes(query) ||
    year.includes(query)
  );
});


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
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Syllabus Management</h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Create and manage course syllabi for batches
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition font-medium shadow-sm text-sm"
                  >
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition font-medium shadow-sm text-sm"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Create Syllabus
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Create Form */}
{showCreateForm && (
  <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-200">
    <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">Create New Syllabus</h2>
    <form onSubmit={handleCreateSyllabus} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Batch (optional) */}
        
          {/* <label className="block text-sm font-medium text-gray-700 mb-2">Batch (optional)</label>
          <select
            value={formData.batch_id}
            onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Batch</option>
            {batches.map(batch => (
              <option key={batch._id} value={batch._id}>
                {batch.name}
              </option>
            ))}
          </select> */}
        

        {/* Course */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
          <select
            value={formData.course_id}
            onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Course</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        {/* Academic Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
          <input
            type="text"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="2024-2025"
          />
        </div>
      </div>
      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          type="submit"
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm shadow-sm transition"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setShowCreateForm(false)}
          className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium text-sm shadow-sm transition"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
)}


              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by batch, course, or year..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Syllabi List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredSyllabi.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center border border-gray-200">
                  <p className="text-gray-500 text-sm">No syllabi found. Create one to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSyllabi.map(syllabus => (
                    <div key={syllabus._id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setExpandedSyllabusId(expandedSyllabusId === syllabus._id ? null : syllabus._id)}
                        className="w-full p-4 sm:p-5 hover:bg-gray-50 transition flex justify-between items-center"
                      >
                        <div className="text-left">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
{syllabus.batch_id?.name
    ? syllabus.batch_id.name
    : syllabus.course_id?.name }
</h3>

<p className="text-xs sm:text-sm text-gray-600 mt-1">
  {syllabus.course_id?.name || 'Unknown Course'} • {syllabus.academic_year}
</p>

                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                            {syllabus.items.length} items
                          </span>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {expandedSyllabusId === syllabus._id && (
                        <div className="border-t border-gray-200 p-4 sm:p-5 bg-gray-50">
                          {/* Items List */}
                          {syllabus.items.length === 0 ? (
                            <p className="text-gray-500 text-sm mb-4">No items yet. Add one below.</p>
                          ) : (
                            <div className="mb-6 space-y-3">
                              {syllabus.items.map((item, idx) => (
                                <div
                                  key={item._id || idx}
                                  className="bg-white p-4 rounded-lg border border-gray-200"
                                >
                                  {editingItemId?.syllabusId === syllabus._id && editingItemId?.itemId === item._id ? (
                                    <form
                                      onSubmit={(e) => handleUpdateItem(syllabus._id, item._id || '', e)}
                                      className="space-y-3"
                                    >
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                                        <input
                                          type="text"
                                          placeholder="Subject"
                                          value={formData.subject}
                                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                                        <input
                                          type="text"
                                          placeholder="Topic"
                                          value={formData.topic}
                                          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Subtopic (optional)</label>
                                        <input
                                          type="text"
                                          placeholder="Subtopic"
                                          value={formData.subtopic}
                                          onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                                        <textarea
                                          placeholder="Description"
                                          value={formData.description}
                                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Duration (hours)</label>
                                        <input
                                          type="number"
                                          placeholder="Duration"
                                          value={formData.duration_hours}
                                          onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          min="0.5"
                                          step="0.5"
                                        />
                                      </div>
                                      <div className="flex gap-2 pt-2">
                                        <button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition">
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingItemId(null)}
                                          className="px-3 py-1.5 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 transition"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-semibold text-gray-900 text-sm">{item.subject}</p>
                                        <p className="text-sm text-gray-600 mt-1">{item.topic}</p>
                                        {item.subtopic && <p className="text-xs text-gray-500 mt-0.5">{item.subtopic}</p>}
                                        {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                                        {item.duration_hours && (
                                          <p className="text-xs text-gray-400 mt-1">{item.duration_hours} hours</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingItemId({ syllabusId: syllabus._id, itemId: item._id || '' });
                                            setFormData({
                                              ...formData,
                                              subject: item.subject,
                                              topic: item.topic,
                                              subtopic: item.subtopic || '',
                                              description: item.description || '',
                                              duration_hours: item.duration_hours || 1,
                                            });
                                          }}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(syllabus._id, item._id || '')}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Item Form */}
                          {editingItemId?.syllabusId !== syllabus._id && (
                            <form onSubmit={(e) => handleAddItem(syllabus._id, e)} className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                              <h4 className="font-semibold text-sm text-gray-900">Add New Item</h4>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Mathematics"
                                  value={formData.subject}
                                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Topic *</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Algebra Fundamentals"
                                  value={formData.topic}
                                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Subtopic</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Linear Equations"
                                  value={formData.subtopic}
                                  onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                  placeholder="Add any notes or details..."
                                  value={formData.description}
                                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (hours)</label>
                                <input
                                  type="number"
                                  placeholder="1"
                                  value={formData.duration_hours}
                                  onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  min="0.5"
                                  step="0.5"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium text-sm transition"
                              >
                                Add Item
                              </button>
                            </form>
                          )}

                          {/* Delete Syllabus Button */}
                          <button
                            onClick={() => handleDeleteSyllabus(syllabus._id)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm transition"
                          >
                            Delete Syllabus
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            fetchSyllabi();
          }}
        />
      )}
    </ProtectedRoute>
  );
}