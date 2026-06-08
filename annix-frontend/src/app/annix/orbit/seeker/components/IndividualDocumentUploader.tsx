"use client";

import { useRef, useState } from "react";
import type { IndividualDocumentKind } from "@/app/lib/api/annixOrbitApi";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import { useOrbitUploadMyDocument } from "@/app/lib/query/hooks";

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
const ACCEPTED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);
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
  highlight?: boolean;
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
  const highlight = props.highlight === true;
  const buttonPalette = highlight
    ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
    : "bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]";
  const idleDropzone = highlight
    ? "border-[var(--brand-accent,#FF8A00)] bg-[rgba(255,138,0,0.06)] hover:border-[var(--brand-accent-light,#FF9C33)]"
    : "border-gray-300 bg-white hover:border-[var(--brand-navbar-400,#7373c2)]";

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const uploadMutation = useOrbitUploadMyDocument();
  const isUploading = uploadMutation.isPending;

  const validateFile = (file: File): string | null => {
    // Convenience check only. file.type is frequently empty (drag-drop, some
    // browsers/OSes) and is trivially spoofable, so we accept on either a known
    // extension or a known MIME and let the server be the source of truth — it
    // re-validates the content type and size on upload (see
    // individual-profile.service.ts). Never treat this as a security boundary.
    const lowerName = file.name.toLowerCase();
    const dotIndex = lowerName.lastIndexOf(".");
    const extension = dotIndex >= 0 ? lowerName.slice(dotIndex) : "";
    const extensionOk = ACCEPTED_EXTENSIONS.has(extension);
    const mimeOk = file.type !== "" && ACCEPTED_MIME_TYPES.has(file.type);
    if (!extensionOk && !mimeOk) {
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
    setProgress(0);
    uploadMutation.mutate(
      { file, kind, onProgress: (fraction) => setProgress(fraction) },
      {
        onSuccess: () => {
          setProgress(null);
          if (onUploaded) onUploaded();
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (err) => {
          setProgress(null);
          setError(
            extractErrorMessage(err, "Upload failed — please check the file and try again."),
          );
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
    const files = event.dataTransfer.files;
    if (files.length > 1) {
      setError("Please drop one file at a time.");
      return;
    }
    const file = files.length > 0 ? files[0] : null;
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
            ? "border-[var(--brand-navbar,#323288)] bg-[var(--brand-navbar-50,#f0f0fc)]"
            : idleDropzone
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
          className={`inline-flex items-center justify-center ${buttonPalette} px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? "Uploading..." : ctaLabel}
        </label>
        <p className="text-xs text-gray-500 mt-3">{helperText}</p>
        <p className="text-xs text-gray-400 mt-1">or drag and drop a file here</p>
        <p className="text-xs text-gray-400 mt-2">
          Your file's type and size are verified on our servers after upload.
        </p>
      </div>
      {isUploading && progress !== null ? (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand-navbar,#323288)] transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Uploading… {Math.round(progress * 100)}%</p>
        </div>
      ) : null}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
