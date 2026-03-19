import { useCallback, useState } from "react";
import type { JobCardJobFile } from "@/app/lib/api/stock-control-api/types";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

type ConfirmFn = (opts: {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "default" | "danger" | "warning";
}) => Promise<boolean>;

const VALID_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
];

export function useJobCardJobFiles(jobId: number, confirmFn: ConfirmFn) {
  const [jobFiles, setJobFiles] = useState<JobCardJobFile[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ file: JobCardJobFile; url: string } | null>(
    null,
  );

  const loadJobFiles = useCallback(async () => {
    try {
      const files = await stockControlApiClient.jobCardJobFiles(jobId);
      setJobFiles(files);
    } catch {
      setJobFiles([]);
    }
  }, [jobId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter((f) =>
        VALID_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      setStagedFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (stagedFiles.length === 0) return;
    try {
      setIsUploading(true);
      await stagedFiles.reduce(
        (chain, file) =>
          chain.then(() =>
            stockControlApiClient.uploadJobCardJobFile(jobId, file).then(() => undefined),
          ),
        Promise.resolve() as Promise<void>,
      );
      setStagedFiles([]);
      await loadJobFiles();
      setTimeout(() => {
        loadJobFiles();
      }, 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload files";
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  }, [jobId, stagedFiles, loadJobFiles]);

  const handleDelete = useCallback(
    async (fileId: number) => {
      const confirmed = await confirmFn({
        title: "Delete File",
        message: "Are you sure you want to delete this file?",
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) return;
      try {
        await stockControlApiClient.deleteJobCardJobFile(jobId, fileId);
        setJobFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete file";
        alert(msg);
      }
    },
    [jobId, confirmFn],
  );

  const handleView = useCallback(
    async (file: JobCardJobFile) => {
      try {
        const { url } = await stockControlApiClient.jobCardJobFileViewUrl(jobId, file.id);
        setViewingFile({ file, url });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load file";
        alert(msg);
      }
    },
    [jobId],
  );

  const handleDownload = useCallback(
    async (file: JobCardJobFile) => {
      try {
        const { url } = await stockControlApiClient.jobCardJobFileViewUrl(jobId, file.id);
        window.open(url, "_blank");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to download file";
        alert(msg);
      }
    },
    [jobId],
  );

  const handleRemoveStaged = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    jobFiles,
    stagedFiles,
    isUploading,
    isDragging,
    viewingFile,
    setViewingFile,
    loadJobFiles,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleUpload,
    handleDelete,
    handleView,
    handleDownload,
    handleRemoveStaged,
  };
}
