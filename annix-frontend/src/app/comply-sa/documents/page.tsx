"use client";

import { Download, FileText, FolderOpen, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  documents as fetchDocuments,
  requirements as fetchRequirements,
  uploadDocument,
} from "@/app/comply-sa/lib/api";

type Document = {
  id: string;
  name: string;
  requirementId: string | null;
  requirementName: string | null;
  uploadedAt: string;
  size: number;
  url: string;
};

type Requirement = {
  id: string;
  name: string;
  category: string;
  description: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterReqId, setFilterReqId] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [docsResult, reqsResult] = await Promise.all([fetchDocuments(), fetchRequirements()]);
      setDocs(docsResult);
      setReqs(reqsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const reqId = filterReqId !== "all" ? filterReqId : undefined;
      await uploadDocument(file, reqId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      setDocs(docs.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const filteredDocs =
    filterReqId === "all" ? docs : docs.filter((d) => d.requirementId === filterReqId);

  if (loading) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Document Vault</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
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
          {uploading ? "Uploading..." : "Drag and drop a file here, or click to browse"}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
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
          onChange={(e) => setFilterReqId(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All requirements</option>
          {reqs.map((req) => (
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
                {filteredDocs.map((doc) => (
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
                      {new Date(doc.uploadedAt).toLocaleDateString("en-ZA")}
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
