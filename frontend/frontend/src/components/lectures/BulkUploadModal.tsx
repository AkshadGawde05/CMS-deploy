'use client';
import { useState } from 'react';
import { X, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
}

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: (failedData?: FailedEntry[]) => void;
}

export default function BulkUploadLecturesModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleDownloadTemplate = async () => {
    console.log('📥 Downloading lecture template...');
    try {
      const response = await fetch('http://localhost:5000/api/lectures/template');
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lecture_template.xlsx';
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

    console.log('📤 Starting lecture upload...');
    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/lectures/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        onSuccess(data.results.failed);
        console.log(`✅ Upload complete`);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err: unknown) {
      console.error('❌ Upload error:', err);
      setError('Upload failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-black-900">Bulk Upload Lectures</h2>
            <p className="text-sm text-black-600">Upload Excel file to schedule multiple lectures</p>
          </div>
          <button onClick={onClose} className="text-black-400 hover:text-black-600 transition">
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
            <h3 className="font-semibold text-black-900 mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">1</span>
              Download Template
            </h3>
            <p className="text-sm text-black-600 mb-3">
              Download the Excel template with lecture schedule format. Fill in Course ID, Batch ID, Teacher ID, dates, and times.
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
            <h3 className="font-semibold text-black-900 mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">2</span>
              Upload Filled Template
            </h3>
            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-black-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {file && (
                <p className="text-sm text-black-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Selected: {file.name}
                </p>
              )}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2cursor-not-allowed transition shadow-sm"
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
              {results.success.length > 0 && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Successfully Scheduled ({results.success.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.success.map((item: Record<string, unknown>) => (
                      <div key={item.lectureId} className="bg-white p-3 rounded border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-black-900">{item.topic}</p>
                            <p className="text-sm text-black-600 mt-1">
                              📅 {item.date} • 🕒 {item.time}
                            </p>
                            <p className="text-xs text-black-500 mt-1">Row {item.row}</p>
                          </div>
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed List */}
              {results.failed.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Failed ({results.failed.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.failed.map((item: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded border border-red-200">
                        <p className="text-sm font-medium text-black-900">Row {item.row}</p>
                        <p className="text-sm text-red-600 mt-1">{item.error}</p>
                        <p className="text-xs text-black-500 mt-2">
                          {item.data?.['Topic *'] && `Topic: ${item.data['Topic *']}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> To get Course ID, Batch ID, and Teacher ID, check your existing records in their respective pages. You can copy IDs from the URL or contact admin.
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
