"use client";

import { useState } from "react";
import { X, Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import { downloadExamTemplate, uploadExamsExcel } from "@/lib/api";

interface BulkUploadExamsModalProps {
  onClose: () => void;
  onSuccess: (failedEntries?: Record<string, unknown>[]) => void;
}

export default function BulkUploadExamsModal({
  onClose,
  onSuccess,
}: BulkUploadExamsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    results: {
      success: Record<string, unknown>[];
      failed: Record<string, unknown>[];
      total: number;
    };
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await downloadExamTemplate();
    } catch (err) {
      
      console.error(err);
    
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const result = await uploadExamsExcel(file);
      setUploadResult(result);

      if (result.results.failed.length === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        // Pass failed entries back to parent
        onSuccess(result.results.failed);
      }
    } catch (err: unknown) {
      alert(err instanceof Error && 'response' in err && typeof (err as Record<string, unknown>).response === 'object' && (err as Record<string, unknown>).response && 'data' in ((err as Record<string, unknown>).response as object) && typeof ((err as Record<string, unknown>).response as Record<string, unknown>).data === 'object' && ((err as Record<string, unknown>).response as Record<string, unknown>).data && 'message' in (((err as Record<string, unknown>).response as Record<string, unknown>).data as object) ? String((((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>).message) : "Failed to upload exams");
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
            <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Exams</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload multiple exams using an Excel file
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
              Download the Excel template with predefined columns and sample data.
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
              <li>• <strong>Exam Type</strong> must be: on_theory, off_theory, on_mcq, or off_mcq</li>
              <li>• <strong>Exam Link</strong> is required only for online exams (on_theory, on_mcq)</li>
              <li>• <strong>Date</strong> format must be YYYY-MM-DD (e.g., 2025-11-15)</li>
              <li>• Get <strong>Batch ID</strong> from your batches list</li>
              <li>• Do not modify the header row</li>
            </ul>
          </div>

          {/* Step 2: Fill & Upload */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Step 2: Fill Template & Upload
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Fill in the exam details in the template, then upload the completed file.
            </p>

            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Choose file
                </span>
                <input
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
                      ✓ {uploadResult.results.success.length} exams created successfully
                    </p>
                    {uploadResult.results.failed.length > 0 && (
                      <p className="text-sm text-gray-700">
                        ✗ {uploadResult.results.failed.length} exams failed
                      </p>
                    )}
                  </div>
                  {uploadResult.results.failed.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-gray-700">Failed entries:</p>
                      {uploadResult.results.failed.slice(0, 5).map((fail: Record<string, unknown>, idx: number) => (
                        <p key={idx} className="text-xs text-gray-600">
                          • Row {fail.row as number}: {fail.error as string}
                        </p>
                      ))}
                      {uploadResult.results.failed.length > 5 && (
                        <p className="text-xs text-gray-500 italic">
                          ... and {uploadResult.results.failed.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
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
            {uploading ? "Uploading..." : "Upload Exams"}
          </button>
        </div>
      </div>
    </div>
  );
}
