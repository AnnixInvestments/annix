"use client";

import React, { useCallback, useState } from "react";

export interface DatasheetDocument {
  file: File;
  id: string;
}

interface ValveDatasheetUploadProps {
  datasheets: DatasheetDocument[];
  onAddDatasheet: (file: File) => void;
  onRemoveDatasheet: (id: string) => void;
  maxDatasheets?: number;
  maxFileSizeMB?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType === "application/pdf") {
    return (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h2a1.5 1.5 0 0 1 0 3h-1v2H8v-5h.5zm4.5 0h2a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-2v-5zm-3.5 1v1h1a.5.5 0 0 0 0-1h-1zm4.5 0v3h1a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-1z" />
      </svg>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
    </svg>
  );
}

export default function ValveDatasheetUpload({
  datasheets,
  onAddDatasheet,
  onRemoveDatasheet,
  maxDatasheets = 5,
  maxFileSizeMB = 25,
}: ValveDatasheetUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

  const validateAndAddFile = useCallback(
    (file: File) => {
      setError(null);

      if (datasheets.length >= maxDatasheets) {
        setError(`Maximum ${maxDatasheets} datasheets allowed`);
        return;
      }

      if (file.size === 0) {
        setError(`File "${file.name}" is empty. Please select a valid file.`);
        return;
      }

      if (file.size > maxFileSizeBytes) {
        setError(`File "${file.name}" exceeds maximum size of ${maxFileSizeMB}MB`);
        return;
      }

      if (!acceptedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload PDF or image files only");
        return;
      }

      if (datasheets.some((doc) => doc.file.name === file.name)) {
        setError(`A file named "${file.name}" has already been added`);
        return;
      }

      onAddDatasheet(file);
    },
    [datasheets, maxDatasheets, maxFileSizeBytes, maxFileSizeMB, onAddDatasheet],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(validateAndAddFile);
    },
    [validateAndAddFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach(validateAndAddFile);
      }
      e.target.value = "";
    },
    [validateAndAddFile],
  );

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-2 bg-red-50 rounded border border-red-200 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {datasheets.length < maxDatasheets && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
            isDragOver
              ? "border-teal-500 bg-teal-50"
              : "border-gray-300 hover:border-teal-400 bg-white"
          }`}
        >
          <input
            type="file"
            id="valve-datasheet-upload"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="valve-datasheet-upload"
            className="cursor-pointer flex items-center justify-center gap-3"
          >
            <div className="p-2 bg-teal-100 rounded-full">
              <svg
                className="w-5 h-5 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-teal-600">Upload valve datasheet</span>
                <span className="text-gray-400 ml-2">
                  ({datasheets.length}/{maxDatasheets})
                </span>
              </p>
              <p className="text-xs text-gray-400">
                Manufacturer specs, Cv curves, dimensions (PDF, images)
              </p>
            </div>
          </label>
        </div>
      )}

      {datasheets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {datasheets.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-teal-50 rounded border border-teal-200 text-sm"
            >
              <div className="w-5 h-5 flex-shrink-0">{getFileIcon(doc.file.type)}</div>
              <span className="text-gray-700 truncate max-w-[150px]" title={doc.file.name}>
                {doc.file.name}
              </span>
              <span className="text-xs text-gray-400">{formatFileSize(doc.file.size)}</span>
              <button
                type="button"
                onClick={() => onRemoveDatasheet(doc.id)}
                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {datasheets.length >= maxDatasheets && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Maximum datasheets reached. Remove one to add more.
        </p>
      )}
    </div>
  );
}
