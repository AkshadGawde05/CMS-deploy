'use client';
import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import BulkUploadModal from '@/components/syllabus/BulkUploadModal';
import {
  Plus,
  Trash2,
  Search,
  AlertCircle,
  BookOpen,
  Layers,
  Loader2,
  Upload,
  X,
  Edit,
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
  created_at?: string;
  updated_at?: string;
}

interface GroupedData {
  [courseId: string]: {
    courseName: string;
    batches: {
      [batchId: string]: {
        batchName: string;
        syllabusId: string;
        actualBatchId: string | null;
        academicYear: string;
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

  const [showCreateSyllabus, setShowCreateSyllabus] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [showSyllabusDetailModal, setShowSyllabusDetailModal] = useState(false);
  const [selectedSyllabusData, setSelectedSyllabusData] = useState<{
    courseId: string;
    courseName: string;
    batchId: string;
    batchName: string;
    syllabusId: string;
    academicYear: string;
    subjects: { [key: string]: { topics: { [key: string]: SyllabusItem[] } } };
  } | null>(null);
  const [selectedSubjectInModal, setSelectedSubjectInModal] = useState<string | null>(null);
  const [selectedTopicInModal, setSelectedTopicInModal] = useState<string | null>(null);

  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<{ id: string; name: string } | null>(null);
  const [editBatchName, setEditBatchName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ id: string; name: string } | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const editCourseInputRef = useRef<HTMLInputElement>(null);

  const [showEditAcademicYearModal, setShowEditAcademicYearModal] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<{ syllabusId: string; academicYear: string } | null>(null);
  const [editAcademicYearValue, setEditAcademicYearValue] = useState('');
  const editAcademicYearInputRef = useRef<HTMLInputElement>(null);

  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ syllabusId: string; itemId: string; name: string; type: 'subject' | 'topic' | 'subtopic' } | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const editItemInputRef = useRef<HTMLInputElement>(null);

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

  // Toast notifications state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    fetchSyllabi();
    fetchCourses();
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle edit modal keyboard shortcuts and auto-focus
  useEffect(() => {
    if (showEditBatchModal && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEditBatch();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEditBatchModal(false);
          setEditingBatch(null);
          setEditBatchName('');
          setError(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditBatchModal]);

  // Handle edit course modal keyboard shortcuts and auto-focus
  useEffect(() => {
    if (showEditCourseModal && editCourseInputRef.current) {
      editCourseInputRef.current.focus();
      editCourseInputRef.current.select();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEditCourse();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEditCourseModal(false);
          setEditingCourse(null);
          setEditCourseName('');
          setError(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditCourseModal]);

  // Handle edit subject/topic/subtopic modal keyboard shortcuts and auto-focus
  useEffect(() => {
    if (showEditSubjectModal && editItemInputRef.current) {
      editItemInputRef.current.focus();
      editItemInputRef.current.select();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEditSyllabusItem();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEditSubjectModal(false);
          setEditingItem(null);
          setEditItemName('');
          setError(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditSubjectModal]);

  // Handle edit academic year modal keyboard shortcuts and auto-focus
  useEffect(() => {
    if (showEditAcademicYearModal && editAcademicYearInputRef.current) {
      editAcademicYearInputRef.current.focus();
      editAcademicYearInputRef.current.select();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEditAcademicYear();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEditAcademicYearModal(false);
          setEditingAcademicYear(null);
          setEditAcademicYearValue('');
          setError(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditAcademicYearModal]);

  // Sync selected syllabus data when grouped data changes
  useEffect(() => {
    if (selectedSyllabusData && groupedData[selectedSyllabusData.courseId]) {
      const courseData = groupedData[selectedSyllabusData.courseId];
      const batchData = courseData.batches[selectedSyllabusData.batchId];
      if (batchData) {
        setSelectedSyllabusData((prev) =>
          prev
            ? {
                ...prev,
                subjects: batchData.subjects,
              }
            : null
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedData]);

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
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
          actualBatchId: record.batch_id?._id || null, // Store actual batch ID for editing
          academicYear: record.academic_year, // Store academic year for editing
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
          batch_id: formData.batchid || undefined,
          course_id: formData.courseid,
          academic_year: formData.academicyear,
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
    }
  };

  const handleEditBatch = async () => {
    if (!editingBatch || !editBatchName.trim()) {
      setError('Batch name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/batches/${editingBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editBatchName }),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditBatchModal(false);
        setEditingBatch(null);
        setEditBatchName('');
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to update batch name');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
    }
  };

  const handleEditCourse = async () => {
    if (!editingCourse || !editCourseName.trim()) {
      setError('Course name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editCourseName }),
      });

      const data = await response.json();
      if (data.success || data._id) {
        setShowEditCourseModal(false);
        setEditingCourse(null);
        setEditCourseName('');
        setError(null);
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to update course name');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
    }
  };

  const handleEditSyllabusItem = async () => {
    if (!editingItem || !editItemName.trim()) {
      setError(`${editingItem?.type} name cannot be empty`);
      return;
    }

    try {
      let requestBody: Record<string, string | number> = {};
      let url = `${API_BASE}/api/syllabus/${editingItem.syllabusId}`;

      if (editingItem.type === 'subtopic') {
        // For subtopic, use the direct item update endpoint
        url += `/items/${editingItem.itemId}`;
        requestBody = { subtopic: editItemName };
      } else {
        // For subject/topic, use bulk update endpoint
        url += `/bulk-update-field`;
        requestBody = {
          fieldType: editingItem.type,
          oldValue: editingItem.name,
          newValue: editItemName,
        };
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success || data._id) {
        setShowEditSubjectModal(false);
        setEditingItem(null);
        setEditItemName('');
        setError(null);
        await fetchSyllabi();
      } else {
        setError(data.message || `Failed to update ${editingItem.type}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
    }
  };

  const handleEditAcademicYear = async () => {
    if (!editingAcademicYear || !editAcademicYearValue.trim()) {
      setError('Academic year cannot be empty');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/syllabus/${editingAcademicYear.syllabusId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ academic_year: editAcademicYearValue }),
        }
      );

      const data = await response.json();
      if (data.success || data._id) {
        setShowEditAcademicYearModal(false);
        setEditingAcademicYear(null);
        setEditAcademicYearValue('');
        setError(null);
        await fetchSyllabi();
      } else {
        setError(data.message || 'Failed to update academic year');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
    }
  };

  const filteredCourses = Object.entries(groupedData).filter(([, courseData]) => {
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

  // Modal CRUD Handlers
  const handleModalAddItem = async () => {
    if (!selectedSyllabusData) return;

    // Validation
    if (addingItem?.level === 'batch' && !newItem.subject.trim()) {
      setError('Subject name is required');
      return;
    }
    if (addingItem?.level === 'subject' && !newItem.topic.trim()) {
      setError('Topic/Chapter name is required');
      return;
    }
    if ((addingItem?.level === 'topic' || addingItem?.level === 'subtopic') && !newItem.subtopic.trim()) {
      setError('Subtopic name is required');
      return;
    }

    try {
      // Prepare the payload
      const payload = {
        subject: newItem.subject || addingItem?.subject,
        topic: newItem.topic || addingItem?.topic,
        subtopic: newItem.subtopic,
        description: newItem.description,
        duration_hours: newItem.duration_hours,
      };

      // Update local state immediately for instant UI feedback
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects)) as typeof selectedSyllabusData.subjects;

      if (addingItem?.level === 'batch') {
        // Adding a new subject
        const subjectName = newItem.subject;
        if (!updatedSubjects[subjectName]) {
          updatedSubjects[subjectName] = { topics: {} };
        }
      } else if (addingItem?.level === 'subject') {
        // Adding a new topic/chapter
        const subject = newItem.subject || (addingItem?.subject as string);
        if (!updatedSubjects[subject]) {
          updatedSubjects[subject] = { topics: {} };
        }
        if (!updatedSubjects[subject].topics[newItem.topic]) {
          updatedSubjects[subject].topics[newItem.topic] = [];
        }
      } else if (addingItem?.level === 'topic' || addingItem?.level === 'subtopic') {
        // Adding a new subtopic/item
        const subject = (newItem.subject || addingItem?.subject || '') as string;
        const topic = (newItem.topic || addingItem?.topic || '') as string;
        if (!updatedSubjects[subject]?.topics[topic]) {
          if (!updatedSubjects[subject]) updatedSubjects[subject] = { topics: {} };
          updatedSubjects[subject].topics[topic] = [];
        }
        updatedSubjects[subject].topics[topic].push({
          _id: `temp-${Date.now()}`, // Temporary ID until API response
          subject,
          topic,
          subtopic: newItem.subtopic,
          description: newItem.description,
          duration_hours: newItem.duration_hours,
        });
      }

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });

      // Reset form immediately
      setNewItem({
        subject: '',
        topic: '',
        subtopic: '',
        description: '',
        duration_hours: 1,
      });
      setAddingItem(null);

      // API call in background
      const response = await fetch(
        `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to add item');
        // Refresh to revert changes
        await fetchSyllabi();
      } else {
        // Refresh data to sync with server
        await fetchSyllabi();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      await fetchSyllabi();
    }
  };

  const handleModalEditSubject = async (oldSubjectName: string, newSubjectName: string) => {
    if (!selectedSyllabusData || !newSubjectName.trim()) {
      setError('Subject name cannot be empty');
      return;
    }

    if (oldSubjectName === newSubjectName) {
      setShowEditSubjectModal(false);
      setEditingItem(null);
      setEditItemName('');
      return;
    }

    try {
      // Update local state immediately
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
      updatedSubjects[newSubjectName] = updatedSubjects[oldSubjectName];
      delete updatedSubjects[oldSubjectName];

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });

      setShowEditSubjectModal(false);
      setEditingItem(null);
      setEditItemName('');
      showToast('Subject updated successfully', 'success');

      // API call in background
      const response = await fetch(
        `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/bulk-update-field`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fieldType: 'subject',
            oldValue: oldSubjectName,
            newValue: newSubjectName,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to update subject');
        showToast('Failed to update subject', 'error');
        await fetchSyllabi();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
      await fetchSyllabi();
    }
  };

  const handleModalEditTopic = async (
    subject: string,
    oldTopicName: string,
    newTopicName: string
  ) => {
    if (!selectedSyllabusData || !newTopicName.trim()) {
      setError('Topic name cannot be empty');
      return;
    }

    if (oldTopicName === newTopicName) {
      setShowEditSubjectModal(false);
      setEditingItem(null);
      setEditItemName('');
      return;
    }

    try {
      // Update local state immediately
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
      updatedSubjects[subject].topics[newTopicName] = updatedSubjects[subject].topics[oldTopicName];
      delete updatedSubjects[subject].topics[oldTopicName];

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });

      setShowEditSubjectModal(false);
      setEditingItem(null);
      setEditItemName('');
      showToast('Chapter updated successfully', 'success');

      // API call in background
      const response = await fetch(
        `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/bulk-update-field`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fieldType: 'topic',
            oldValue: oldTopicName,
            newValue: newTopicName,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to update topic');
        showToast('Failed to update chapter', 'error');
        await fetchSyllabi();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
      await fetchSyllabi();
    }
  };

  const handleModalEditItem = async (
    itemId: string,
    subject: string,
    topic: string,
    newSubtopicName: string
  ) => {
    if (!selectedSyllabusData || !newSubtopicName.trim()) {
      setError('Topic name cannot be empty');
      return;
    }

    try {
      // Update local state immediately
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
      const itemIndex = updatedSubjects[subject].topics[topic].findIndex(
        (item: SyllabusItem) => item._id === itemId
      );

      if (itemIndex !== -1) {
        updatedSubjects[subject].topics[topic][itemIndex].subtopic = newSubtopicName;
      }

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });

      setShowEditSubjectModal(false);
      setEditingItem(null);
      setEditItemName('');
      showToast('Topic updated successfully', 'success');

      // API call in background
      const response = await fetch(
        `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/items/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subtopic: newSubtopicName }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to update item');
        showToast('Failed to update topic', 'error');
        await fetchSyllabi();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
      await fetchSyllabi();
    }
  };

  const handleModalDeleteTopic = async (subject: string, topic: string) => {
    if (!selectedSyllabusData) return;

    if (!confirm(`Delete chapter "${topic}" and all its topics?`)) return;

    try {
      // Update local state immediately
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
      delete updatedSubjects[subject].topics[topic];

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });

      if (selectedTopicInModal === topic) {
        setSelectedTopicInModal(null);
      }

      showToast('Chapter deleted successfully', 'success');

      // Get all items for this topic to delete them
      const itemsToDelete = syllabi
        .find((s) => s._id === selectedSyllabusData.syllabusId)
        ?.items.filter((item) => item.subject === subject && item.topic === topic) || [];

      // Delete all items in background
      for (const item of itemsToDelete) {
        await fetch(`${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/items/${item._id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      // Refresh data to sync
      await fetchSyllabi();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
      await fetchSyllabi();
    }
  };

  const handleModalDeleteItem = async (itemId: string, subject: string, topic: string) => {
    if (!selectedSyllabusData) return;

    if (!confirm('Delete this topic?')) return;

    try {
      // Update local state immediately
      const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
      updatedSubjects[subject].topics[topic] = updatedSubjects[subject].topics[topic].filter(
        (item: SyllabusItem) => item._id !== itemId
      );

      setSelectedSyllabusData({
        ...selectedSyllabusData,
        subjects: updatedSubjects,
      });
      showToast('Topic deleted successfully', 'success');

      // API call in background
      const response = await fetch(
        `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/items/${itemId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to delete item');
        showToast('Failed to delete topic', 'error');
        await fetchSyllabi();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMessage}`);
      showToast(`Error: ${errorMessage}`, 'error');
      await fetchSyllabi();
    }
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map(([courseId, courseData]) => {
                    // Calculate course-level statistics
                    const allBatches = Object.entries(courseData.batches);
                    const totalSubjects = allBatches.reduce((sum, [, batchData]) => {
                      return sum + Object.keys(batchData.subjects).length;
                    }, 0);

                    const totalItems = allBatches.reduce((sum, [, batchData]) => {
                      return (
                        sum +
                        Object.values(batchData.subjects).reduce((subjectSum, subjectData) => {
                          return (
                            subjectSum +
                            Object.values(subjectData.topics).reduce((topicSum, items) => {
                              return topicSum + items.length;
                            }, 0)
                          );
                        }, 0)
                      );
                    }, 0);

                    // Get the first batch's academic year and get the latest created_at date
                    const firstBatchData = allBatches[0]?.[1];
                    const academicYear = firstBatchData?.academicYear || new Date().getFullYear().toString();
                    
                    // Find the most recent syllabus in this course
                    const newestSyllabus = syllabi
                      .filter((s) => s.course_id._id === courseId)
                      .sort((a, b) => {
                        const aDate = new Date(a.updated_at || a.created_at || new Date()).getTime();
                        const bDate = new Date(b.updated_at || b.created_at || new Date()).getTime();
                        return bDate - aDate;
                      })[0];

                    const lastUpdated = newestSyllabus?.updated_at || newestSyllabus?.created_at;

                    // Calculate progress percentage based on items

                    const progressPercent = totalItems > 0 ? Math.min((totalItems / Math.max(totalItems, 10)) * 100, 100) : 0;

                    // Determine status: ACTIVE if has items, DRAFT if empty
                    const status = totalItems > 0 ? 'ACTIVE' : 'DRAFT';
                    const statusColor = status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

                    // Format last updated time
                    const formatLastUpdated = (dateString: string | undefined) => {
                      if (!dateString) return 'Just now';
                      const date = new Date(dateString);
                      const now = new Date();
                      const diffTime = Math.abs(now.getTime() - date.getTime());
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                      const diffMinutes = Math.floor(diffTime / (1000 * 60));

                      if (diffDays > 7) {
                        const weeks = Math.floor(diffDays / 7);
                        return `${weeks}w ago`;
                      } else if (diffDays > 0) {
                        return `${diffDays}d ago`;
                      } else if (diffHours > 0) {
                        return `${diffHours}h ago`;
                      } else if (diffMinutes > 0) {
                        return `${diffMinutes}m ago`;
                      }
                      return 'Just now';
                    };

                    // Get batch name or display format
                    const batchDisplay = allBatches
                      .map(([, batchData]) => batchData.batchName)
                      .join(', ');

                    return (
                      <div
                        key={courseId}
                        onClick={() => {
                          setSelectedSyllabusData({
                            courseId,
                            courseName: courseData.courseName,
                            batchId: courseId,
                            batchName: batchDisplay || 'General',
                            syllabusId: allBatches[0]?.[1].syllabusId || '',
                            academicYear: academicYear,
                            subjects: allBatches.reduce((acc, [, batchData]) => {
                              return { ...acc, ...batchData.subjects };
                            }, {}),
                          });
                          setSelectedSubjectInModal(null);
                          setSelectedTopicInModal(null);
                          setShowSyllabusDetailModal(true);
                        }}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-100 overflow-hidden group"
                      >
                    {/* Card Header with Icon */}
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
                          <BookOpen className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{courseData.courseName}</h3>
                      <p className="text-xs text-gray-600">
                        {batchDisplay || 'General'} • Academic Year {academicYear}
                      </p>
                    </div>

                    {/* Card Progress Section */}
                    <div className="px-5 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Progress</p>
                        <span className="text-sm font-bold text-gray-900">{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Stats Section */}
                    <div className="px-5 py-4 bg-gray-50">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-600">Subjects</p>
                            <p className="text-lg font-bold text-gray-900">{totalSubjects}</p>
                          </div>
                        </div>
                        <div className="border-l border-gray-300"></div>
                        <div className="flex-1 text-right">
                          <p className="text-xs text-gray-600 flex items-center justify-end gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                            Updated {formatLastUpdated(lastUpdated)}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Add Item Modal */}
      {addingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">{getModalTitle()}</h3>
              <button
                onClick={() => setAddingItem(null)}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Subject Field - shown when adding from batch level or below */}
              {addingItem.level === 'batch' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.subject}
                    onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })}
                    placeholder="e.g., Mathematics"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Topic Field - shown when adding from subject level or below */}
              {(addingItem.level === 'batch' || addingItem.level === 'subject') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    {addingItem.level === 'subject' ? 'Topic' : 'Topic (optional)'}{' '}
                    {addingItem.level === 'subject' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={newItem.topic}
                    onChange={(e) => setNewItem({ ...newItem, topic: e.target.value })}
                    placeholder="e.g., Algebra"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Display Subject & Topic when adding subtopic */}
              {(addingItem.level === 'topic' || addingItem.level === 'subtopic') && (
                <>
                  <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Subject</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{newItem.subject}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Topic</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{newItem.topic}</p>
                  </div>
                </>
              )}

              {/* Subtopic Field - shown when adding at topic/subtopic level */}
              {(addingItem.level === 'topic' || addingItem.level === 'subtopic') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Subtopic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.subtopic}
                    onChange={(e) => setNewItem({ ...newItem, subtopic: e.target.value })}
                    placeholder="e.g., Linear Equations"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-4">
                <button
                  onClick={() => setAddingItem(null)}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    showSyllabusDetailModal ? handleModalAddItem() : handleAddItem()
                  }
                  className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs sm:text-sm transition"
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

      {/* Edit Batch Name Modal */}
      {showEditBatchModal && editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Edit Batch Name</h2>
              <button
                onClick={() => {
                  setShowEditBatchModal(false);
                  setEditingBatch(null);
                  setEditBatchName('');
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Batch Name
                </label>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter batch name"
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter to save or Escape to cancel</p>
              </div>

              {error && (
                <div className="flex gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={() => {
                    setShowEditBatchModal(false);
                    setEditingBatch(null);
                    setEditBatchName('');
                    setError(null);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditBatch}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Name Modal */}
      {showEditCourseModal && editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Edit Course Name</h2>
              <button
                onClick={() => {
                  setShowEditCourseModal(false);
                  setEditingCourse(null);
                  setEditCourseName('');
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Course Name
                </label>
                <input
                  ref={editCourseInputRef}
                  type="text"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter course name"
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter to save or Escape to cancel</p>
              </div>

              {error && (
                <div className="flex gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={() => {
                    setShowEditCourseModal(false);
                    setEditingCourse(null);
                    setEditCourseName('');
                    setError(null);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditCourse}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject/Topic/Subtopic Modal */}
      {showEditSubjectModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-black">
                Edit {editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)} Name
              </h2>
              <button
                onClick={() => {
                  setShowEditSubjectModal(false);
                  setEditingItem(null);
                  setEditItemName('');
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-black mb-1 sm:mb-2">
                  {editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)} Name
                </label>
                <input
                  ref={editItemInputRef}
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Enter ${editingItem.type} name`}
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter to save or Escape to cancel</p>
              </div>

              {error && (
                <div className="flex gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setEditingItem(null);
                    setEditItemName('');
                    setError(null);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showSyllabusDetailModal && editingItem) {
                      // Modal context handlers
                      if (editingItem.type === 'topic') {
                        handleModalEditTopic(
                          selectedSubjectInModal || '',
                          editingItem.name,
                          editItemName
                        );
                      } else if (editingItem.type === 'subtopic') {
                        handleModalEditItem(
                          editingItem.itemId,
                          selectedSubjectInModal || '',
                          selectedTopicInModal || '',
                          editItemName
                        );
                      } else if (editingItem.type === 'subject') {
                        handleModalEditSubject(editingItem.name, editItemName);
                      }
                    } else {
                      // Old context handler
                      handleEditSyllabusItem();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Academic Year Modal */}
      {showEditAcademicYearModal && editingAcademicYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-black">Edit Academic Year</h2>
              <button
                onClick={() => {
                  setShowEditAcademicYearModal(false);
                  setEditingAcademicYear(null);
                  setEditAcademicYearValue('');
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-black mb-1 sm:mb-2">
                  Academic Year
                </label>
                <input
                  ref={editAcademicYearInputRef}
                  type="text"
                  value={editAcademicYearValue}
                  onChange={(e) => setEditAcademicYearValue(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2024-2025"
                />
                <p className="text-xs text-gray-500 mt-1">Press Enter to save or Escape to cancel</p>
              </div>

              {error && (
                <div className="flex gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={() => {
                    setShowEditAcademicYearModal(false);
                    setEditingAcademicYear(null);
                    setEditAcademicYearValue('');
                    setError(null);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditAcademicYear}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus Detail Modal - 3 Column Layout */}
      {showSyllabusDetailModal && selectedSyllabusData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full h-[95vh] sm:h-[92vh] max-w-sm sm:max-w-2xl lg:max-w-7xl overflow-hidden flex flex-col">
            {/* Header - Top Bar with Cancel and Save Buttons */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{selectedSyllabusData.courseName}</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure subjects, chapters, and specific topics.</p>
              </div>
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={() => {
                    setShowSyllabusDetailModal(false);
                    setSelectedSyllabusData(null);
                    setSelectedSubjectInModal(null);
                    setSelectedTopicInModal(null);
                  }}
                  className="px-3 sm:px-6 py-2 sm:py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium sm:font-semibold transition text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button className="px-3 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium sm:font-semibold transition shadow-md text-sm sm:text-base" onClick={() => {
                    setShowSyllabusDetailModal(false);
                    setSelectedSyllabusData(null);
                    setSelectedSubjectInModal(null);
                    setSelectedTopicInModal(null);
                  }}>
                  Save Changes
                </button>
              </div>
            </div>

            {/* 3-Column Layout Container */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-gray-50 min-h-0">
              {/* Column 1: Subjects */}
              <div className="w-full lg:flex-1 lg:overflow-hidden flex flex-col border-b border-gray-300 lg:border-b-0 lg:border-r min-h-0">
                {/* Column Header */}
                <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-bold">1</span>
                    </div>
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900">Subjects</h3>
                  </div>
                  <button
                    onClick={() => {
                      setAddingItem({
                        syllabusId: selectedSyllabusData.syllabusId,
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
                    className="p-1.5 sm:p-2 text-lg text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Add Subject"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Subjects List */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 sm:space-y-2">
                  {Object.keys(selectedSyllabusData.subjects).length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-8">No subjects yet</p>
                  ) : (
                    Object.keys(selectedSyllabusData.subjects).map((subject) => (
                      <div
                        key={subject}
                        onClick={() => {
                          setSelectedSubjectInModal(subject);
                          setSelectedTopicInModal(null);
                        }}
                        className={`p-2 sm:p-4 rounded-lg cursor-pointer transition group border-l-4 ${
                          selectedSubjectInModal === subject
                            ? 'bg-blue-50 border-l-blue-600 shadow-sm'
                            : 'bg-white border-l-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold text-xs sm:text-base truncate ${
                            selectedSubjectInModal === subject
                              ? 'text-blue-600'
                              : 'text-gray-900'
                          }`}>
                            {subject}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem({
                                  syllabusId: selectedSyllabusData.syllabusId,
                                  itemId: `subject-${subject}`,
                                  name: subject,
                                  type: 'subject',
                                });
                                setEditItemName(subject);
                                setShowEditSubjectModal(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition flex-shrink-0"
                              title="Edit Subject"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete subject "${subject}" and all its chapters and topics?`)) {
                                  // Update local state immediately
                                  const updatedSubjects = JSON.parse(JSON.stringify(selectedSyllabusData.subjects));
                                  delete updatedSubjects[subject];

                                  setSelectedSyllabusData({
                                    ...selectedSyllabusData,
                                    subjects: updatedSubjects,
                                  });

                                  if (selectedSubjectInModal === subject) {
                                    setSelectedSubjectInModal(null);
                                    setSelectedTopicInModal(null);
                                  }

                                  // Get all items for this subject to delete them
                                  const itemsToDelete = syllabi
                                    .find((s) => s._id === selectedSyllabusData.syllabusId)
                                    ?.items.filter((item) => item.subject === subject) || [];

                                  // Delete all items in background and refresh
                                  (async () => {
                                    try {
                                      for (const item of itemsToDelete) {
                                        await fetch(
                                          `${API_BASE}/api/syllabus/${selectedSyllabusData.syllabusId}/items/${item._id}`,
                                          {
                                            method: 'DELETE',
                                            credentials: 'include',
                                          }
                                        );
                                      }
                                      showToast('Subject deleted successfully', 'success');
                                      await fetchSyllabi();
                                    } catch (err: unknown) {
                                      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                                      setError(`Error: ${errorMessage}`);
                                      showToast(`Error: ${errorMessage}`, 'error');
                                      await fetchSyllabi();
                                    }
                                  })();
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                              title="Delete Subject"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Chapters (Topics) */}
              <div className="w-full lg:flex-1 lg:overflow-hidden flex flex-col border-b border-gray-300 lg:border-b-0 lg:border-r min-h-0">
                {/* Column Header */}
                <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-bold">2</span>
                    </div>
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900">Chapters</h3>
                  </div>
                  {selectedSubjectInModal && (
                    <button
                      onClick={() => {
                        setAddingItem({
                          syllabusId: selectedSyllabusData.syllabusId,
                          level: 'subject',
                          subject: selectedSubjectInModal,
                        });
                        setNewItem({
                          subject: selectedSubjectInModal,
                          topic: '',
                          subtopic: '',
                          description: '',
                          duration_hours: 1,
                        });
                      }}
                      className="p-1.5 sm:p-2 text-lg text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Add Chapter"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                {/* Chapters List */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                  {!selectedSubjectInModal ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-8">Select a subject to view chapters</p>
                  ) : (
                    <div className="space-y-1 sm:space-y-2">
                      {Object.keys(selectedSyllabusData.subjects[selectedSubjectInModal]?.topics || {})
                        .length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 text-center py-8">No chapters yet</p>
                      ) : (
                        Object.keys(selectedSyllabusData.subjects[selectedSubjectInModal].topics).map(
                          (topic, idx) => (
                            <div
                              key={topic}
                              onClick={() => setSelectedTopicInModal(topic)}
                              className={`p-2 sm:p-4 rounded-lg cursor-pointer transition group border-l-4 ${
                                selectedTopicInModal === topic
                                  ? 'bg-purple-50 border-l-purple-600 shadow-sm'
                                  : 'bg-white border-l-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-purple-700 tracking-wide">
                                    CHAPTER {String(idx + 1).padStart(2, '0')}
                                  </p>
                                  <p className="font-bold text-gray-900 mt-1 truncate text-xs sm:text-base">{topic}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem({
                                        syllabusId: selectedSyllabusData.syllabusId,
                                        itemId: `topic-${topic}`,
                                        name: topic,
                                        type: 'topic',
                                      });
                                      setEditItemName(topic);
                                      setShowEditSubjectModal(true);
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition flex-shrink-0"
                                    title="Edit Chapter"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleModalDeleteTopic(selectedSubjectInModal, topic);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                                    title="Delete Chapter"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Topics/Items */}
              <div className="w-full lg:flex-1 lg:overflow-hidden flex flex-col min-h-0">
                {/* Column Header */}
                <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-bold">3</span>
                    </div>
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900">Topics</h3>
                  </div>
                  {selectedSubjectInModal && selectedTopicInModal && (
                    <button
                      onClick={() => {
                        setAddingItem({
                          syllabusId: selectedSyllabusData.syllabusId,
                          level: 'topic',
                          subject: selectedSubjectInModal,
                          topic: selectedTopicInModal,
                        });
                        setNewItem({
                          subject: selectedSubjectInModal,
                          topic: selectedTopicInModal,
                          subtopic: '',
                          description: '',
                          duration_hours: 1,
                        });
                      }}
                      className="p-1.5 sm:p-2 text-lg text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Add Topic"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                {/* Topics List */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                  {!selectedSubjectInModal || !selectedTopicInModal ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-8">
                      Select a subject and chapter to view topics
                    </p>
                  ) : (
                    <div className="space-y-1 sm:space-y-2">
                      {(selectedSyllabusData.subjects[selectedSubjectInModal]?.topics[
                        selectedTopicInModal
                      ] || []).length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 text-center py-8">No topics yet</p>
                      ) : (
                        (
                          selectedSyllabusData.subjects[selectedSubjectInModal].topics[
                            selectedTopicInModal
                          ] || []
                        ).map((item, idx) => (
                          <div
                            key={item._id}
                            className="bg-white border border-gray-300 rounded-lg p-2 sm:p-4 group hover:shadow-md transition"
                          >
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
                              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                                <span className="font-bold text-gray-800 bg-gray-100 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm min-w-fit">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-xs sm:text-base break-words">
                                    {item.subtopic || 'Untitled Topic'}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 mt-1 break-words">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem({
                                      syllabusId: selectedSyllabusData.syllabusId,
                                      itemId: item._id,
                                      name: item.subtopic || '',
                                      type: 'subtopic',
                                    });
                                    setEditItemName(item.subtopic || '');
                                    setShowEditSubjectModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition flex-shrink-0"
                                  title="Edit Topic"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModalDeleteItem(
                                      item._id,
                                      selectedSubjectInModal,
                                      selectedTopicInModal
                                    );
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                                  title="Delete Topic"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in fade-in slide-in-from-top-5 duration-300 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ProtectedRoute>
  );
}