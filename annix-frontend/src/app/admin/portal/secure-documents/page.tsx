"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  adminApiClient,
  type LocalDocumentWithContent,
  type SecureDocument,
  type SecureDocumentWithContent,
} from "@/app/lib/api/adminApi";
import { formatDateZA, fromISO, nowMillis } from "@/app/lib/datetime";
import {
  useCreateSecureDocument,
  useDeleteSecureDocument,
  useLocalDocumentsList,
  useSecureDocumentsList,
  useUpdateSecureDocument,
} from "@/app/lib/query/hooks";
import { adminKeys } from "@/app/lib/query/keys";
import SecureDocumentEditor, { EditorPaneMode, EditorState } from "./SecureDocumentEditor";
import SecureDocumentViewer from "./SecureDocumentViewer";

type ViewMode = "list" | "view" | "edit" | "create";
type UrlMode = "view" | "edit";
type DocumentType = "secure" | "local";

interface UnifiedDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  updatedAt: string;
  type: DocumentType;
  author?: string;
  filePath?: string;
  folder?: string | null;
}

interface ImportedFile {
  title: string;
  description: string;
  content: string;
}

interface FileError {
  filename: string;
  message: string;
}

interface ImportResult {
  successful: string[];
  failed: { filename: string; error: string }[];
}

interface UploadingFile {
  id: string;
  file: File;
  title: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  documentSlug?: string;
  processWithNix: boolean;
}

interface NixUploadResult {
  fileName: string;
  success: boolean;
  documentSlug?: string;
  documentPath?: string;
  error?: string;
}

function fileTypeIcon(filename: string): { color: string; label: string } {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, { color: string; label: string }> = {
    pdf: { color: "text-red-500", label: "PDF" },
    xlsx: { color: "text-green-600", label: "XLS" },
    xls: { color: "text-green-600", label: "XLS" },
    doc: { color: "text-blue-600", label: "DOC" },
    docx: { color: "text-blue-600", label: "DOC" },
    txt: { color: "text-gray-500", label: "TXT" },
    md: { color: "text-purple-500", label: "MD" },
    csv: { color: "text-green-500", label: "CSV" },
  };
  return icons[ext] || { color: "text-gray-400", label: ext.toUpperCase() || "FILE" };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || lowerName.endsWith(".txt");
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["pdf", "xlsx", "xls", "doc", "docx", "csv"].includes(ext);
}

function isSupportedFile(filename: string): boolean {
  return isTextFile(filename) || isBinaryFile(filename);
}

function authorDisplay(doc: SecureDocument): string {
  if (!doc.createdBy) return "-";
  const { firstName, lastName, username, email } = doc.createdBy;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  if (username) return username;
  if (email) return email;
  return "-";
}

function extractDescription(content: string): string {
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("---")) continue;
    if (trimmed.startsWith("```")) continue;
    if (trimmed.startsWith(">")) {
      return trimmed
        .replace(/^>\s*\*?\*?/, "")
        .replace(/\*?\*?\s*$/, "")
        .slice(0, 150);
    }
    if (trimmed.length > 10) {
      return trimmed.slice(0, 150);
    }
  }

  return "";
}

