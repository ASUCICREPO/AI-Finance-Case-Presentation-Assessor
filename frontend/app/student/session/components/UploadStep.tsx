'use client';

import { useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { config } from '../../../config/config';

interface UploadStepProps {
  onFileUpload: (file: File) => void;
  uploadedFile: File | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
}

/**
 * Upload Step — Student uploads their Excel workbook before starting Q&A.
 */
export default function UploadStep({
  onFileUpload,
  uploadedFile,
  uploadProgress,
  isUploading,
  error,
}: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && isValidFile(file)) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFile(file)) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const isValidFile = (file: File): boolean => {
    if (file.size > config.maxFileSize) {
      return false;
    }
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    return validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/student/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 font-sans"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 font-serif">
        Upload Your Group&apos;s Analysis
      </h1>
      <p className="mt-2 text-sm text-gray-600 font-sans">
        Upload the Excel workbook containing your group&apos;s financial model, assumptions, and
        analysis. The AI stakeholder will reference this data during your Q&A session.
      </p>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          isUploading
            ? 'border-maroon-300 bg-maroon-50'
            : uploadedFile && !error
            ? 'border-green-300 bg-green-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-gray-50 hover:border-maroon-400 hover:bg-maroon-50/30'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 size={40} className="text-maroon-600 animate-spin" />
            <p className="mt-4 text-sm font-medium text-gray-700 font-sans">
              Uploading and parsing...
            </p>
            <div className="mt-3 h-2 w-48 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-maroon-600 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 font-sans">{uploadProgress}%</p>
          </>
        ) : uploadedFile && !error ? (
          <>
            <CheckCircle size={40} className="text-green-600" />
            <p className="mt-4 text-sm font-medium text-gray-900 font-sans">
              {uploadedFile.name}
            </p>
            <p className="mt-1 text-xs text-green-600 font-sans">
              Uploaded and validated successfully
            </p>
          </>
        ) : (
          <>
            {error ? (
              <AlertCircle size={40} className="text-red-500" />
            ) : (
              <FileSpreadsheet size={40} className="text-gray-400" />
            )}
            <p className="mt-4 text-sm font-medium text-gray-700 font-sans">
              {error || 'Drag and drop your Excel file here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-gray-500 font-sans">
              Supported: .xlsx, .xls, .csv (max 50MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
            >
              <Upload size={16} />
              Choose File
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Requirements info */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 font-sans">File Requirements</h3>
        <ul className="mt-2 space-y-1 text-xs text-gray-600 font-sans">
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-gray-400" />
            Must contain your group&apos;s financial model and supporting data
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-gray-400" />
            Include sheets for: Summary, Properties/Assets, Financial Model, Assumptions
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-gray-400" />
            All team members should use the same workbook for their individual sessions
          </li>
        </ul>
      </div>
    </div>
  );
}
