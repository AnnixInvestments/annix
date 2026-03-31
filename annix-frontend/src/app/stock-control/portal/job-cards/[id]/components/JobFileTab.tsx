"use client";

import { Download, Eye, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import type { JobCardJobFile } from "@/app/lib/api/stock-control-api/types";
import { formatDateZA } from "@/app/lib/datetime";

interface JobFileTabProps {
  jobFiles: JobCardJobFile[];
  stagedFiles: File[];
  isUploading: boolean;
  isDragging: boolean;
  viewingFile: { file: JobCardJobFile; url: string } | null;
  currentUserId: number | null;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onUpload: () => void;
  onDelete: (fileId: number) => void;
  onView: (file: JobCardJobFile) => void;
  onDownload: (file: JobCardJobFile) => void;
  onRemoveStaged: (index: number) => void;
  onCloseViewer: () => void;
}

const FILE_TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  pdf: { bg: "bg-red-100", text: "text-red-700" },
  doc: { bg: "bg-blue-100", text: "text-blue-700" },
  docx: { bg: "bg-blue-100", text: "text-blue-700" },
  xls: { bg: "bg-green-100", text: "text-green-700" },
  xlsx: { bg: "bg-green-100", text: "text-green-700" },
  txt: { bg: "bg-gray-100", text: "text-gray-700" },
  jpg: { bg: "bg-purple-100", text: "text-purple-700" },
  jpeg: { bg: "bg-purple-100", text: "text-purple-700" },
  png: { bg: "bg-purple-100", text: "text-purple-700" },
};

function FileTypeBadge(props: { fileType: string }) {
  const colors = FILE_TYPE_BADGE[props.fileType.toLowerCase()] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colors.bg} ${colors.text}`}
    >
      {props.fileType}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JobFileTab(props: JobFileTabProps) {
  const {
    jobFiles,
    stagedFiles,
    isUploading,
    isDragging,
    viewingFile,
    currentUserId,
    onDrop,
    onDragOver,
    onDragLeave,
    onUpload,
    onDelete,
    onView,
    onDownload,
    onRemoveStaged,
    onCloseViewer,
  } = props;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingFile) {
        onCloseViewer();
      }
    },
    [viewingFile, onCloseViewer],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  return (
    <div className="py-4 space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-teal-400 bg-teal-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-700">Drag and drop files here</p>
        <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, Text, Images</p>
      </div>

      {stagedFiles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-amber-800">
              {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""} ready to upload
            </p>
            <button
              onClick={onUpload}
              disabled={isUploading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1.5" />
                  Upload All
                </>
              )}
            </button>
          </div>
          <div className="space-y-1">
            {stagedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-white rounded px-2 py-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
                </div>
                <button
                  onClick={() => onRemoveStaged(index)}
                  className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {jobFiles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded By
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {jobFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                          {file.aiGeneratedName || file.originalFilename}
                        </p>
                        {file.aiGeneratedName === null && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />
                            <span className="text-[10px] text-amber-600">Analyzing...</span>
                          </div>
                        )}
                        {file.aiGeneratedName && file.aiGeneratedName !== file.originalFilename && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[300px]">
                            {file.originalFilename}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <FileTypeBadge fileType={file.fileType} />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{file.uploadedByName || "-"}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {formatDateZA(file.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(file)}
                        className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDownload(file)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {(currentUserId === null || file.uploadedById === currentUserId) && (
                        <button
                          onClick={() => onDelete(file.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jobFiles.length === 0 && stagedFiles.length === 0 && (
        <div className="text-center py-8">
          <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No job files uploaded yet</p>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={onCloseViewer}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate pr-8">
                  {viewingFile.file.aiGeneratedName || viewingFile.file.originalFilename}
                </h3>
                <button
                  onClick={onCloseViewer}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {viewingFile.file.mimeType === "application/pdf" && (
                <iframe
                  src={viewingFile.url}
                  className="w-full rounded border border-gray-200"
                  style={{ height: "70vh" }}
                  title={viewingFile.file.originalFilename}
                />
              )}

              {viewingFile.file.mimeType.startsWith("image/") && (
                <img
                  src={viewingFile.url}
                  alt={viewingFile.file.originalFilename}
                  className="w-full rounded"
                />
              )}

              {!viewingFile.file.mimeType.startsWith("image/") &&
                viewingFile.file.mimeType !== "application/pdf" && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 mb-4">
                      Preview not available for this file type
                    </p>
                    <button
                      onClick={() => onDownload(viewingFile.file)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
