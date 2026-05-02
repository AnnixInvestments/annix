"use client";

import { useRef, useState } from "react";
import type { IndividualDocumentKind } from "@/app/lib/api/cvAssistantApi";
import { useCvUploadMyDocument } from "@/app/lib/query/hooks";

const ACCEPT_ATTR = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_BYTES = 10 * 1024 * 1024;

const KIND_LABELS: Record<IndividualDocumentKind, string> = {
  cv: "CV",
  qualification: "qualification",
  certificate: "certificate",
};

export interface IndividualDocumentUploaderProps {
  kind: IndividualDocumentKind;
  ctaLabel?: string;
  helperText?: string;
  onUploaded?: () => void;
}

export function IndividualDocumentUploader(props: IndividualDocumentUploaderProps) {
  const kind = props.kind;
  const propsCtaLabel = props.ctaLabel;
  const propsHelperText = props.helperText;
  const ctaLabel = propsCtaLabel ? propsCtaLabel : `Upload ${KIND_LABELS[kind]}`;
  const helperText = propsHelperText
    ? propsHelperText
    : "PDF, Word, Excel, or PowerPoint, up to 10 MB.";
  const onUploaded = props.onUploaded;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useCvUploadMyDocument();
  const isUploading = uploadMutation.isPending;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      return "Unsupported file type. Please upload PDF, Word, Excel, or PowerPoint.";
    }
    if (file.size > MAX_BYTES) {
      return "File is too large. Maximum size is 10 MB.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    uploadMutation.mutate(
      { file, kind },
      {
        onSuccess: () => {
          if (onUploaded) onUploaded();
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Upload failed";
          setError(message);
        },
      },
    );
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-violet-500 bg-violet-50"
            : "border-gray-300 bg-white hover:border-violet-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
          id={`uploader-${kind}`}
        />
        <label
          htmlFor={`uploader-${kind}`}
          className={`inline-flex items-center justify-center bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? "Uploading..." : ctaLabel}
        </label>
        <p className="text-xs text-gray-500 mt-3">{helperText}</p>
        <p className="text-xs text-gray-400 mt-1">or drag and drop a file here</p>
      </div>
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
