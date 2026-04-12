"use client";

import { useCallback, useState } from "react";

interface UseFileUploadOptions {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
}

interface UseFileUploadReturn {
  files: File[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  isDragging: boolean;
  dragProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

function validateFileType(file: File, acceptFilter: string): boolean {
  const acceptedTypes = acceptFilter.split(",").map((t) => t.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const ext = `.${fileName.split(".").pop()}`;
  const mimeType = file.type.toLowerCase();

  return acceptedTypes.some(
    (acceptType) =>
      acceptType === ext ||
      acceptType === mimeType ||
      (acceptType.endsWith("/*") && mimeType.startsWith(acceptType.slice(0, -1))),
  );
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const optAccept = options.accept;
  const accept = optAccept ? optAccept : "*";
  const multiple = options.multiple !== false;
  const optMaxSize = options.maxSizeMb;
  const maxSizeMb = optMaxSize ? optMaxSize : 0;

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setError(null);

      const filtered =
        accept === "*" ? newFiles : newFiles.filter((f) => validateFileType(f, accept));
      if (filtered.length === 0 && newFiles.length > 0) {
        setError("No valid files selected. Check the accepted file types.");
        return;
      }

      if (maxSizeMb > 0) {
        const maxBytes = maxSizeMb * 1024 * 1024;
        const oversized = filtered.find((f) => f.size > maxBytes);
        if (oversized) {
          const name = oversized.name;
          setError(`File "${name}" exceeds the ${maxSizeMb}MB size limit.`);
          return;
        }
      }

      if (multiple) {
        setFiles((prev) => [...prev, ...filtered]);
      } else {
        setFiles([filtered[0]]);
      }
    },
    [accept, multiple, maxSizeMb],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

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

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles],
  );

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    error,
    setError,
    isDragging,
    dragProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