export default function SecureDocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const secureDocsQuery = useSecureDocumentsList();
  const localDocsQuery = useLocalDocumentsList();
  const createMutation = useCreateSecureDocument();
  const updateMutation = useUpdateSecureDocument();
  const deleteMutation = useDeleteSecureDocument();

  const documents = secureDocsQuery.data ?? [];
  const localDocuments = localDocsQuery.data ?? [];

  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDocument, setSelectedDocument] = useState<SecureDocumentWithContent | null>(null);
  const [selectedLocalDocument, setSelectedLocalDocument] =
    useState<LocalDocumentWithContent | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null);
  const [fileError, setFileError] = useState<FileError | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [nixUploadResult, setNixUploadResult] = useState<NixUploadResult | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [pendingBinaryFiles, setPendingBinaryFiles] = useState<File[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [editorPaneMode, setEditorPaneMode] = useState<EditorPaneMode>("live");
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [sortColumn, setSortColumn] = useState<"title" | "description" | "author" | "updatedAt">(
    "updatedAt",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNavigatingBack = useRef(false);
  const failedDocSlug = useRef<string | null>(null);

  const updateExpandedUrl = (expanded: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (expanded.size > 0) {
      params.set("expanded", Array.from(expanded).join(","));
    } else {
      params.delete("expanded");
    }
    const queryString = params.toString();
    const url = queryString
      ? `/admin/portal/secure-documents?${queryString}`
      : "/admin/portal/secure-documents";
    router.replace(url, { scroll: false });
  };

  const toggleFolder = (folder: string) => {
    const newCollapsed = new Set(collapsedFolders);
    if (newCollapsed.has(folder)) {
      newCollapsed.delete(folder);
    } else {
      newCollapsed.add(folder);
    }
    setCollapsedFolders(newCollapsed);

    const allFolders = [
      ...sortedSecureFolders.filter((f) => f !== "."),
      ...sortedLocalFolders.map((f) => `local:${f}`),
    ];
    const expandedFolders = new Set(allFolders.filter((f) => !newCollapsed.has(f)));
    updateExpandedUrl(expandedFolders);
  };

  const handleSort = (column: "title" | "description" | "author" | "updatedAt") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const unifiedDocuments: UnifiedDocument[] = [
    ...documents.map(
      (doc): UnifiedDocument => ({
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        updatedAt: doc.updatedAt,
        type: "secure",
        author: authorDisplay(doc),
        folder: doc.folder,
      }),
    ),
    ...localDocuments.map(
      (doc): UnifiedDocument => ({
        id: doc.slug,
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        updatedAt: doc.updatedAt,
        type: "local",
        author: "Codebase",
        filePath: doc.filePath,
      }),
    ),
  ].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    if (sortColumn === "updatedAt") {
      return direction * (fromISO(a.updatedAt).toMillis() - fromISO(b.updatedAt).toMillis());
    } else if (sortColumn === "title") {
      return direction * (a.title || "").localeCompare(b.title || "");
    } else if (sortColumn === "description") {
      return direction * (a.description || "").localeCompare(b.description || "");
    } else if (sortColumn === "author") {
      return direction * (a.author || "").localeCompare(b.author || "");
    }
    return 0;
  });

  const secureDocuments = unifiedDocuments.filter((d) => d.type === "secure");
  const localDocs = unifiedDocuments.filter((d) => d.type === "local");

  const secureDocsByFolder = secureDocuments.reduce(
    (acc, doc) => {
      const folder = doc.folder || ".";
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(doc);
      return acc;
    },
    {} as Record<string, UnifiedDocument[]>,
  );

  const sortedSecureFolders = Object.keys(secureDocsByFolder).sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });

  const localDocsByFolder = localDocs.reduce(
    (acc, doc) => {
      const folder = doc.filePath ? doc.filePath.split("/").slice(0, -1).join("/") || "." : ".";
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(doc);
      return acc;
    },
    {} as Record<string, UnifiedDocument[]>,
  );

  const sortedLocalFolders = Object.keys(localDocsByFolder).sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });

  const allSelected = secureDocuments.length > 0 && selectedIds.size === secureDocuments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < secureDocuments.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(secureDocuments.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const ids = Array.from(selectedIds);
      let successCount = 0;
      let failCount = 0;

      for (const id of ids) {
        try {
          await adminApiClient.deleteSecureDocument(id);
          successCount++;
        } catch {
          failCount++;
        }
      }

      setShowBulkDeleteConfirm(false);
      setSelectedIds(new Set());

      if (failCount === 0) {
        setActionMessage({
          type: "success",
          text: `${successCount} document${successCount !== 1 ? "s" : ""} deleted successfully`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: `Deleted ${successCount}, failed to delete ${failCount} document${failCount !== 1 ? "s" : ""}`,
        });
      }

      invalidateDocumentList();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete documents";
      setShowBulkDeleteConfirm(false);
      setActionMessage({ type: "error", text: message });
    } finally {
      setIsDeleting(false);
    }
  };

  const invalidateDocumentList = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.secureDocuments.all });
  };

  useEffect(() => {
    const expandedParam = searchParams.get("expanded");
    const expandedFromUrl = expandedParam ? new Set(expandedParam.split(",")) : new Set<string>();

    const allFolders = [
      ...sortedSecureFolders.filter((f) => f !== "."),
      ...sortedLocalFolders.map((f) => `local:${f}`),
    ];
    const collapsed = allFolders.filter((f) => !expandedFromUrl.has(f));
    setCollapsedFolders(new Set(collapsed));
  }, [documents, localDocuments, searchParams]);

  useEffect(() => {
    const docSlug = searchParams.get("doc");
    const urlMode = searchParams.get("mode") as UrlMode | null;
    const urlPane = searchParams.get("pane") as EditorPaneMode | null;
    const urlFullscreen = searchParams.get("fullscreen");

    if (!docSlug) {
      isNavigatingBack.current = false;
      return;
    }

    if (isNavigatingBack.current) {
      return;
    }

    if (urlPane && ["edit", "live", "preview"].includes(urlPane)) {
      setEditorPaneMode(urlPane);
    }

    if (urlFullscreen === "true") {
      setEditorFullscreen(true);
    } else if (urlFullscreen === "false") {
      setEditorFullscreen(false);
    }

    if (
      !selectedDocument &&
      !selectedLocalDocument &&
      !isLoadingDocument &&
      !secureDocsQuery.isLoading &&
      failedDocSlug.current !== docSlug
    ) {
      const targetMode = urlMode === "edit" ? "edit" : "view";
      handleViewDocumentBySlug(docSlug, targetMode);
    }
  }, [
    searchParams,
    selectedDocument,
    selectedLocalDocument,
    isLoadingDocument,
    secureDocsQuery.isLoading,
    localDocuments,
  ]);

  const updateUrl = (
    slug: string | null,
    mode?: UrlMode,
    pane?: EditorPaneMode,
    fullscreen?: boolean,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("doc", slug);
    } else {
      params.delete("doc");
    }
    if (mode) {
      params.set("mode", mode);
    } else {
      params.delete("mode");
    }
    if (pane) {
      params.set("pane", pane);
    } else {
      params.delete("pane");
    }
    if (fullscreen !== undefined) {
      params.set("fullscreen", String(fullscreen));
    } else {
      params.delete("fullscreen");
    }
    const queryString = params.toString();
    const url = queryString
      ? `/admin/portal/secure-documents?${queryString}`
      : "/admin/portal/secure-documents";
    router.push(url, { scroll: false });
  };

  const handleEditorStateChange = (state: EditorState) => {
    if (state.paneMode !== undefined) {
      setEditorPaneMode(state.paneMode);
    }
    if (state.fullscreen !== undefined) {
      setEditorFullscreen(state.fullscreen);
    }
    if (selectedDocument) {
      updateUrl(
        selectedDocument.slug,
        "edit",
        state.paneMode ?? editorPaneMode,
        state.fullscreen ?? editorFullscreen,
      );
    }
  };

  const handleViewDocumentBySlug = async (slug: string, targetMode: ViewMode = "view") => {
    try {
      setIsLoadingDocument(true);
      setActionMessage(null);

      if (slug.startsWith("local:")) {
        const localDoc = localDocuments.find((d) => d.slug === slug);
        if (localDoc) {
          const doc = await adminApiClient.getLocalDocument(localDoc.filePath);
          setSelectedLocalDocument(doc);
          setSelectedDocument(null);
          setViewMode("view");
          failedDocSlug.current = null;
        }
      } else {
        const doc = await adminApiClient.getSecureDocument(slug);
        setSelectedDocument(doc);
        setSelectedLocalDocument(null);
        setViewMode(targetMode);
        failedDocSlug.current = null;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setActionMessage({ type: "error", text: message });
      failedDocSlug.current = slug;
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleViewDocument = async (id: string, slug: string) => {
    try {
      setIsLoadingDocument(true);
      setActionMessage(null);
      const doc = await adminApiClient.getSecureDocument(id);
      setSelectedDocument(doc);
      setSelectedLocalDocument(null);
      setViewMode("view");
      updateUrl(slug, "view");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setActionMessage({ type: "error", text: message });
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleViewLocalDocument = async (doc: UnifiedDocument) => {
    if (!doc.filePath) return;
    try {
      setIsLoadingDocument(true);
      setActionMessage(null);
      const localDoc = await adminApiClient.getLocalDocument(doc.filePath);
      setSelectedLocalDocument(localDoc);
      setSelectedDocument(null);
      setViewMode("view");
      updateUrl(doc.slug, "view");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setActionMessage({ type: "error", text: message });
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleUnifiedDocumentClick = (doc: UnifiedDocument) => {
    if (doc.type === "local") {
      handleViewLocalDocument(doc);
    } else {
      handleViewDocument(doc.id, doc.slug);
    }
  };

  const handleEditDocument = async (id: string, slug: string) => {
    try {
      setIsLoadingDocument(true);
      setActionMessage(null);
      const doc = await adminApiClient.getSecureDocument(id);
      setSelectedDocument(doc);
      setViewMode("edit");
      updateUrl(slug, "edit", editorPaneMode, editorFullscreen);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setActionMessage({ type: "error", text: message });
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedDocument(null);
    setActionMessage(null);
    setViewMode("create");
  };

  const handleSave = async (data: {
    title: string;
    description: string;
    content: string;
    folder?: string;
  }): Promise<boolean> => {
    try {
      let message: string;
      if (viewMode === "create") {
        const created = await createMutation.mutateAsync(data);
        message = "Document created successfully";
        const doc = await adminApiClient.getSecureDocument(created.id);
        setSelectedDocument(doc);
        setViewMode("edit");
        updateUrl(doc.slug, "edit", editorPaneMode, editorFullscreen);
      } else if (selectedDocument) {
        await updateMutation.mutateAsync({ id: selectedDocument.id, dto: data });
        message = "Document saved";
        const doc = await adminApiClient.getSecureDocument(selectedDocument.id);
        setSelectedDocument(doc);
      } else {
        return false;
      }
      setActionMessage({ type: "success", text: message });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save document";
      setActionMessage({ type: "error", text: message });
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteMutation.mutateAsync(id);
      setShowDeleteConfirm(null);
      setActionMessage({ type: "success", text: "Document deleted successfully" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete document";
      setShowDeleteConfirm(null);
      setActionMessage({ type: "error", text: message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    isNavigatingBack.current = true;
    setSelectedDocument(null);
    setSelectedLocalDocument(null);
    setImportedFile(null);
    setFileError(null);
    setActionMessage(null);
    setViewMode("list");
    router.replace("/admin/portal/secure-documents");
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const uploadNixFile = useCallback(async (uploadingFile: UploadingFile) => {
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === uploadingFile.id ? { ...f, status: "uploading", progress: 10 } : f,
      ),
    );

    try {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === uploadingFile.id ? { ...f, progress: 50 } : f)),
      );

      const result = await adminApiClient.uploadNixDocument(
        uploadingFile.file,
        uploadingFile.title || undefined,
        undefined,
        uploadingFile.processWithNix,
      );

      if (result.success) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id
              ? { ...f, status: "success", progress: 100, documentSlug: result.documentSlug }
              : f,
          ),
        );
        const folder = uploadingFile.processWithNix ? "Nix" : "Attachments";
        const documentPath = result.documentSlug
          ? `Secure Documents / ${folder} / ${result.documentSlug}`
          : null;
        setNixUploadResult({
          fileName: uploadingFile.file.name,
          success: true,
          documentSlug: result.documentSlug,
          documentPath: documentPath || undefined,
        });
        invalidateDocumentList();
      } else {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id
              ? { ...f, status: "error", error: result.error || "Upload failed" }
              : f,
          ),
        );
        setNixUploadResult({
          fileName: uploadingFile.file.name,
          success: false,
          error: result.error || "Upload failed",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id ? { ...f, status: "error", error: message } : f,
        ),
      );
      setNixUploadResult({
        fileName: uploadingFile.file.name,
        success: false,
        error: message,
      });
    }
  }, []);

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const viewNixDocument = (slug: string) => {
    updateUrl(slug, "view");
    handleViewDocumentBySlug(slug, "view");
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      setFileError(null);
      setImportResult(null);

      const textFiles = files.filter((f) => isTextFile(f.name));
      const binaryFiles = files.filter((f) => isBinaryFile(f.name));
      const unsupportedFiles = files.filter((f) => !isSupportedFile(f.name));

      if (unsupportedFiles.length > 0 && textFiles.length === 0 && binaryFiles.length === 0) {
        const extensions = [
          ...new Set(
            unsupportedFiles.map((f) => f.name.split(".").pop()?.toUpperCase() || "Unknown"),
          ),
        ].join(", ");
        setFileError({
          filename: unsupportedFiles.map((f) => f.name).join(", "),
          message: `${extensions} files are not supported. Supported formats: Markdown (.md), Text (.txt), PDF, Excel (.xlsx, .xls), Word (.doc, .docx), CSV`,
        });
        return;
      }

      if (binaryFiles.length > 0) {
        setPendingBinaryFiles(binaryFiles);
        return;
      }

      if (textFiles.length === 1 && binaryFiles.length === 0 && unsupportedFiles.length === 0) {
        const file = textFiles[0];
        try {
          const content = await readFileAsText(file);
          const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
          const description = extractDescription(content);
          setImportedFile({ title, description, content });
          setViewMode("create");
        } catch {
          setFileError({
            filename: file.name,
            message: "Failed to read file. Please try again.",
          });
        }
        return;
      }

      if (textFiles.length > 1 || (textFiles.length === 1 && binaryFiles.length > 0)) {
        setIsImporting(true);
        const successful: string[] = [];
        const failed: { filename: string; error: string }[] = [];

        if (unsupportedFiles.length > 0) {
          unsupportedFiles.forEach((f) => {
            const ext = f.name.split(".").pop()?.toUpperCase() || "Unknown";
            failed.push({ filename: f.name, error: `${ext} files not supported` });
          });
        }

        for (const file of textFiles) {
          try {
            const content = await readFileAsText(file);
            const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
            const description = extractDescription(content);
            await adminApiClient.createSecureDocument({ title, description, content });
            successful.push(file.name);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            failed.push({ filename: file.name, error: message });
          }
        }

        setIsImporting(false);
        setImportResult({ successful, failed });
        if (successful.length > 0) {
          invalidateDocumentList();
        }
      }
    },
    [uploadNixFile],
  );

  const handleBinaryUploadChoice = async (processWithNix: boolean) => {
    const files = pendingBinaryFiles;
    setPendingBinaryFiles([]);

    const newUploadingFiles: UploadingFile[] = files.map((file) => ({
      id: `${nowMillis()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      status: "pending" as const,
      progress: 0,
      processWithNix,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    for (const uploadingFile of newUploadingFiles) {
      await uploadNixFile(uploadingFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(Array.from(files));
      }
    },
    [processFiles],
  );

  if (viewMode === "view" && selectedDocument) {
    return (
      <SecureDocumentViewer
        document={selectedDocument}
        onBack={handleBack}
        onEdit={() => {
          setViewMode("edit");
          updateUrl(selectedDocument.slug, "edit", editorPaneMode, editorFullscreen);
        }}
      />
    );
  }

  if (viewMode === "view" && selectedLocalDocument) {
    return (
      <SecureDocumentViewer
        document={{
          id: selectedLocalDocument.slug,
          slug: selectedLocalDocument.slug,
          title: selectedLocalDocument.title,
          description: selectedLocalDocument.description,
          folder: null,
          storagePath: "",
          fileType: "markdown",
          originalFilename: null,
          attachmentPath: null,
          createdBy: null,
          createdAt: selectedLocalDocument.updatedAt,
          updatedAt: selectedLocalDocument.updatedAt,
          content: selectedLocalDocument.content,
        }}
        onBack={handleBack}
        isReadOnly
      />
    );
  }

  if (viewMode === "edit" || viewMode === "create") {
    const initialData =
      viewMode === "create" && importedFile
        ? {
            title: importedFile.title,
            description: importedFile.description,
            content: importedFile.content,
          }
        : null;
    return (
      <SecureDocumentEditor
        document={viewMode === "edit" ? selectedDocument : null}
        initialData={initialData}
        paneMode={editorPaneMode}
        fullscreen={editorFullscreen}
        onStateChange={handleEditorStateChange}
        onSave={handleSave}
        onBack={handleBack}
      />
    );
  }

  if (secureDocsQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Documents</div>
          <p className="text-gray-600">
            {secureDocsQuery.error instanceof Error
              ? secureDocsQuery.error.message
              : "Failed to fetch documents"}
          </p>
          <button
            onClick={() => secureDocsQuery.refetch()}
            className="mt-4 px-4 py-2 bg-[#323288] text-white rounded-md hover:bg-[#4a4da3]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Secure Documents</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Encrypted markdown documents for sensitive information
          </p>
        </div>
        <div className="absolute right-0 top-0 flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Import File
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Document
          </button>
        </div>
      </div>

      <div
        className={`relative bg-white dark:bg-gray-900 shadow rounded-lg overflow-x-auto transition-colors ${isDragging ? "ring-2 ring-[#323288] ring-offset-2" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[#323288]/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white rounded-lg shadow-lg px-6 py-4 text-center">
              <svg
                className="mx-auto h-12 w-12 text-[#323288]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-[#323288]">Drop file to import</p>
            </div>
          </div>
        )}
        {secureDocsQuery.isLoading || isLoadingDocument ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : unifiedDocuments.length === 0 ? (
          <div
            className={`text-center py-12 px-6 transition-colors ${isDragging ? "bg-[#323288]/5 border-2 border-dashed border-[#323288]" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No documents
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create your first secure document or drag and drop a markdown file
            </p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Import File
              </button>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Document
              </button>
            </div>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="bg-[#323288]/5 border-b border-[#323288]/20 px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#323288]">
                  {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Selected
                </button>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#323288] focus:ring-[#323288]"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1">
                      Title
                      {sortColumn === "title" && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center gap-1">
                      Description
                      {sortColumn === "description" && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    onClick={() => handleSort("author")}
                  >
                    <div className="flex items-center gap-1">
                      Author
                      {sortColumn === "author" && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    onClick={() => handleSort("updatedAt")}
                  >
                    <div className="flex items-center gap-1">
                      Last Updated
                      {sortColumn === "updatedAt" && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedSecureFolders.map((folder) => (
                  <React.Fragment key={`secure-folder-${folder}`}>
                    {folder !== "." && (
                      <tr
                        className="bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer select-none"
                        onClick={() => toggleFolder(folder)}
                      >
                        <td className="w-12 px-4 py-3">
                          <svg
                            className={`w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform ${collapsedFolders.has(folder) ? "" : "rotate-90"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </td>
                        <td colSpan={5} className="px-6 py-3">
                          <div className="flex items-center">
                            <svg
                              className="w-5 h-5 text-purple-500 dark:text-purple-400 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                              {folder}
                            </span>
                            <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                              ({secureDocsByFolder[folder].length} document
                              {secureDocsByFolder[folder].length !== 1 ? "s" : ""})
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(folder === "." || !collapsedFolders.has(folder)) &&
                      secureDocsByFolder[folder].map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => handleUnifiedDocumentClick(doc)}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${selectedIds.has(doc.id) ? "bg-[#323288]/5" : ""} ${folder !== "." ? "bg-purple-50/30 dark:bg-purple-900/20" : ""}`}
                        >
                          <td className="w-12 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(doc.id)}
                              onChange={() => toggleSelect(doc.id)}
                              className="h-4 w-4 rounded border-gray-300 text-[#323288] focus:ring-[#323288]"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center ${folder !== "." ? "pl-6" : ""}`}>
                              <svg
                                className="w-5 h-5 text-gray-400 mr-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {doc.title}
                              </span>
                              {doc.folder === "Nix" && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                  Nix
                                </span>
                              )}
                              {doc.folder === "Attachments" && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                  Attachment
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                              {doc.description || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {doc.author || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDateZA(doc.updatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="relative group">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditDocument(doc.id, doc.slug);
                                  }}
                                  className="p-1.5 text-[#323288] hover:text-[#252560] hover:bg-[#323288]/10 rounded"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                                  Edit document
                                </span>
                              </div>
                              <div className="relative group">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(doc.id);
                                  }}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                                  Delete document
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
                {sortedLocalFolders.map((folder) => (
                  <React.Fragment key={`local-folder-${folder}`}>
                    <tr
                      className="bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer select-none"
                      onClick={() => toggleFolder(`local:${folder}`)}
                    >
                      <td className="w-12 px-4 py-3">
                        <svg
                          className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${collapsedFolders.has(`local:${folder}`) ? "" : "rotate-90"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                      <td colSpan={5} className="px-6 py-3">
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                            {folder === "." ? "Codebase Root" : folder}
                          </span>
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            ({localDocsByFolder[folder].length} file
                            {localDocsByFolder[folder].length !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsedFolders.has(`local:${folder}`) &&
                      localDocsByFolder[folder].map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => handleUnifiedDocumentClick(doc)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors bg-blue-50/30 dark:bg-blue-900/20"
                        >
                          <td className="w-12 px-4 py-4">
                            <span className="w-4 h-4 block" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center pl-6">
                              <svg
                                className="w-5 h-5 text-blue-400 mr-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {doc.filePath?.split("/").pop()?.replace(".md", "") || doc.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                              {doc.filePath || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            Codebase
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDateZA(doc.updatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <span className="text-xs text-gray-400 italic whitespace-nowrap">
                              Read-only
                            </span>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {uploadingFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Processing Documents
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Files are being processed by Nix and saved to Secure Documents
            </p>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploadingFiles.map((file) => {
              const icon = fileTypeIcon(file.file.name);
              return (
                <li key={file.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <span
                        className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold ${icon.color}`}
                      >
                        {icon.label}
                      </span>
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      {file.status === "uploading" && (
                        <div className="w-24">
                          <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-[#323288] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {file.status === "success" && (
                        <>
                          <span className="text-green-500">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                          {file.documentSlug && (
                            <button
                              onClick={() => viewNixDocument(file.documentSlug!)}
                              className="text-sm text-[#323288] hover:text-[#4a4da3]"
                            >
                              View
                            </button>
                          )}
                        </>
                      )}
                      {file.status === "error" && (
                        <span className="text-red-500 text-sm">{file.error}</span>
                      )}
                      <button
                        onClick={() => removeUploadingFile(file.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {fileError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-amber-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-amber-800">
                Unable to import: {fileError.filename}
              </h4>
              <p className="mt-1 text-sm text-amber-700">{fileError.message}</p>
            </div>
            <button
              onClick={() => setFileError(null)}
              className="text-amber-500 hover:text-amber-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {actionMessage && (
        <div
          className={`rounded-lg p-4 ${actionMessage.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <div className="flex items-center">
            {actionMessage.type === "success" ? (
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <p
              className={`ml-3 flex-1 text-sm font-medium ${actionMessage.type === "success" ? "text-green-800" : "text-red-800"}`}
            >
              {actionMessage.text}
            </p>
            <button
              onClick={() => setActionMessage(null)}
              className={
                actionMessage.type === "success"
                  ? "text-green-500 hover:text-green-700"
                  : "text-red-500 hover:text-red-700"
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-blue-800">Import Complete</h4>
              {importResult.successful.length > 0 && (
                <p className="mt-1 text-sm text-blue-700">
                  {importResult.successful.length} file
                  {importResult.successful.length !== 1 ? "s" : ""} imported successfully
                </p>
              )}
              {importResult.failed.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">
                    {importResult.failed.length} failed:
                  </p>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {importResult.failed.map((f, i) => (
                      <li key={i}>
                        {f.filename}: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-blue-500 hover:text-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-sm font-medium text-blue-800">Importing files...</p>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? "border-[#323288] bg-[#323288]/5" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Drop files here</span> to import documents
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          Markdown, Text, PDF, Excel, Word, and CSV files supported
        </p>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(null)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Delete Document
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowBulkDeleteConfirm(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Delete {selectedIds.size} Document{selectedIds.size !== 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete {selectedIds.size} selected document
                {selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingBinaryFiles.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setPendingBinaryFiles([])}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full overflow-hidden">
              <div className="flex">
                {/* Left side - Nix avatar */}
                <div
                  className="w-1/2 flex items-center justify-center p-8 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #323288 0%, #1e1e5c 100%)",
                  }}
                >
                  <div className="relative">
                    {/* Orbiting binary digits - outer ring */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spin 4s linear infinite" }}
                    >
                      {["1", "0", "1", "0", "1", "0", "1", "0", "1", "0", "1", "0"].map(
                        (digit, i) => {
                          const angleDeg = i * 30;
                          return (
                            <div
                              key={i}
                              className="absolute"
                              style={{
                                top: "50%",
                                left: "50%",
                                transform: `rotate(${angleDeg}deg) translateY(-120px)`,
                              }}
                            >
                              <span
                                className="block font-mono text-orange-400 font-bold select-none"
                                style={{
                                  fontSize: `${13 + (i % 3) * 2}px`,
                                  opacity: 0.5 + (i % 2) * 0.3,
                                  transform: `rotate(-${angleDeg}deg)`,
                                  animation: "counterSpin 4s linear infinite",
                                }}
                              >
                                {digit}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                    {/* Orbiting binary digits - inner ring */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spin 3s linear infinite reverse" }}
                    >
                      {["0", "1", "0", "1", "0", "1", "0", "1"].map((digit, i) => {
                        const angleDeg = i * 45 + 22.5;
                        return (
                          <div
                            key={i}
                            className="absolute"
                            style={{
                              top: "50%",
                              left: "50%",
                              transform: `rotate(${angleDeg}deg) translateY(-145px)`,
                            }}
                          >
                            <span
                              className="block font-mono text-indigo-300 font-bold select-none"
                              style={{
                                fontSize: `${11 + (i % 2) * 3}px`,
                                opacity: 0.4 + (i % 2) * 0.2,
                                transform: `rotate(-${angleDeg}deg)`,
                                animation: "counterSpin 3s linear infinite reverse",
                              }}
                            >
                              {digit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <style jsx>{`
                      @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      @keyframes counterSpin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(-360deg); }
                      }
                    `}</style>
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-20"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(251, 146, 60, 0.6) 0%, transparent 70%)",
                        animationDuration: "2s",
                      }}
                    />
                    <div
                      className="relative w-48 h-48 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                      }}
                    >
                      <div
                        className="w-44 h-44 rounded-full overflow-hidden p-2"
                        style={{
                          boxShadow:
                            "0 0 30px rgba(251, 146, 60, 0.5), 0 0 60px rgba(99, 102, 241, 0.4)",
                          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                          background: "rgba(50, 50, 136, 0.8)",
                        }}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden">
                          <Image
                            src="/nix-avatar-complete.jpg"
                            alt="Nix AI Assistant"
                            width={176}
                            height={176}
                            className="object-cover w-full h-full"
                            style={{ objectPosition: "50% 45%" }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Orbiting orange indicator */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spin 6s linear infinite" }}
                    >
                      <div
                        className="absolute w-6 h-6"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%) translateY(-100px)",
                        }}
                      >
                        <div className="w-6 h-6 bg-orange-500 rounded-full animate-ping" />
                        <div className="absolute inset-0 w-6 h-6 bg-orange-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Content */}
                <div className="w-1/2 p-6 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Upload {pendingBinaryFiles.length}{" "}
                    {pendingBinaryFiles.length === 1 ? "File" : "Files"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
                    {pendingBinaryFiles.map((f) => f.name).join(", ")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    How would you like to handle{" "}
                    {pendingBinaryFiles.length === 1 ? "this file" : "these files"}?
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleBinaryUploadChoice(true)}
                      className="w-full px-4 py-3 text-left rounded-lg border-2 border-[#323288] bg-[#323288]/5 hover:bg-[#323288]/10 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3">
                          <svg
                            className="w-5 h-5 text-orange-600 dark:text-orange-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            Process with Nix
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Extract and convert content to markdown
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleBinaryUploadChoice(false)}
                      className="w-full px-4 py-3 text-left rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3">
                          <svg
                            className="w-5 h-5 text-gray-600 dark:text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            Upload as Attachment
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Store original file without processing
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => setPendingBinaryFiles([])}
                    className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {nixUploadResult?.success && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setNixUploadResult(null)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full overflow-hidden">
              <div className="flex">
                {/* Left side - Nix avatar (done) */}
                <div
                  className="w-1/2 flex items-center justify-center p-8 relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(34, 197, 94, 0.7) 0%, rgba(21, 128, 61, 0.8) 100%)",
                  }}
                >
                  <div className="relative">
                    {/* Orbiting binary digits - outer ring */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spinDone 4s linear infinite" }}
                    >
                      {["1", "0", "1", "0", "1", "0", "1", "0", "1", "0", "1", "0"].map(
                        (digit, i) => {
                          const angleDeg = i * 30;
                          return (
                            <div
                              key={i}
                              className="absolute"
                              style={{
                                top: "50%",
                                left: "50%",
                                transform: `rotate(${angleDeg}deg) translateY(-120px)`,
                              }}
                            >
                              <span
                                className="block font-mono text-green-200 font-bold select-none"
                                style={{
                                  fontSize: `${13 + (i % 3) * 2}px`,
                                  opacity: 0.5 + (i % 2) * 0.3,
                                  transform: `rotate(-${angleDeg}deg)`,
                                  animation: "counterSpinDone 4s linear infinite",
                                }}
                              >
                                {digit}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                    {/* Orbiting binary digits - inner ring */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spinDone 3s linear infinite reverse" }}
                    >
                      {["0", "1", "0", "1", "0", "1", "0", "1"].map((digit, i) => {
                        const angleDeg = i * 45 + 22.5;
                        return (
                          <div
                            key={i}
                            className="absolute"
                            style={{
                              top: "50%",
                              left: "50%",
                              transform: `rotate(${angleDeg}deg) translateY(-145px)`,
                            }}
                          >
                            <span
                              className="block font-mono text-emerald-300 font-bold select-none"
                              style={{
                                fontSize: `${11 + (i % 2) * 3}px`,
                                opacity: 0.4 + (i % 2) * 0.2,
                                transform: `rotate(-${angleDeg}deg)`,
                                animation: "counterSpinDone 3s linear infinite reverse",
                              }}
                            >
                              {digit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <style jsx>{`
                      @keyframes spinDone {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      @keyframes counterSpinDone {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(-360deg); }
                      }
                    `}</style>
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-10"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(134, 239, 172, 0.4) 0%, transparent 70%)",
                        animationDuration: "2s",
                      }}
                    />
                    <div
                      className="relative w-48 h-48 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                      }}
                    >
                      <div
                        className="w-44 h-44 rounded-full overflow-hidden p-2"
                        style={{
                          boxShadow:
                            "0 0 20px rgba(134, 239, 172, 0.3), 0 0 40px rgba(34, 197, 94, 0.2)",
                          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                          background: "rgba(21, 128, 61, 0.6)",
                        }}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden">
                          <Image
                            src="/nix-avatar-done.jpg"
                            alt="Nix AI Assistant - Done"
                            width={176}
                            height={176}
                            className="object-cover w-full h-full"
                            style={{ objectPosition: "50% 45%" }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Orbiting green indicator */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ animation: "spinDone 6s linear infinite" }}
                    >
                      <div
                        className="absolute w-6 h-6"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%) translateY(-100px)",
                        }}
                      >
                        <div className="w-6 h-6 bg-green-300 rounded-full animate-ping" />
                        <div className="absolute inset-0 w-6 h-6 bg-green-300 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Content */}
                <div className="w-1/2 p-6 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Processing Complete
                  </h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">File Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {nixUploadResult.fileName}
                    </p>
                  </div>
                  {nixUploadResult.documentPath && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Saved Location
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                          {nixUploadResult.documentPath}
                        </code>
                        <button
                          onClick={() => copyToClipboard(nixUploadResult.documentPath!)}
                          className={`flex-shrink-0 p-2 rounded text-sm font-medium transition-colors ${
                            copiedPath
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                          }`}
                          title="Copy path to clipboard"
                        >
                          {copiedPath ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 mt-4">
                    {nixUploadResult.documentSlug && (
                      <button
                        onClick={() => {
                          setNixUploadResult(null);
                          viewNixDocument(nixUploadResult.documentSlug!);
                        }}
                        className="w-full px-4 py-3 text-left rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                            <svg
                              className="w-5 h-5 text-green-600 dark:text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              View Document
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Open the processed document
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => setNixUploadResult(null)}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {nixUploadResult && !nixUploadResult.success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Processing Failed
                </h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">File Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {nixUploadResult.fileName}
                </p>
              </div>
              {nixUploadResult.error && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Error</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{nixUploadResult.error}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setNixUploadResult(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#323288] rounded-md hover:bg-[#4a4da3]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
