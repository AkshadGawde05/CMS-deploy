"use client";

import { useState } from "react";
import { X, Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { downloadResultsTemplate, uploadResultsExcel, ExamDTO } from "@/lib/api";

interface BulkUploadResultsModalProps {
  exam: ExamDTO;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadResultsModal({
  exam,
  onClose,
  onSuccess,
}: BulkUploadResultsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    successful: number;
    failed: Record<string, unknown>[];
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
      await downloadResultsTemplate(exam._id!);
    } catch {
      alert("Failed to download template");
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
      const result = await uploadResultsExcel(exam._id!, file);
      setUploadResult(result);
      
      if (result.failed.length === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: unknown) {
      alert(err instanceof Error && 'response' in err && typeof (err as Record<string, unknown>).response === 'object' && (err as Record<string, unknown>).response && 'data' in ((err as Record<string, unknown>).response as object) && typeof ((err as Record<string, unknown>).response as Record<string, unknown>).data === 'object' && ((err as Record<string, unknown>).response as Record<string, unknown>).data && 'message' in (((err as Record<string, unknown>).response as Record<string, unknown>).data as object) ? String((((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>).message) : "Failed to upload results");
    } finally {
      setUploading(false);
    }
  };

  const getBatchName = (batchId: Record<string, unknown> | string | undefined) => {
    if (typeof batchId === "object" && batchId?.name) {
      return batchId.name as string;
    }
    return "Unknown Batch";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-black-900">Bulk Upload Results</h2>
            <p className="text-sm text-black-600 mt-1">
              {exam.topic} - {getBatchName(exam.batch_id)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-black-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Step 1: Download Template */}
          <div>
            <h3 className="text-sm font-semibold text-black-900 mb-2">
              Step 1: Download Template
            </h3>
            <p className="text-sm text-black-600 mb-3">
              Download the Excel template pre-filled with student information for this exam.
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

          {/* Step 2: Fill & Upload */}
          <div>
            <h3 className="text-sm font-semibold text-black-900 mb-2">
              Step 2: Fill Template & Upload
            </h3>
            <p className="text-sm text-black-600 mb-3">
              Fill in the marks and grades in the template, then upload the completed file.
            </p>

            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <Upload className="h-10 w-10 text-black-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  Choose file
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-black-500 mt-2">Excel file (.xlsx, .xls)</p>
              {file && (
                <p className="text-sm text-black-900 font-medium mt-3">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`p-4 rounded-lg border ${
                uploadResult.failed.length === 0
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {uploadResult.failed.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-black-900">
                    {uploadResult.message}
                  </p>
                  <p className="text-sm text-black-600 mt-1">
                    {uploadResult.successful} results uploaded successfully
                    {uploadResult.failed.length > 0 &&
                      `, ${uploadResult.failed.length} failed`}
                  </p>
                  {uploadResult.failed.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-black-700">Failed entries:</p>
                      {uploadResult.failed.slice(0, 5).map((fail, idx) => (
                        <p key={idx} className="text-xs text-black-600">
                          • {fail.error}
                        </p>
                      ))}
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
            className="px-4 py-2 text-sm font-medium text-black-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload Results"}
          </button>
        </div>
      </div>
    </div>
  );
}
