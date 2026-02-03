"use client";

import { useState } from "react";
import { X, Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import { uploadEnquiriesExcel, downloadEnquiryTemplate } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface BulkUploadEnquiryModalProps {
  onClose: () => void;
  onSuccess: (failedEntries?: Array<Record<string, unknown>>) => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  results: {
    success: Array<Record<string, unknown>> | Array<unknown>;
    failed: Array<Record<string, unknown>>;
    total: number;
    duplicatesCount?: number;
  };
}

export default function BulkUploadEnquiryModal({
  onClose,
  onSuccess,
}: BulkUploadEnquiryModalProps) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // Key to force input reset
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        showToast({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please select a valid Excel file (.xlsx or .xls)'
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        showToast({
          type: 'error',
          title: 'File Too Large',
          message: 'Please select a file smaller than 10MB'
        });
        return;
      }
      
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await downloadEnquiryTemplate();
      showToast({
        type: 'success',
        title: 'Template Downloaded',
        message: 'Excel template has been downloaded successfully'
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download template. Please try again.'
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const testEndpoint = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/enquiries/bulk-upload/health`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      console.log('🔍 Endpoint test result:', result);
      showToast({
        type: response.ok ? 'success' : 'error',
        title: response.ok ? 'Endpoint Accessible' : 'Endpoint Error',
        message: result.message || 'Unknown response'
      });
    } catch (error) {
      console.error('🔍 Endpoint test error:', error);
      showToast({
        type: 'error',
        title: 'Connection Failed',
        message: 'Cannot reach the server. Check if the backend is running.'
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showToast({
        type: 'warning',
        title: 'File Required',
        message: 'Please select an Excel file to upload'
      });
      return;
    }

    console.log('📤 Starting upload process for:', file.name, 'Size:', file.size, 'Type:', file.type);

    try {
      setUploading(true);
      console.log('📤 Starting file upload:', file.name, 'Size:', file.size);
      
      // Additional file validation
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      const result = await uploadEnquiriesExcel(file);
      console.log('📤 Upload result:', result);
      setUploadResult(result);

      if (result && result.results && result.results.failed.length === 0) {
        showToast({
          type: 'success',
          title: 'Upload Successful',
          message: `${result.results.success.length} enquiries uploaded successfully`
        });
        // Call success immediately to refresh the table
        onSuccess();
      } else {
        onSuccess(result?.results?.failed || []);
      }
    } catch (error) {
      console.error('📤 Upload error details:', {
        error,
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      const err = error as { 
        response?: { 
          data?: { message?: string; results?: { duplicatesCount?: number } };
          status?: number;
        };
        message?: string;
        code?: string;
        name?: string;
      };
      
      let errorMessage = "Failed to upload enquiries";
      let errorTitle = "Upload Failed";
      
      // Handle specific error types
      if (err.response?.status === 401) {
        errorMessage = "You are not authorized to upload enquiries. Please log in again.";
        errorTitle = "Authentication Error";
      } else if (err.response?.status === 413) {
        errorMessage = "File is too large. Please select a smaller file (max 10MB).";
        errorTitle = "File Too Large";
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || "Invalid file format or data.";
        errorTitle = "Invalid File";
      } else if (err.message?.includes('ERR_UPLOAD_FILE_CHANGED')) {
        errorMessage = "The file was modified during upload. Please try again with a fresh file selection.";
        errorTitle = "File Upload Error";
        setFile(null); // Clear the file so user has to reselect
        setFileInputKey(prev => prev + 1); // Reset file input
      } else if (err.code === 'ERR_NETWORK' || err.name === 'NetworkError') {
        errorMessage = "Network error occurred. Please check your connection and server status.";
        errorTitle = "Network Error";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('📤 Final error message:', errorTitle, '-', errorMessage);
      
      const duplicatesCount = err.response?.data?.results?.duplicatesCount;
      
      const results = err.response?.data?.results;
      setUploadResult({
        success: false,
        message: errorMessage,
        results: {
          success: results && 'success' in results ? results.success : [],
          failed: results && 'failed' in results ? results.failed : [],
          total: results && 'total' in results ? results.total : 0,
          duplicatesCount: results && 'duplicatesCount' in results ? results.duplicatesCount : undefined
        }
      });

      if (duplicatesCount && duplicatesCount > 0) {
        showToast({
          type: 'error',
          title: 'Duplicate Phone Numbers Found',
          message: `Found ${duplicatesCount} duplicate phone numbers. Please review and remove duplicates before uploading again.`,
          duration: 8000
        });
      } else {
        showToast({
          type: 'error',
          title: errorTitle,
          message: errorMessage,
          duration: 6000
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Enquiries</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload multiple enquiries using an Excel file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Step 1: Download Template */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Step 1: Download Template
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Download the Excel template with predefined columns for enquiry data.
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloadingTemplate ? "Downloading..." : "Download Template"}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Template Instructions
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Fill in all required fields marked with *</li>
              <li>• <strong>Name</strong>: Full name of the enquirer</li>
              <li>• <strong>Phone</strong>: 10-digit phone number (required)</li>
              <li>• <strong>Email</strong>: Valid email address (optional)</li>
              <li>• <strong>Source</strong>: Website, Facebook, Google Ads, Referral, Walk-in, Phone Call</li>
              <li>• <strong>Interest</strong>: Full Stack, Data Science, Digital Marketing, UI/UX, Python, Java</li>
              <li>• <strong>Location</strong>: City/Area (optional)</li>
              <li>• Do not modify the header row</li>
            </ul>
          </div>

          {/* Step 2: Fill & Upload */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Step 2: Fill Template & Upload
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Fill in the enquiry details in the template, then upload the completed file.
            </p>

            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Choose file
                </span>
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Excel file (.xlsx, .xls)</p>
              {file && (
                <p className="text-sm text-gray-900 font-medium mt-3">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`p-4 rounded-lg border ${
                uploadResult.results.failed.length === 0
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {uploadResult.results.failed.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {uploadResult.message}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700">
                      ✓ {uploadResult.results.success.length} enquiries created successfully
                    </p>
                    {uploadResult.results.failed.length > 0 && (
                      <p className="text-sm text-gray-700">
                        ✗ {uploadResult.results.failed.length} enquiries failed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={testEndpoint}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition"
          >
            Test Connection
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {uploadResult ? "Close" : "Cancel"}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Upload Enquiries"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}