"use client";

import { Download, FileText, FolderOpen, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useComplySaDocuments,
  useComplySaRequirements,
  useDeleteDocument,
  useUploadDocument,
} from "@/app/lib/query/hooks";

type Document = {
  id: string;
  name: string;
  requirementId: string | null;
  requirementName: string | null;
  uploadedAt: string;
  size: number;
  url: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ITEMS_PER_PAGE = 20;

export default function DocumentsPage() {
  const { data: docs, isLoading: docsLoading, error: docsError } = useComplySaDocuments();
  const { data: reqs, isLoading: reqsLoading } = useComplySaRequirements();
  const { showToast } = useToast();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const [filterReqId, setFilterReqId] = useState<string>("all");
  const [dragOver, setDragOver] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = docsLoading || reqsLoading;

  function handleUpload(file: File) {
    const reqId = filterReqId !== "all" ? filterReqId : undefined;
    uploadMutation.mutate(
      { file, requirementId: reqId },
      {
        onSuccess: () => showToast("Document uploaded successfully", "success"),
        onError: (error) => showToast(error.message || "Failed to upload document", "error"),
      },
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => showToast("Document deleted", "success"),
      onError: (error) => showToast(error.message || "Failed to delete document", "error"),
    });
  }

  const docsList = docs ?? [];
  const reqsList = reqs ?? [];
  const filteredDocs =
    filterReqId === "all"
      ? docsList
      : docsList.filter((d: Document) => d.requirementId === filterReqId);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-700 rounded-xl" />
        <div className="h-8 bg-slate-700 rounded w-48" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-14 bg-slate-700 rounded-xl" />
        ))}
      </div>
    );
  }

  const error = docsError ?? uploadMutation.error ?? deleteMutation.error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Document Vault</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error.message}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? "border-teal-500 bg-teal-500/5" : "border-slate-600 hover:border-slate-500"
        }`}
      >
        <Upload
          className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-teal-400" : "text-slate-500"}`}
        />
        <p className="text-sm text-slate-400 mb-3">
          {uploadMutation.isPending
            ? "Uploading..."
            : "Drag and drop a file here, or click to browse"}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Choose File
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      </div>

      <div className="flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <select
          value={filterReqId}
          onChange={(e) => {
            setFilterReqId(e.target.value);
            setVisibleCount(ITEMS_PER_PAGE);
          }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All requirements</option>
          {reqsList.map((req: { id: string; name: string }) => (
            <option key={req.id} value={req.id}>
              {req.name}
            </option>
          ))}
        </select>
      </div>

      {filteredDocs.length > 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-4 py-3 font-medium text-slate-400">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-400 hidden sm:table-cell">
                    Requirement
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 hidden md:table-cell">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 hidden md:table-cell">
                    Size
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredDocs.slice(0, visibleCount).map((doc: Document) => (
                  <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-white truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                      {doc.requirementName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {formatDateZA(doc.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.url}
                          download
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleCount < filteredDocs.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              className="w-full py-3 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Show more ({filteredDocs.length - visibleCount} remaining)
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No documents uploaded yet</p>
          <p className="text-slate-500 text-xs mt-1">
            Upload your compliance documents to keep them organized
          </p>
        </div>
      )}
    </div>
  );
}
