'use client';

import React, { useCallback, useState } from 'react';

interface PendingDocument {
  file: File;
  id: string; // Unique ID for React key
}

interface RfqDocumentUploadProps {
  documents: PendingDocument[];
  onAddDocument: (file: File) => void;
  onRemoveDocument: (id: string) => void;
  maxDocuments?: number;
  maxFileSizeMB?: number;
}

// File size formatter
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file type icon based on MIME type
function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h2a1.5 1.5 0 0 1 0 3h-1v2H8v-5h.5zm4.5 0h2a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-2v-5zm-3.5 1v1h1a.5.5 0 0 0 0-1h-1zm4.5 0v3h1a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-1z"/>
      </svg>
    );
  }

  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'application/vnd.ms-excel') {
    return (
      <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z"/>
      </svg>
    );
  }

  if (mimeType.includes('word') || mimeType === 'application/msword') {
    return (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v1H8v-1zm0 2h8v1H8v-1zm0 2h5v1H8v-1z"/>
      </svg>
    );
  }

  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"/>
      </svg>
    );
  }

  // Default document icon
  return (
    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
    </svg>
  );
}

export default function RfqDocumentUpload({
  documents,
  onAddDocument,
  onRemoveDocument,
  maxDocuments = 10,
  maxFileSizeMB = 50,
}: RfqDocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

  const validateAndAddFile = useCallback((file: File) => {
    setError(null);

    // Check document limit
    if (documents.length >= maxDocuments) {
      setError(`Maximum ${maxDocuments} documents allowed per RFQ`);
      return;
    }

    // Check file size
    if (file.size > maxFileSizeBytes) {
      setError(`File "${file.name}" exceeds maximum size of ${maxFileSizeMB}MB`);
      return;
    }

    // Check for duplicate filename
    if (documents.some(doc => doc.file.name === file.name)) {
      setError(`A file named "${file.name}" has already been added`);
      return;
    }

    onAddDocument(file);
  }, [documents, maxDocuments, maxFileSizeBytes, maxFileSizeMB, onAddDocument]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(validateAndAddFile);
  }, [validateAndAddFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(validateAndAddFile);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [validateAndAddFile]);

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Supporting Documents
        <span className="text-sm font-normal text-gray-500">
          ({documents.length}/{maxDocuments})
        </span>
      </h4>

      <p className="text-sm text-gray-600 mb-4">
        Upload any relevant documents such as specifications, drawings, or requirements.
        Accepted formats: PDF, Excel, Word, images, CAD files, etc.
      </p>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {documents.length < maxDocuments && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input
            type="file"
            id="document-upload"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="document-upload" className="cursor-pointer">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: {maxFileSizeMB}MB
            </p>
          </label>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Attached Documents
          </h5>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {getFileIcon(doc.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(doc.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveDocument(doc.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove document"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Limit reached message */}
      {documents.length >= maxDocuments && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-amber-700">
              Maximum document limit reached. Remove a document to add more.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
