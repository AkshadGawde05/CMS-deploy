'use client';
import { useState } from 'react';
import { X, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: (failedData?: Record<string, unknown>[]) => void;
}

export default function BulkUploadSyllabusModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleDownloadTemplate = async () => {
    console.log('📥 Downloading syllabus template...');
    try {
      const response = await fetch(`${API_BASE}/api/syllabus/template`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'syllabus_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Template saved');
    } catch (err: unknown) {
      console.error('❌ Download failed:', err);
      setError('Failed to download template: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('📄 File selected:', selectedFile.name);
      setFile(selectedFile);
      setResults(null);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    console.log('📤 Starting syllabus upload...');
    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('📤 Sending request to /api/syllabus/bulk-upload');
      const response = await fetch(`${API_BASE}/api/syllabus/bulk-upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Upload response:', data);

      if (data.success) {
        setResults(data.results);
        console.log(`✅ Upload complete: ${data.results.success?.length || 0} succeeded, ${data.results.failed?.length || 0} failed`);
        onSuccess(data.results.failed);
      } else {
        console.error('❌ Upload reported failure:', data.message);
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err: unknown) {
      console.error('❌ Upload error:', err);
      setError('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      console.log('🏁 Upload process completed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Syllabi</h2>
            <p className="text-sm text-gray-600">Upload Excel file to create multiple syllabi at once</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Download Template */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">1</span>
              Download Template
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Download the Excel template with syllabus format. Fill in Batch ID, Course ID, Academic Year, and syllabus items.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">2</span>
              Upload Filled Template
            </h3>
            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {file && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Selected: {file.name}
                </p>
              )}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Processing...' : 'Upload & Process'}
              </button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {/* Success List */}
              {results.success && results.success.length > 0 && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Successfully Processed ({results.success.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.success.map((item: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="text-sm flex-1">
                            <p className="font-medium text-gray-900">
                              Row {item.row}: {item.subject} - {item.topic}
                            </p>
                            <p className="text-gray-600 mt-1">
                              📚 Course: {item.course_name} • 📅 {item.academic_year}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Action: {item.action}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                            item.action === 'Created' ? 'bg-green-100 text-green-700' :
                            item.action === 'Added' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.action}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed List */}
              {results.failed && results.failed.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Failed ({results.failed.length} rows)
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.failed.map((item: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded border-l-4 border-l-red-500 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-bold text-gray-900">
                            📍 Row {item.row}
                          </p>
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-medium">
                            ERROR
                          </span>
                        </div>
                        
                        <div className="bg-red-50 p-2 rounded mb-2">
                          <p className="text-sm text-red-700 font-medium">
                            ❌ {item.error}
                          </p>
                        </div>
                        
                        {item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Row Data:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {item.data['course'] && (
                                <div>
                                  <span className="font-medium text-gray-600">Course:</span>
                                  <span className="ml-1 text-gray-800">{String(item.data['course'])}</span>
                                </div>
                              )}
                              {item.data['subject'] && (
                                <div>
                                  <span className="font-medium text-gray-600">Subject:</span>
                                  <span className="ml-1 text-gray-800">{String(item.data['subject'])}</span>
                                </div>
                              )}
                              {item.data['topic'] && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-600">Topic:</span>
                                  <span className="ml-1 text-gray-800">{String(item.data['topic'])}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Fix Suggestions */}
                  <div className="mt-4 pt-4 border-t border-red-300">
                    <p className="text-sm font-semibold text-red-900 mb-2">💡 Common Issues:</p>
                    <ul className="text-xs text-red-800 space-y-1">
                      <li>• <strong>Course not found:</strong> Make sure the Course name in Column A exactly matches a course in your system</li>
                      <li>• <strong>Missing fields:</strong> Ensure Course, Subject, and Topic columns are not empty</li>
                      <li>• <strong>Authentication:</strong> Make sure you're logged in as Admin/SuperAdmin</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className={`border rounded-lg p-4 ${
                results.failed && results.failed.length > 0 
                  ? 'bg-yellow-50 border-yellow-300' 
                  : 'bg-green-50 border-green-300'
              }`}>
                <p className="text-sm font-bold mb-2">
                  📊 Upload Summary
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{results.success?.length || 0}</p>
                    <p className="text-xs text-gray-600">✅ Succeeded</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{results.failed?.length || 0}</p>
                    <p className="text-xs text-gray-600">❌ Failed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{results.total || 0}</p>
                    <p className="text-xs text-gray-600">📝 Total Rows</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> To get Batch ID and Course ID, check your existing records in their respective pages. You can copy IDs from the URL or contact admin.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Close
          </button>
          {results && results.success.length > 0 && (
            <button 
              onClick={() => { 
                onSuccess(results.failed); 
                onClose(); 
              }} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
