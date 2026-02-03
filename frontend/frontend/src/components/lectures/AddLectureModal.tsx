'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createLecture, updateLecture, getAllCourses, getAllBatches, getAllTeachers, getTopicsByCourseAndSubject, getSubtopicsByTopic, getSubjectsByCourse } from '@/lib/api';
import type { LectureDTO, CourseDTO, BatchDTO } from '@/lib/api';

interface AddLectureModalProps {
  lecture?: LectureDTO & { _id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

interface Teacher {
  _id: string; // Use the User _id to match Lecture.teacher_id ref
  fname: string;
  lname: string;
}

interface FormData {
  course_id: string;
  batch_id: string;
  teacher_id: string;
  subject: string;
  topic: string;
  subtopic: string;
  date: string;
  lecture_start: string;
  lecture_end: string;
  note: string;
}

export default function AddLectureModal({ lecture, onClose, onSuccess }: AddLectureModalProps) {
  const [formData, setFormData] = useState<FormData>({
    course_id: '',
    batch_id: '',
    teacher_id: '',
    subject: '',
    topic: '',
    subtopic: '',
    date: '',
    lecture_start: '',
    lecture_end: '',
    note: ''
  });

  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchDTO[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOptions();
    
    // Populate form if editing
    if (lecture) {
      // Safely extract id whether the value is a string, populated object, or null/undefined
      const getId = (ref: unknown): string => {
        if (!ref) return '';
        if (typeof ref === 'string') return ref;
        if (typeof ref === 'object') {
          const obj = ref as { _id?: unknown };
          if (obj && obj._id) return String(obj._id);
        }
        return '';
      };

      const courseId = getId(lecture.course_id as unknown);
      const batchId = getId(lecture.batch_id as unknown);
      // teacher_id in Lecture schema references User, so when populated it's a User object
      let teacherId = '';
      if (lecture.teacher_id && typeof lecture.teacher_id === 'object') {
        const t = lecture.teacher_id as { _id?: string };
        teacherId = t._id || '';
      } else if (typeof lecture.teacher_id === 'string') {
        teacherId = lecture.teacher_id;
      }
      
      const lectureDate = lecture.date ? new Date(lecture.date) : new Date();
      const startDate = lecture.lecture_start ? new Date(lecture.lecture_start) : new Date();
      const endDate = lecture.lecture_end ? new Date(lecture.lecture_end) : new Date();
      
      setFormData({
        course_id: courseId || '',
        batch_id: batchId || '',
        teacher_id: teacherId || '',
        subject: lecture.subject || '',
        topic: lecture.topic || '',
        subtopic: lecture.subtopic || '',
        date: lectureDate.toISOString().split('T')[0],
        lecture_start: startDate.toISOString().slice(0, 16),
        lecture_end: endDate.toISOString().slice(0, 16),
        note: lecture.note || ''
      });
    }
  }, [lecture]);

  useEffect(() => {
    // Filter batches based on selected course
    if (formData.course_id) {
      const filtered = batches.filter(batch => {
        const batchCourseId = typeof batch.course_id === 'object' ? batch.course_id._id : batch.course_id;
        return batchCourseId === formData.course_id;
      });
      setFilteredBatches(filtered);
      
      // Only validate/reset after batch options are loaded
      if (batches.length > 0 && formData.batch_id) {
        const currentBatchValid = filtered.some(batch => 
          (typeof batch._id === 'string' ? batch._id : String(batch._id)) === formData.batch_id
        );
        if (!currentBatchValid) {
          setFormData(prev => ({ ...prev, batch_id: '' }));
        }
      }
    } else {
      setFilteredBatches([]);
    }
  }, [formData.course_id, formData.batch_id, batches]);

  useEffect(() => {
  if (!formData.course_id) {
    setSubjects([]);
    return;
  }

  // Reset dependent fields FIRST
  setFormData(prev => ({
    ...prev,
    subject: '',
    topic: '',
    subtopic: ''
  }));
  setTopics([]);
  setSubtopics([]);

  const fetchSubjects = async () => {
    try {
      const res = await getSubjectsByCourse(formData.course_id);
      if (res.success) {
        setSubjects(res.subjects);
      } else {
        setSubjects([]);
      }
    } catch {
      setSubjects([]);
    }
  };

  fetchSubjects();
}, [formData.course_id]);

  useEffect(() => {
    // Fetch topics based on selected course and subject
    const fetchTopics = async () => {
      if (formData.course_id && formData.subject) {
        try {
          const topicsData = await getTopicsByCourseAndSubject(formData.course_id, formData.subject);
          if (topicsData.success) {
            setTopics(topicsData.topics);
          } else {
            setTopics([]);
          }
        } catch {
          setTopics([]);
        }
      } else {
        setTopics([]);
      }
    };

    fetchTopics();
  }, [formData.course_id, formData.subject]);

  useEffect(() => {
    // Fetch subtopics based on selected topic
    const fetchSubtopics = async () => {
      if (formData.course_id && formData.subject && formData.topic) {
        try {
          const subtopicsData = await getSubtopicsByTopic(formData.course_id, formData.subject, formData.topic, formData.batch_id);
          if (subtopicsData.success) {
            setSubtopics(subtopicsData.subtopics);
          } else {
            setSubtopics([]);
          }
        } catch {
          setSubtopics([]);
        }
      } else {
        setSubtopics([]);
      }
    };

    fetchSubtopics();
  }, [formData.course_id, formData.subject, formData.topic, formData.batch_id]);

  const fetchOptions = async () => {
    try {
      const [coursesData, batchesData, teachersData] = await Promise.all([
        getAllCourses(),
        getAllBatches(),
        getAllTeachers()
      ]);

      if (coursesData.success) setCourses(coursesData.courses);
      if (batchesData.success) setBatches(batchesData.batches);
      if (teachersData.success) {
        const raw = (teachersData.teachers || teachersData.data || []) as Array<Record<string, unknown>>;
        const normalized: Teacher[] = raw
          .map((obj) => {
            const user = obj.user_id ?? obj;
            return {
              _id: String(user._id),
              fname: user.fname || '',
              lname: user.lname || '',
            };
          })
          .filter(t => t._id);
        setTeachers(normalized);
      } 
    } catch {
      setError('Failed to load form options');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.course_id || !formData.batch_id || !formData.teacher_id || 
          !formData.subject || !formData.topic || !formData.date || 
          !formData.lecture_start || !formData.lecture_end) {
        throw new Error('Please fill in all required fields');
      }

      // Validate time logic
      const startTime = new Date(formData.lecture_start);
      const endTime = new Date(formData.lecture_end);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      const lectureData = {
        course_id: formData.course_id,
        batch_id: formData.batch_id,
        teacher_id: formData.teacher_id,
        subject: formData.subject,
        topic: formData.topic,
        subtopic: formData.subtopic,
        date: new Date(formData.date),
        lecture_start: new Date(formData.lecture_start),
        lecture_end: new Date(formData.lecture_end),
        note: formData.note
      };

      if (lecture && lecture._id) {
        await updateLecture(lecture._id, lectureData);
      } else {
        await createLecture(lectureData);
      }

      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save lecture';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // If course changes, also clear subject/topic/subtopic and topics/subtopics
    if (name === 'course_id') {
      setFormData(prev => ({ ...prev, [name]: value, subject: '', topic: '', subtopic: '' }));
      setTopics([]);
      setSubtopics([]);
    } else if (name === 'subject') {
      // when subject changes, clear topic/subtopic
      setFormData(prev => ({ ...prev, [name]: value, topic: '', subtopic: '' }));
      setTopics([]);
      setSubtopics([]);
    } else if (name === 'topic') {
      setFormData(prev => ({ ...prev, [name]: value, subtopic: '' }));
      setSubtopics([]);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black mb-1">
                Lecture Details
              </h2>
              <p className="text-sm text-black">
                Fill in the information below to schedule a new lecture
              </p>
            </div>
            <button onClick={onClose} className="text-black hover:text-black">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Course and Batch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Course <span className="text-red-500">*</span>
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="" className="text-black">Choose a course</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>{course.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Batch <span className="text-red-500">*</span>
              </label>
              <select
                name="batch_id"
                value={formData.batch_id}
                onChange={handleChange}
                required
                disabled={!formData.course_id}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black disabled:bg-gray-50 disabled:text-black"
              >
                <option value="" className="text-black">Choose a batch</option>
                {filteredBatches.map(batch => (
                  <option key={batch._id} value={batch._id}>{batch.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject and Teacher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Subject <span className="text-red-500">*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="" className="text-black">Choose a subject</option>
                {subjects.length > 0 ? (
                  subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))
                ) : (
                  // Fallback to a placeholder option until subjects load
                  <option value="" disabled className="text-black">No subjects available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Teacher <span className="text-red-500">*</span>
              </label>
              <select
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="" className="text-black">Choose a teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fname} {teacher.lname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  name="lecture_start"
                  value={formData.lecture_start ? formData.lecture_start.slice(11, 16) : ''}
                  onChange={(e) => {
                    const date = formData.date || new Date().toISOString().split('T')[0];
                    const datetime = `${date}T${e.target.value}`;
                    setFormData(prev => ({ ...prev, lecture_start: datetime }));
                  }}
                  required
                  placeholder="--:-- --"
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  name="lecture_end"
                  value={formData.lecture_end ? formData.lecture_end.slice(11, 16) : ''}
                  onChange={(e) => {
                    const date = formData.date || new Date().toISOString().split('T')[0];
                    const datetime = `${date}T${e.target.value}`;
                    setFormData(prev => ({ ...prev, lecture_end: datetime }));
                  }}
                  required
                  placeholder="--:-- --"
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              required
              disabled={!formData.course_id || !formData.subject}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black disabled:bg-gray-50 disabled:text-black"
            >
              <option value="" className="text-black">Choose a topic</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          {/* Sub Topic */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Sub Topic
            </label>
            <select
              name="subtopic"
              value={formData.subtopic}
              onChange={handleChange}
              disabled={!formData.course_id || !formData.subject || !formData.topic}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black disabled:bg-gray-50 disabled:text-black"
            >
              <option value="" className="text-black">Choose a sub topic</option>
              {subtopics.map(subtopic => (
                <option key={subtopic} value={subtopic}>{subtopic}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {subtopics.length === 0 && formData.topic ? 'No subtopics found. You can add one by creating a lecture with a new subtopic.' : ''}
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Note
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={4}
              placeholder="Add any additional notes or instructions for the lecture"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? 'Saving...' : 'Save Lecture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}