'use client';
import React from 'react';
import { BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface SyllabusItem {
  _id?: string;
  subject: string;
  topic: string;
  subtopic?: string;
  description?: string;
  duration_hours?: number;
  order?: number;
}

interface SyllabusViewerProps {
  items: SyllabusItem[];
  title?: string;
  academicYear?: string;
  batchName?: string;
  courseName?: string;
  compact?: boolean;
  showProgress?: boolean;
  completedTopics?: string[];
}

export default function SyllabusViewer({
  items,
  title,
  academicYear,
  batchName,
  courseName,
  compact = false,
  showProgress = false,
  completedTopics = []
}: SyllabusViewerProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Group items by subject
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = [];
    }
    acc[item.subject].push(item);
    return acc;
  }, {} as Record<string, SyllabusItem[]>);

  const totalHours = items.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
  const completedCount = items.filter(item => completedTopics.includes(item._id || '')).length;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No syllabus available</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {title && <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>}
        <div className="space-y-2">
          {Object.entries(groupedItems).map(([subject, subjectItems]) => (
            <div key={subject} className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-sm text-gray-900">{subject}</h4>
              <p className="text-xs text-gray-600">{subjectItems.length} topics</p>
            </div>
          ))}
        </div>
        {showProgress && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title || 'Syllabus'}
            </h2>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              {batchName && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Batch:</span> {batchName}
                </span>
              )}
              {courseName && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Course:</span> {courseName}
                </span>
              )}
              {academicYear && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Year:</span> {academicYear}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span className="text-lg font-semibold">{totalHours}h</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Total Duration</p>
          </div>
        </div>

        {showProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium text-gray-900">
                {completedCount}/{items.length} topics ({completionPercentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([subject, subjectItems]) => (
            <div key={subject} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {subject}
                  <span className="ml-auto text-sm font-normal text-gray-600">
                    {subjectItems.length} topics · {subjectItems.reduce((sum, item) => sum + (item.duration_hours || 0), 0)}h
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {subjectItems.map((item, idx) => {
                  const itemId = item._id || `${subject}-${idx}`;
                  const isExpanded = expandedItems.has(itemId);
                  const isCompleted = completedTopics.includes(item._id || '');

                  return (
                    <div key={itemId} className={`${isCompleted ? 'bg-green-50' : 'bg-white'}`}>
                      <div
                        className="px-4 py-3 flex items-start justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleItem(itemId)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {showProgress && (
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                readOnly
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                            )}
                            <h4 className="font-medium text-gray-900">{item.topic}</h4>
                            {item.subtopic && (
                              <span className="text-sm text-gray-500">· {item.subtopic}</span>
                            )}
                          </div>
                          {item.description && isExpanded && (
                            <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {item.duration_hours && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {item.duration_hours}h
                            </span>
                          )}
                          {item.description && (
                            <button className="text-gray-400 hover:text-gray-600">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
