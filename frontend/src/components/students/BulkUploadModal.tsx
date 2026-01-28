'use client';
import { useState } from 'react';
import { X, Upload, Download, CheckCircle, XCircle, Mail } from 'lucide-react';

interface FailedEntry {
  row: number;
  data: Record<string, unknown>;
  error: string;
}

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: (failedData?: FailedEntry[]) => void; // ADD failedData parameter
}

export default function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<{ [key: string]: boolean }>({});

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    console.log("🚀 Starting bulk upload for file:", file.name);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log("📤 Sending request to /api/students/bulk-upload");
      const response = await fetch('http://localhost:5000/api/students/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log("📥 Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Upload response:", data);
      
      setResults(data.results);
      
      if (data.success) {
        console.log("✅ Upload successful:", data.results.success.length, "students added");
        onSuccess(data.results.failed);
      } else {
        console.error("❌ Upload reported failure:", data.message);
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
      console.log("🏁 Upload process completed");
    }
  };

  const handleSendCredentials = async (studentId: string) => {
    setSendingCredentials(prev => ({ ...prev, [studentId]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}/send-credentials`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Credentials sent (check backend console):', data.credentials);
        alert('Credentials logged! Check backend console.');
      }
    } catch {
      alert('Failed to send credentials');
    } finally {
      setSendingCredentials(prev => ({ ...prev, [studentId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-black">Bulk Upload Students</h2>
            <p className="text-sm text-black">Upload Excel file to add multiple students</p>
          </div>
          <button onClick={onClose} className="text-black-400 hover:text-black">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-black mb-2">Step 1: Download Template</h3>
            <p className="text-sm text-black mb-3">
              Download the Excel template and fill in student details
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>

          {/* Step 2: Upload File */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-black mb-2">Step 2: Upload Filled Template</h3>
            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-black-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <p className="text-sm text-black">Selected: {file.name}</p>
              )}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 text-black px-4 py-2 rounded-lg  disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload & Process'}
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
                    Successfully Added ({results.success.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.success.map((item: Record<string, unknown>) => (
                      <div key={item.studentId} className="bg-white p-3 rounded border border-green-200 flex items-center justify-between">
                        <div className="text-sm">
                          <p className="font-medium text-black">{item.name}</p>
                          <p className="text-black">{item.email} • {item.phone}</p>
                          <p className="text-xs text-black-500">Row {item.row} • {item.guardians} guardian(s)</p>
                        </div>
                        <button
                          onClick={() => handleSendCredentials(item.studentId)}
                          disabled={sendingCredentials[item.studentId]}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Mail className="h-3 w-3" />
                          {sendingCredentials[item.studentId] ? 'Sending...' : 'Send Login'}
                        </button>
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
                        <p className="text-sm font-medium text-black">Row {item.row}</p>
                        <p className="text-sm text-red-600">{item.error}</p>
                        <p className="text-xs text-black-500 mt-1">
                          {JSON.stringify(item.data).substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black cursor-pointer"
          >
            Close
          </button>
          {results && results.success.length > 0 && (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
