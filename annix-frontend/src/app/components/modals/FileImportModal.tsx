"use client";

import { Loader2, Upload, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onFilesSelected?: (files: File[]) => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  children?: ReactNode;
  maxWidth?: string;
  hideDropzone?: boolean;
  hideFooter?: boolean;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  files?: File[];
  onRemoveFile?: (index: number) => void;
  isDragging?: boolean;
  dragProps?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  dropzoneLabel?: string;
  dropzoneSubLabel?: string;
  dropzoneHint?: string;
}

export function FileImportModal(props: FileImportModalProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const title = props.title;
  const propsAccept = props.accept;
  const accept = propsAccept ? propsAccept : "*";
  const multiple = props.multiple !== false;
  const propsSubmitLabel = props.submitLabel;
  const submitLabel = propsSubmitLabel ? propsSubmitLabel : "Import";
  const propsCancelLabel = props.cancelLabel;
  const cancelLabel = propsCancelLabel ? propsCancelLabel : "Cancel";
  const propsLoading = props.loading;
  const loading = propsLoading ? propsLoading : false;
  const propsError = props.error;
  const error = propsError ? propsError : null;
  const propsSubmitDisabled = props.submitDisabled;
  const submitDisabled = propsSubmitDisabled ? propsSubmitDisabled : false;
  const propsMaxWidth = props.maxWidth;
  const maxWidth = propsMaxWidth ? propsMaxWidth : "max-w-4xl";
  const propsHideDropzone = props.hideDropzone;
  const hideDropzone = propsHideDropzone ? propsHideDropzone : false;
  const propsHideFooter = props.hideFooter;
  const hideFooter = propsHideFooter ? propsHideFooter : false;
  const propsFiles = props.files;
  const files = propsFiles ? propsFiles : [];
  const propsIsDragging = props.isDragging;
  const isDragging = propsIsDragging ? propsIsDragging : false;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      if (selected.length > 0 && props.onFilesSelected) {
        props.onFilesSelected(selected);
      }
      e.target.value = "";
    },
    [props.onFilesSelected],
  );

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) return null;

  const propsDropzoneLabel = props.dropzoneLabel;
  const dropzoneLabel = propsDropzoneLabel ? propsDropzoneLabel : "Drag & drop files here";
  const propsDropzoneSubLabel = props.dropzoneSubLabel;
  const dropzoneSubLabel = propsDropzoneSubLabel ? propsDropzoneSubLabel : "or click to browse";
  const propsDropzoneHint = props.dropzoneHint;
  const dropzoneHint = propsDropzoneHint ? propsDropzoneHint : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {!hideDropzone && (
            <div className="mb-4">
              <div
                onClick={handleDropzoneClick}
                {...(() => {
                  const dp = props.dragProps;
                  return dp ? dp : {};
                })()}
                className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Upload
                    className={`w-12 h-12 mb-3 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
                  />
                  <p className="text-sm font-medium text-gray-700">
                    {isDragging ? "Drop files here" : dropzoneLabel}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{dropzoneSubLabel}</p>
                  {dropzoneHint && <p className="text-xs text-gray-400 mt-2">{dropzoneHint}</p>}
                </div>
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-blue-600 font-medium">Drop files here</div>
                  </div>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Selected Files ({files.length})
                  </h4>
                  <ul className="divide-y divide-gray-200 border rounded-md">
                    {files.map((file, index) => {
                      const fileName = file.name;
                      const fileExt = fileName.split(".").pop()?.toUpperCase() || "";
                      const fileSize = (file.size / 1024).toFixed(1);
                      return (
                        <li key={index} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                              {fileExt}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{fileName}</p>
                              <p className="text-xs text-gray-500">{fileSize} KB</p>
                            </div>
                          </div>
                          {props.onRemoveFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                props.onRemoveFile?.(index);
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {props.children}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        )}

        {!hideFooter && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
            <div>{props.footerLeft}</div>
            <div className="flex gap-3">
              {(() => {
                const footerRight = props.footerRight;
                if (footerRight) return footerRight;
                return (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {cancelLabel}
                    </button>
                    {props.onSubmit && (
                      <button
                        onClick={props.onSubmit}
                        disabled={submitDisabled || loading}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          submitLabel
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
