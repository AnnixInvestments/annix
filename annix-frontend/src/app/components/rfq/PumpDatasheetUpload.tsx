"use client";

import React, { useCallback, useState } from "react";

export interface DatasheetDocument {
  file: File;
  id: string;
}

interface PumpDatasheetUploadProps {
  datasheets: DatasheetDocument[];
  onAddDatasheet: (file: File) => void;
  onRemoveDatasheet: (id: string) => void;
  maxDatasheets?: number;
  maxFileSizeMB?: number;
  serviceType?: "new_pump" | "spare_parts" | "repair_service" | "rental";
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

const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const SERVICE_TYPE_HELP: Record<string, { title: string; examples: string[] }> = {
  new_pump: {
    title: "Pump Datasheets & Curves",
    examples: [
      "Pump performance curves (head vs flow)",
      "Technical datasheets from manufacturer",
      "System curve calculations",
      "Piping layout drawings",
    ],
  },
  spare_parts: {
    title: "Pump & Parts Documentation",
    examples: [
      "Exploded view / parts diagram",
      "Existing pump nameplate photo",
      "OEM parts list / cross-reference",
      "Seal arrangement drawing",
    ],
  },
  repair_service: {
    title: "Repair Documentation",
    examples: [
      "Inspection report / condition assessment",
      "Photos of damaged components",
      "Vibration analysis report",
      "Previous repair history",
    ],
  },
  rental: {
    title: "Site Information",
    examples: [
      "Site layout / pump location",
      "Discharge point photos",
      "Access road conditions",
      "Power supply details",
    ],
  },
};

export default function PumpDatasheetUpload({
  datasheets,
  onAddDatasheet,
  onRemoveDatasheet,
  maxDatasheets = 5,
  maxFileSizeMB = 25,
  serviceType = "new_pump",
}: PumpDatasheetUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  const helpInfo = SERVICE_TYPE_HELP[serviceType] || SERVICE_TYPE_HELP.new_pump;

  const validateAndAddFile = useCallback(
    (file: File) => {
      setError(null);

      if (datasheets.length >= maxDatasheets) {
        setError(`Maximum ${maxDatasheets} documents allowed`);
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

      if (!ACCEPTED_FILE_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
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

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(validateAndAddFile);
      e.target.value = "";
    },
    [validateAndAddFile],
  );

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{helpInfo.title}</h4>
        <span className="text-xs text-gray-500">
          {datasheets.length}/{maxDatasheets} files
        </span>
      </div>

      <div className="mb-3 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-700 font-medium mb-1">Suggested documents:</p>
        <ul className="text-xs text-blue-600 list-disc list-inside">
          {helpInfo.examples.map((example, i) => (
            <li key={i}>{example}</li>
          ))}
        </ul>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          type="file"
          onChange={handleFileInput}
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          id="pump-datasheet-input"
        />
        <label htmlFor="pump-datasheet-input" className="cursor-pointer">
          <div className="flex flex-col items-center">
            <svg
              className="w-10 h-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm text-gray-600">
              Drag & drop files here, or{" "}
              <span className="text-blue-600 hover:underline">browse</span>
            </span>
            <span className="text-xs text-gray-400 mt-1">
              PDF or images up to {maxFileSizeMB}MB each
            </span>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {datasheets.length > 0 && (
        <div className="mt-4 space-y-2">
          {datasheets.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(doc.file.type)}
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {doc.file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveDatasheet(doc.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
