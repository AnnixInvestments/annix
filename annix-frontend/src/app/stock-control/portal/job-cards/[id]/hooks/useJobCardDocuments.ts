import { useCallback, useState } from "react";
import type { JobCardAttachment, JobCardVersion } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

export function useJobCardDocuments(jobId: number, fetchData: () => Promise<void>) {
  const [versions, setVersions] = useState<JobCardVersion[]>([]);
  const [attachments, setAttachments] = useState<JobCardAttachment[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentNotes, setAmendmentNotes] = useState("");
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [isUploadingAmendment, setIsUploadingAmendment] = useState(false);
  const [isDraggingAmendment, setIsDraggingAmendment] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [isExtracting, setIsExtracting] = useState<number | null>(null);
  const [isExtractingAll, setIsExtractingAll] = useState(false);

  const loadDocuments = useCallback(async () => {
    stockControlApiClient
      .jobCardVersionHistory(jobId)
      .then((data) => setVersions(data))
      .catch(() => setVersions([]));

    stockControlApiClient
      .jobCardAttachments(jobId)
      .then((data) => setAttachments(data))
      .catch(() => setAttachments([]));
  }, [jobId]);

  const handleAmendmentUpload = useCallback(async () => {
    if (!amendmentFile) return;
    try {
      setIsUploadingAmendment(true);
      await stockControlApiClient.uploadJobCardAmendment(
        jobId,
        amendmentFile,
        amendmentNotes || undefined,
      );
      setShowAmendmentModal(false);
      setAmendmentFile(null);
      setAmendmentNotes("");
      fetchData();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to upload amendment");
    } finally {
      setIsUploadingAmendment(false);
    }
  }, [jobId, amendmentFile, amendmentNotes, fetchData]);

  const handleAttachmentUpload = useCallback(async () => {
    if (attachmentFiles.length === 0) return;
    try {
      setIsUploadingAttachment(true);
      await attachmentFiles.reduce(
        (chain, file) =>
          chain.then(() =>
            stockControlApiClient.uploadJobCardAttachment(jobId, file).then(() => undefined),
          ),
        Promise.resolve() as Promise<void>,
      );
      setAttachmentFiles([]);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to upload attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [jobId, attachmentFiles]);

  const handleTriggerExtraction = useCallback(
    async (attachmentId: number) => {
      try {
        setIsExtracting(attachmentId);
        await stockControlApiClient.triggerDrawingExtraction(jobId, attachmentId);
        const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
        setAttachments(updatedAttachments);
      } catch (err) {
        throw err instanceof Error ? err : new Error("Extraction failed");
      } finally {
        setIsExtracting(null);
      }
    },
    [jobId],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: number) => {
      if (!confirm("Delete this attachment?")) return;
      try {
        await stockControlApiClient.deleteJobCardAttachment(jobId, attachmentId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete attachment");
      }
    },
    [jobId],
  );

  const handleAmendmentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAmendment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAmendmentFile(files[0]);
    }
  }, []);

  const handleAmendmentDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAmendment(true);
  }, []);

  const handleAmendmentDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAmendment(false);
    }
  }, []);

  const handleExtractAll = useCallback(async () => {
    try {
      setIsExtractingAll(true);
      await stockControlApiClient.extractAllDrawings(jobId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
      await fetchData();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Extraction failed");
    } finally {
      setIsExtractingAll(false);
    }
  }, [jobId, fetchData]);

  const handleAttachmentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validExtensions = [".pdf", ".dxf"];
      const newFiles = Array.from(files).filter((f) =>
        validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      setAttachmentFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleAttachmentDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAttachment(true);
  }, []);

  const handleAttachmentDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAttachment(false);
    }
  }, []);

  return {
    versions,
    attachments,
    showVersionHistory,
    setShowVersionHistory,
    selectedVersionId,
    setSelectedVersionId,
    showAmendmentModal,
    setShowAmendmentModal,
    amendmentNotes,
    setAmendmentNotes,
    amendmentFile,
    setAmendmentFile,
    isUploadingAmendment,
    isDraggingAmendment,
    attachmentFiles,
    setAttachmentFiles,
    isUploadingAttachment,
    isDraggingAttachment,
    isExtracting,
    isExtractingAll,
    loadDocuments,
    handleAmendmentUpload,
    handleAttachmentUpload,
    handleTriggerExtraction,
    handleDeleteAttachment,
    handleAmendmentDrop,
    handleAmendmentDragOver,
    handleAmendmentDragLeave,
    handleExtractAll,
    handleAttachmentDrop,
    handleAttachmentDragOver,
    handleAttachmentDragLeave,
  };
}
