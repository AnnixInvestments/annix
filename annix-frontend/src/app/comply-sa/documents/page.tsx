"use client";

import { isArray } from "es-toolkit/compat";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import type { GovernmentDocumentCategory } from "@/app/lib/query/hooks";
import {
  useComplySaDocuments,
  useComplySaRequirements,
  useDeleteDocument,
  useGovernmentDocuments,
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

const CATEGORY_COLORS: Record<string, string> = {
  company: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  ip: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  tax: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  labour: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  bbbee: "text-green-400 border-green-500/30 bg-green-500/10",
  consumer: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  ohs: "text-red-400 border-red-500/30 bg-red-500/10",
  privacy: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  financial: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
};

function categoryColor(key: string): string {
  const color = CATEGORY_COLORS[key];
  return color || "text-slate-400 border-slate-500/30 bg-slate-500/10";
}

function CategoryAccordion(props: {
  category: GovernmentDocumentCategory;
  expanded: boolean;
  onToggle: () => void;
}) {
  const category = props.category;
  const expanded = props.expanded;
  const onToggle = props.onToggle;
  const deptUrl = category.departmentUrl;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColor(category.key)}`}
          >
            {category.label}
          </span>
          <span className="text-sm text-slate-400">{category.documents.length} documents</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-700">
          {category.department && (
            <div className="px-5 py-3 bg-slate-700/20">
              <a
                href={deptUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                <Globe className="h-3 w-3" />
                {category.department}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          <div className="divide-y divide-slate-700">
            {category.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors group"
              >
                <FileText className="h-4 w-4 text-slate-500 group-hover:text-teal-400 mt-0.5 shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white group-hover:text-teal-300 transition-colors">
                    {doc.name}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{doc.description}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-teal-400 mt-0.5 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GovernmentDocumentsTab() {
  const { data: categories, isLoading, error } = useGovernmentDocuments();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    const allExpanded = (categories || []).reduce(
      (acc, cat) => ({ ...acc, [cat.key]: true }),
      {} as Record<string, boolean>,
    );
    setExpandedCategories(allExpanded);
  }

  function collapseAll() {
    setExpandedCategories({});
  }

  const allExpanded =
    (categories || []).length > 0 && (categories || []).every((cat) => expandedCategories[cat.key]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
        <span className="ml-2 text-slate-400 text-sm">Loading government documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="https://www.gov.za/documents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            <Globe className="h-4 w-4" />
            SA Gov Documents
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="https://www.gov.za/documents/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Latest Updates
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="https://www.gpwonline.co.za/egazettes/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Government Gazette
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {(categories || []).map((category) => {
        const expandedLookup = expandedCategories[category.key];
        const isExpanded = expandedLookup || false;
        return (
          <CategoryAccordion
            key={category.key}
            category={category}
            expanded={isExpanded}
            onToggle={() => toggleCategory(category.key)}
          />
        );
      })}
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

type DocumentsTab = "vault" | "government";

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<DocumentsTab>("vault");
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
        onError: (error) => {
          const errMsg = error.message;
          showToast(errMsg || "Failed to upload document", "error");
        },
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
      onError: (error) => {
        const errMsg = error.message;
        showToast(errMsg || "Failed to delete document", "error");
      },
    });
  }

  const docsList = isArray(docs) ? docs : [];
  const reqsList = isArray(reqs) ? reqs : [];
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
      <h1 className="text-2xl font-bold text-white">Documents</h1>

      <div className="border-b border-slate-700">
        <div className="flex -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "vault"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            Document Vault
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("government")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === "government"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            Government Compliance Documents
          </button>
        </div>
      </div>

      {activeTab === "government" ? (
        <GovernmentDocumentsTab />
      ) : (
        <div className="space-y-6">
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
                    {filteredDocs.slice(0, visibleCount).map((doc: Document) => {
                      const reqName = doc.requirementName;
                      return (
                        <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-white truncate max-w-[200px]">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                            {reqName || "-"}
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
                      );
                    })}
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
      )}
    </div>
  );
}
