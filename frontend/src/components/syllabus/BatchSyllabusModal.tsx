'use client';
import React, { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import SyllabusViewer from './SyllabusViewer';

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

interface BatchSyllabusModalProps {
  batchId: string;
  batchName: string;
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function BatchSyllabusModal({ batchId, batchName, isOpen, onClose }: BatchSyllabusModalProps) {
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && batchId) {
      fetchSyllabus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, batchId]);

  const fetchSyllabus = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/syllabus?batch_id=${batchId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setSyllabus(data.data[0]);
      } else {
        setError('No syllabus found for this batch');
      }
    } catch (err) {
      console.error('Error fetching syllabus:', err);
      setError('Failed to load syllabus');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Batch Syllabus</h2>
              <p className="text-sm text-gray-600">{batchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading syllabus...</p>
            </div>
          )}

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <p className="text-gray-700">{error}</p>
              <p className="text-sm text-gray-600 mt-2">
                You can create a syllabus for this batch from the Syllabus Management page.
              </p>
            </div>
          )}

          {syllabus && !loading && !error && (
            <SyllabusViewer
              items={syllabus.items}
              academicYear={syllabus.academic_year}
              batchName={syllabus.batch_id.name}
              courseName={syllabus.course_id.name}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
