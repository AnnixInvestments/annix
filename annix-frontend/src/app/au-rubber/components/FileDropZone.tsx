"use client";

import { Upload } from "lucide-react";
import { useCallback, useState, type DragEvent, type ReactNode } from "react";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export function FileDropZone({
  onFilesSelected,
  accept = ".pdf,application/pdf",
  multiple = true,
  disabled = false,
  children,
  className = "",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer.files);
      const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());

      const validFiles = droppedFiles.filter((file) => {
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        const mimeType = file.type.toLowerCase();
        return acceptedTypes.some(
          (acceptType) =>
            acceptType === fileExtension ||
            acceptType === mimeType ||
            (acceptType.endsWith("/*") && mimeType.startsWith(acceptType.slice(0, -1))),
        );
      });

      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [accept, disabled, multiple, onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
      if (selectedFiles.length > 0) {
        onFilesSelected(multiple ? selectedFiles : [selectedFiles[0]]);
      }
      e.target.value = "";
    },
    [multiple, onFilesSelected],
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative transition-all duration-200 ${
        isDragging
          ? "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200"
          : "border-gray-300 hover:border-gray-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      {children ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Upload
            className={`w-12 h-12 mb-3 ${isDragging ? "text-yellow-500" : "text-gray-400"}`}
          />
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-xs text-gray-500 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">PDF files only</p>
        </div>
      )}
      {isDragging && (
        <div className="absolute inset-0 bg-yellow-100 bg-opacity-50 border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-yellow-600 font-medium">Drop files here</div>
        </div>
      )}
    </div>
  );
}
