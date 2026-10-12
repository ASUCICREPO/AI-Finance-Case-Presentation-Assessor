'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, X, FileText, Download } from 'lucide-react';

interface MaterialFile {
  name: string;
  s3Key: string;
  type: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  onComplete: (file: File) => void;
  onSelectMaterial: (material: MaterialFile) => void;
  onBack: () => void;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  assessmentMaterials?: MaterialFile[];
}

/**
 * Document Upload - Upload spreadsheet or select from pre-uploaded materials before starting Q&A session.
 */
export default function DocumentUpload({
  onComplete,
  onSelectMaterial,
  onBack,
  isUploading,
  uploadProgress,
  error,
  assessmentMaterials = [],
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<'material' | 'upload'>(
    assessmentMaterials.some(m => m.name.match(/\.(xlsx|xls|csv)$/i)) ? 'material' : 'upload'
  );

  // Filter to only show Excel/CSV files from materials
  const spreadsheetMaterials = assessmentMaterials.filter(m =>
    m.name.match(/\.(xlsx|xls|csv)$/i)
  );

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return;
    }

    setSelectedFile(file);
    setSelectedMaterial(null);
  }, []);

  const handleMaterialSelect = (material: MaterialFile) => {
    setSelectedMaterial(material);
    setSelectedFile(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleContinue = () => {
    if (selectedFile) {
      onComplete(selectedFile);
    } else if (selectedMaterial) {
      onSelectMaterial(selectedMaterial);
    }
  };

  const hasSelection = selectedFile || selectedMaterial;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 font-serif mb-2">
        Select Your Spreadsheet
      </h1>
      <p className="text-gray-600 font-sans mb-6">
        Choose the financial analysis workbook for your presentation. The AI will reference this during the Q&A session.
      </p>

      {/* Option Toggle - only show if there are pre-uploaded spreadsheets */}
      {spreadsheetMaterials.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setUploadMode('material'); setSelectedFile(null); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${uploadMode === 'material'
                ? 'border-maroon-600 bg-maroon-50 text-maroon-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
          >
            <FileText size={18} className="inline mr-2" />
            Use Pre-uploaded File
          </button>
          <button
            onClick={() => { setUploadMode('upload'); setSelectedMaterial(null); }}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${uploadMode === 'upload'
                ? 'border-maroon-600 bg-maroon-50 text-maroon-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Upload size={18} className="inline mr-2" />
            Upload Your Own
          </button>
        </div>
      )}

      {/* Pre-uploaded Materials Selection */}
      {uploadMode === 'material' && spreadsheetMaterials.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-900 font-sans mb-3">
            Available Spreadsheets
          </h3>
          <div className="space-y-2">
            {spreadsheetMaterials.map((material) => (
              <button
                key={material.s3Key}
                onClick={() => handleMaterialSelect(material)}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selectedMaterial?.s3Key === material.s3Key
                    ? 'border-maroon-600 bg-maroon-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className={`rounded-full p-2 ${selectedMaterial?.s3Key === material.s3Key ? 'bg-maroon-100' : 'bg-gray-100'
                  }`}>
                  <FileSpreadsheet size={20} className={
                    selectedMaterial?.s3Key === material.s3Key ? 'text-maroon-600' : 'text-gray-500'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{material.name}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded {new Date(material.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedMaterial?.s3Key === material.s3Key && (
                  <CheckCircle size={20} className="text-maroon-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area - show if upload mode or no pre-uploaded files */}
      {(uploadMode === 'upload' || spreadsheetMaterials.length === 0) && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver
              ? 'border-maroon-400 bg-maroon-50'
              : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <FileSpreadsheet size={32} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 font-sans mb-1">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 font-sans mb-4">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={() => setSelectedFile(null)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X size={14} />
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-gray-100 p-3 mb-4 mx-auto w-fit">
                <Upload size={32} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 font-sans mb-1">
                Drag and drop your file here
              </p>
              <p className="text-xs text-gray-500 font-sans mb-4">
                or click to browse
              </p>
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors font-sans">
                <Upload size={16} />
                Choose File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-maroon-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 font-sans">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {/* File Requirements */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 font-sans mb-3">Accepted file formats</h3>
        <div className="flex flex-wrap gap-2">
          {['.xlsx', '.xls', '.csv'].map((ext) => (
            <span key={ext} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <FileSpreadsheet size={12} />
              {ext}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 font-sans">
          Maximum file size: 50MB. Ensure your workbook contains your financial model and analysis.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-sans">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasSelection || isUploading}
          className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors font-sans ${hasSelection && !isUploading
              ? 'bg-maroon-600 text-white hover:bg-maroon-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          {isUploading ? 'Uploading...' : 'Continue'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
