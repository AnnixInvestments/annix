"use client";

import React, { useCallback, useState } from "react";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_VALID_TYPES,
} from "@/app/lib/config/registration/constants";

interface DocumentUploadBoxProps {
  label: string;
  description?: string;
  required?: boolean;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onError?: (message: string) => void;
  statusMessage?: string;
  statusType?: "success" | "warning" | "info";
  enableDragDrop?: boolean;
  accept?: string;
}

export function DocumentUploadBox({
  label,
  description,
  required = false,
  file,
  onFileSelect,
  onError,
  statusMessage,
  statusType = "success",
  enableDragDrop = false,
  accept = ".pdf,.jpg,.jpeg,.png",
}: DocumentUploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelectFile = useCallback(
    (selectedFile: File) => {
      if (!DOCUMENT_VALID_TYPES.includes(selectedFile.type)) {
        onError?.("Invalid file type. Please upload PDF, JPG, or PNG files.");
        return;
      }
      if (selectedFile.size > DOCUMENT_MAX_SIZE_BYTES) {
        onError?.("File too large. Maximum size is 10MB.");
        return;
      }
      onFileSelect(selectedFile);
    },
    [onFileSelect, onError],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (enableDragDrop) setIsDragging(true);
    },
    [enableDragDrop],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!enableDragDrop) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) validateAndSelectFile(droppedFile);
    },
    [enableDragDrop, validateAndSelectFile],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) validateAndSelectFile(selectedFile);
    },
    [validateAndSelectFile],
  );

  const statusColorClasses = {
    success: "text-green-600",
    warning: "text-orange-600",
    info: "text-blue-600",
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 ${
        isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {description && <p className="text-xs text-gray-500 mb-3">{description}</p>}
      <input
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {file && (
        <div className="mt-2">
          <p className="text-sm text-green-600">Selected: {file.name}</p>
          {statusMessage && (
            <p className={`text-xs mt-1 ${statusColorClasses[statusType]}`}>{statusMessage}</p>
          )}
        </div>
      )}
      {enableDragDrop && !file && (
        <p className="mt-2 text-xs text-gray-400 text-center">or drag and drop a file here</p>
      )}
    </div>
  );
}

export function DocumentRequirementsList() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Document Requirements</h3>
      <ul className="text-xs text-gray-600 space-y-1">
        <li>Accepted formats: PDF, JPG, PNG</li>
        <li>Maximum file size: 10MB per document</li>
        <li>Documents must be clear and readable</li>
        <li>Documents must be valid and not expired</li>
      </ul>
    </div>
  );
}
