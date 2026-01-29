'use client';
import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import BulkUploadModal from '@/components/syllabus/BulkUploadModal';
import {
  Plus,
  Trash2,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface SyllabusItem {
  _id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  description?: string;
  duration_hours?: number;
  order?: number;
  created_at?: string;
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

interface SyllabusRecord {
  _id: string;
  course_id: Course;
  batch_id?: Batch;
  academic_year: string;
  items: SyllabusItem[];
  created_by: { _id: string; email: string };
}

interface GroupedData {
  [courseId: string]: {
    courseName: string;
    batches: {
      [batchId: string]: {
        batchName: string;
        syllabusId: string;
        subjects: {
          [subject: string]: {
            topics: {
              [topic: string]: SyllabusItem[];
            };
          };
        };
      };
    };
  };
}

type AddItemLevel = 'batch' | 'subject' | 'topic' | 'subtopic';

export default function SyllabusPage() {
  const [syllabi, setSyllabi] = useState<SyllabusRecord[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const [showCreateSyllabus, setShowCreateSyllabus] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [addingItem, setAddingItem] = useState<{
    syllabusId: string;
    level: AddItemLevel;
    subject?: string;
    topic?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    batchid: '',
    courseid: '',
    academicyear: new Date().getFullYear().toString(),
  });

  const [newItem, setNewItem] = useState({
    subject: '',
    topic: '',
    subtopic: '',
    description: '',
    duration_hours: 1,
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    fetchSyllabi();
    fetchCourses();
    fetchBatches();
  }, []);

  const fetchSyllabi = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/syllabus`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setSyllabi(data.data);
        groupBySyllabusStructure(data.data);
      } else {
        setError(data.message || 'Failed to fetch syllabus');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/courses`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setCourses(Array.isArray(data.courses) ? data.courses : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/batches`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setBatches(Array.isArray(data.batches) ? data.batches : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const groupBySyllabusStructure = (records: SyllabusRecord[]) => {
    const grouped: GroupedData = {};

    records.forEach((record) => {
      const courseId = record.course_id._id;
      const courseName = record.course_id.name;

      if (!grouped[courseId]) {
        grouped[courseId] = {
          courseName,
          batches: {},
        };
      }

      const batchId = record.batch_id?._id || `no-batch-${record._id}`;
      const batchName = record.batch_id?.name || `Academic Year ${record.academic_year}`;

      if (!grouped[courseId].batches[batchId]) {
        grouped[courseId].batches[batchId] = {
          batchName,
          syllabusId: record._id,
          subjects: {},
        };
      }

      record.items.forEach((item) => {
        const subject = item.subject || 'No Subject';

        if (!grouped[courseId].batches[batchId].subjects[subject]) {
          grouped[courseId].batches[batchId].subjects[subject] = {
            topics: {},
          };
        }

        const topic = item.topic || 'No Topic';

        if (!grouped[courseId].batches[batchId].subjects[subject].topics[topic]) {
          grouped[courseId].batches[batchId].subjects[subject].topics[topic] = [];
        }

        grouped[courseId].batches[batchId].subjects[subject].topics[topic].push(item);
      });
    });

    setGroupedData(grouped);
  };

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseid) {
      setError('Please select a course');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/syllabus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batchid: formData.batchid || undefined,
          courseid: formData.courseid,
          academicyear: formData.academicyear,
          items: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateSyllabus(false);
        setFormData({
          batchid: '',
          courseid: '',
          academicyear: new Date().getFullYear().toString(),
        });
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to create syllabus');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleAddItem = async () => {
    if (!addingItem) return;

    // Validation based on level
    if (addingItem.level === 'batch' && !newItem.subject) {
      setError('Subject is required');
      return;
    }
    if (addingItem.level === 'subject' && !newItem.topic) {
      setError('Topic is required');
      return;
    }
    if ((addingItem.level === 'topic' || addingItem.level === 'subtopic') && !newItem.subtopic) {
      setError('Subtopic is required');
      return;
    }

    try {
      const payload = {
        subject: newItem.subject || addingItem.subject,
        topic: newItem.topic || addingItem.topic,
        subtopic: newItem.subtopic,
        description: newItem.description,
        duration_hours: newItem.duration_hours,
      };

      const response = await fetch(`${API_BASE}/api/syllabus/${addingItem.syllabusId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setNewItem({
          subject: '',
          topic: '',
          subtopic: '',
          description: '',
          duration_hours: 1,
        });
        setAddingItem(null);
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to add item');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleDeleteItem = async (syllabusId: string, itemId: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/syllabus/${syllabusId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to delete item');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
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
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to delete syllabus');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const filteredCourses = Object.entries(groupedData).filter(([courseId, courseData]) => {
    const query = searchQuery.toLowerCase();
    return (
      courseData.courseName.toLowerCase().includes(query) ||
      Object.values(courseData.batches).some((batch) =>
        Object.keys(batch.subjects).some((subject) =>
          subject.toLowerCase().includes(query) ||
          Object.keys(batch.subjects[subject].topics).some(
            (topic) =>
              topic.toLowerCase().includes(query) ||
              batch.subjects[subject].topics[topic].some(
                (item) =>
                  item.subtopic?.toLowerCase().includes(query) ||
                  item.description?.toLowerCase().includes(query)
              )
          )
        )
      )
    );
  });

  const getModalTitle = () => {
    if (!addingItem) return '';
    if (addingItem.level === 'batch') return 'Add New Subject';
    if (addingItem.level === 'subject') return 'Add New Topic';
    if (addingItem.level === 'topic') return 'Add New Subtopic';
    return 'Add New Item';
  };

  return (
    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Navbar />
          <main className="flex-1 overflow-y-auto mt-16">
            {/* Header with Action Buttons */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-20">
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
                    <span className="hidden sm:inline">Bulk Upload</span>
                  </button>
                  <button
                    onClick={() => setShowCreateSyllabus(!showCreateSyllabus)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition font-medium shadow-sm text-sm"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Create Syllabus</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Error */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 flex-1">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-600">
                    ✕
                  </button>
                </div>
              )}

              {/* Create Syllabus Form */}
              {showCreateSyllabus && (
                <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-200">
                  <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">Create New Syllabus</h2>
                  <form onSubmit={handleCreateSyllabus} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Batch */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Batch <span className="text-gray-500">(optional)</span>
                        </label>
                        <select
                          value={formData.batchid}
                          onChange={(e) => setFormData({ ...formData, batchid: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Batch</option>
                          {batches.map((batch) => (
                            <option key={batch._id} value={batch._id}>
                              {batch.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Course */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.courseid}
                          onChange={(e) => setFormData({ ...formData, courseid: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Course</option>
                          {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                              {course.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Academic Year */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Academic Year
                        </label>
                        <input
                          type="text"
                          value={formData.academicyear}
                          onChange={(e) => setFormData({ ...formData, academicyear: e.target.value })}
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
                        onClick={() => setShowCreateSyllabus(false)}
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
                    placeholder="Search courses, subjects, topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="inline-block animate-spin h-8 w-8 text-blue-600" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                  <p className="text-gray-500">No syllabus data found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCourses.map(([courseId, courseData]) => (
                    <div key={courseId} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                      {/* COURSE LEVEL */}
                      <div
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => {
                          const next = new Set(expandedCourses);
                          next.has(courseId) ? next.delete(courseId) : next.add(courseId);
                          setExpandedCourses(next);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {expandedCourses.has(courseId) ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{courseData.courseName}</h3>
                            <p className="text-xs text-gray-600">
                              {Object.keys(courseData.batches).length} batches
                            </p>
                          </div>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Object.keys(courseData.batches).length}
                        </span>
                      </div>

                      {/* BATCH LEVEL */}
                      {expandedCourses.has(courseId) && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                          {Object.entries(courseData.batches).map(([batchId, batchData]) => {
                            const batchKey = `${courseId}-${batchId}`;
                            return (
                              <div
                                key={batchId}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                              >
                                <div
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition"
                                  onClick={() => {
                                    const next = new Set(expandedBatches);
                                    next.has(batchKey) ? next.delete(batchKey) : next.add(batchKey);
                                    setExpandedBatches(next);
                                  }}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {expandedBatches.has(batchKey) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                    <Layers className="h-4 w-4 text-purple-600" />
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900">
                                        {batchData.batchName}
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        {Object.keys(batchData.subjects).length} subjects
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                      {Object.keys(batchData.subjects).length}
                                    </span>
                                    {/* + BUTTON FOR BATCH → Add Subject */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingItem({
                                          syllabusId: batchData.syllabusId,
                                          level: 'batch',
                                        });
                                        setNewItem({
                                          subject: '',
                                          topic: '',
                                          subtopic: '',
                                          description: '',
                                          duration_hours: 1,
                                        });
                                      }}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                      title="Add Subject"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSyllabus(batchData.syllabusId);
                                      }}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* SUBJECT LEVEL */}
                                {expandedBatches.has(batchKey) && (
                                  <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
                                    {Object.keys(batchData.subjects).length === 0 ? (
                                      <p className="text-sm text-gray-500 p-2">No subjects yet</p>
                                    ) : (
                                      Object.entries(batchData.subjects).map(([subject, subjectData]) => {
                                        const subjectKey = `${batchKey}-${subject}`;
                                        return (
                                          <div
                                            key={subject}
                                            className="bg-white rounded border border-gray-200 overflow-hidden"
                                          >
                                            <div
                                              className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition"
                                              onClick={() => {
                                                const next = new Set(expandedSubjects);
                                                next.has(subjectKey)
                                                  ? next.delete(subjectKey)
                                                  : next.add(subjectKey);
                                                setExpandedSubjects(next);
                                              }}
                                            >
                                              <div className="flex items-center gap-2 flex-1">
                                                {expandedSubjects.has(subjectKey) ? (
                                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                                )}
                                                <FileText className="h-4 w-4 text-orange-600" />
                                                <div>
                                                  <p className="text-sm font-semibold text-gray-900">
                                                    {subject}
                                                  </p>
                                                  <p className="text-xs text-gray-600">
                                                    {Object.keys(subjectData.topics).length} topics
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                                  {Object.keys(subjectData.topics).length}
                                                </span>
                                                {/* + BUTTON FOR SUBJECT → Add Topic */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddingItem({
                                                      syllabusId: batchData.syllabusId,
                                                      level: 'subject',
                                                      subject,
                                                    });
                                                    setNewItem({
                                                      subject,
                                                      topic: '',
                                                      subtopic: '',
                                                      description: '',
                                                      duration_hours: 1,
                                                    });
                                                  }}
                                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                                                  title="Add Topic"
                                                >
                                                  <Plus size={14} />
                                                </button>
                                              </div>
                                            </div>

                                            {/* TOPIC LEVEL */}
                                            {expandedSubjects.has(subjectKey) && (
                                              <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-2">
                                                {Object.keys(subjectData.topics).length === 0 ? (
                                                  <p className="text-sm text-gray-500 p-2">No topics yet</p>
                                                ) : (
                                                  Object.entries(subjectData.topics).map(([topic, items]) => {
                                                    const topicKey = `${subjectKey}-${topic}`;
                                                    return (
                                                      <div
                                                        key={topic}
                                                        className="bg-white rounded border border-gray-200 overflow-hidden"
                                                      >
                                                        <div
                                                          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer transition"
                                                          onClick={() => {
                                                            const next = new Set(expandedTopics);
                                                            next.has(topicKey)
                                                              ? next.delete(topicKey)
                                                              : next.add(topicKey);
                                                            setExpandedTopics(next);
                                                          }}
                                                        >
                                                          <div className="flex items-center gap-2 flex-1">
                                                            {expandedTopics.has(topicKey) ? (
                                                              <ChevronDown className="h-3 w-3 text-gray-500" />
                                                            ) : (
                                                              <ChevronRight className="h-3 w-3 text-gray-500" />
                                                            )}
                                                            <p className="text-sm font-semibold text-gray-900">
                                                              {topic}
                                                            </p>
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                              {items.length}
                                                            </span>
                                                          </div>
                                                          {/* + BUTTON FOR TOPIC → Add Subtopic */}
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setAddingItem({
                                                                syllabusId: batchData.syllabusId,
                                                                level: 'topic',
                                                                subject,
                                                                topic,
                                                              });
                                                              setNewItem({
                                                                subject,
                                                                topic,
                                                                subtopic: '',
                                                                description: '',
                                                                duration_hours: 1,
                                                              });
                                                            }}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                                                            title="Add Subtopic"
                                                          >
                                                            <Plus size={14} />
                                                          </button>
                                                        </div>

                                                        {/* SUBTOPIC LEVEL */}
                                                        {expandedTopics.has(topicKey) && (
                                                          <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-1">
                                                            {items.map((item) => (
                                                              <div
                                                                key={item._id}
                                                                className="bg-white p-2 rounded border border-gray-200 flex justify-between items-start hover:bg-gray-50 transition"
                                                              >
                                                                <div className="flex-1">
                                                                  <p className="text-sm font-semibold text-gray-900">
                                                                    {item.subtopic || 'No Subtopic'}
                                                                  </p>
                                                                  {item.description && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                      {item.description}
                                                                    </p>
                                                                  )}
                                                                  <p className="text-xs text-gray-400 mt-1">
                                                                    {item.duration_hours || 1}h
                                                                  </p>
                                                                </div>
                                                                <div className="flex items-center gap-1 ml-2">
                                                                  {/* + BUTTON FOR SUBTOPIC → Add another Subtopic under same Topic */}
                                                                  <button
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setAddingItem({
                                                                        syllabusId: batchData.syllabusId,
                                                                        level: 'subtopic',
                                                                        subject,
                                                                        topic,
                                                                      });
                                                                      setNewItem({
                                                                        subject,
                                                                        topic,
                                                                        subtopic: '',
                                                                        description: '',
                                                                        duration_hours: 1,
                                                                      });
                                                                    }}
                                                                    className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                                                                    title="Add Subtopic"
                                                                  >
                                                                    <Plus size={12} />
                                                                  </button>
                                                                  <button
                                                                    onClick={() =>
                                                                      handleDeleteItem(
                                                                        batchData.syllabusId,
                                                                        item._id
                                                                      )
                                                                    }
                                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                                                  >
                                                                    <Trash2 size={12} />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

      {/* Add Item Modal */}
      {addingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{getModalTitle()}</h3>
              <button
                onClick={() => setAddingItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Subject Field - shown when adding from batch level or below */}
              {addingItem.level === 'batch' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.subject}
                    onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Topic Field - shown when adding from subject level or below */}
              {(addingItem.level === 'batch' || addingItem.level === 'subject') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {addingItem.level === 'subject' ? 'Topic' : 'Topic (optional)'}{' '}
                    {addingItem.level === 'subject' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={newItem.topic}
                    onChange={(e) => setNewItem({ ...newItem, topic: e.target.value })}
                    placeholder="e.g., Algebra"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Display Subject & Topic when adding subtopic */}
              {(addingItem.level === 'topic' || addingItem.level === 'subtopic') && (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Subject</p>
                    <p className="text-sm font-semibold text-gray-900">{newItem.subject}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Topic</p>
                    <p className="text-sm font-semibold text-gray-900">{newItem.topic}</p>
                  </div>
                </>
              )}

              {/* Subtopic Field - shown when adding at topic/subtopic level */}
              {(addingItem.level === 'topic' || addingItem.level === 'subtopic') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtopic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.subtopic}
                    onChange={(e) => setNewItem({ ...newItem, subtopic: e.target.value })}
                    placeholder="e.g., Linear Equations"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={newItem.duration_hours}
                  onChange={(e) =>
                    setNewItem({ ...newItem, duration_hours: parseFloat(e.target.value) || 1 })
                  }
                  min="0.5"
                  step="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setAddingItem(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
                >
                  Add {getModalTitle().split(' ').pop()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
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
