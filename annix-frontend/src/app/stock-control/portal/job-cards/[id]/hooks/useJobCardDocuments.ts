import { useCallback, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type { JobCardAttachment, JobCardVersion } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowMillis } from "@/app/lib/datetime";
import {
  heuristicAttachmentType,
  type StagedAttachmentType,
} from "@/app/stock-control/lib/classifyAttachment";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

export interface StagedAttachment {
  id: string;
  file: File;
  attachmentType: StagedAttachmentType;
  source: "heuristic" | "ai" | "manual";
  confidence?: number;
  needsReview: boolean;
  classifying: boolean;
  classifyFailed?: boolean;
}

const ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".dxf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".heic",
  ".tiff",
];
const CONFIDENCE_REVIEW_THRESHOLD = 0.6;
const EXTRACT_ALL_FALLBACK_PER_DRAWING_MS = 45_000;
const SINGLE_EXTRACT_FALLBACK_MS = 60_000;
const MAX_FAILURE_TOASTS = 3;
const CLASSIFY_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_CLASSIFY = 3;

export function useJobCardDocuments(
  jobId: number,
  fetchData: () => Promise<void>,
  confirmFn?: (options: ConfirmOptions) => Promise<boolean>,
  onAttachmentsUploaded?: () => void,
) {
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const [versions, setVersions] = useState<JobCardVersion[]>([]);
  const [attachments, setAttachments] = useState<JobCardAttachment[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentNotes, setAmendmentNotes] = useState("");
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [isUploadingAmendment, setIsUploadingAmendment] = useState(false);
  const [isDraggingAmendment, setIsDraggingAmendment] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
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

  const classifyStaged = useCallback(
    async (id: string, file: File) => {
      const markFailed = () =>
        setStagedAttachments((prev) =>
          prev.map((staged) =>
            staged.id === id
              ? { ...staged, classifying: false, needsReview: true, classifyFailed: true }
              : staged,
          ),
        );
      let timer: ReturnType<typeof setTimeout> | null = null;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("classify-timeout")), CLASSIFY_TIMEOUT_MS);
      });
      try {
        const result = await Promise.race([
          stockControlApiClient.classifyJobCardAttachment(jobId, file),
          timeout,
        ]);
        const category = result.category;
        const confidence = result.confidence;
        setStagedAttachments((prev) =>
          prev.map((staged) =>
            staged.id === id
              ? {
                  ...staged,
                  attachmentType: category,
                  source: "ai",
                  confidence,
                  needsReview: confidence < CONFIDENCE_REVIEW_THRESHOLD,
                  classifying: false,
                  classifyFailed: false,
                }
              : staged,
          ),
        );
      } catch {
        markFailed();
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    [jobId],
  );

  const runWithConcurrency = useCallback(
    async (tasks: Array<() => Promise<void>>, limit: number) => {
      const queue = [...tasks];
      const worker = async (): Promise<void> => {
        const next = queue.shift();
        if (!next) return;
        await next();
        await worker();
      };
      const workerCount = Math.min(limit, tasks.length);
      const workers = Array.from({ length: workerCount }, () => worker());
      await Promise.all(workers);
    },
    [],
  );

  const addStagedFiles = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) =>
        ATTACHMENT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
      );
      if (validFiles.length === 0) return;
      const newStaged: StagedAttachment[] = validFiles.map((file) => {
        const heuristic = heuristicAttachmentType(file.name);
        const id = `${file.name}-${nowMillis()}-${Math.random().toString(36).slice(2)}`;
        return {
          id,
          file,
          attachmentType: heuristic.type,
          source: "heuristic" as const,
          needsReview: false,
          classifying: heuristic.ambiguous,
        };
      });
      setStagedAttachments((prev) => [...prev, ...newStaged]);
      const classifyTasks = newStaged
        .filter((staged) => staged.classifying)
        .map((staged) => () => classifyStaged(staged.id, staged.file));
      if (classifyTasks.length > 0) {
        runWithConcurrency(classifyTasks, MAX_CONCURRENT_CLASSIFY);
      }
    },
    [classifyStaged, runWithConcurrency],
  );

  const setStagedAttachmentType = useCallback((index: number, type: StagedAttachmentType) => {
    setStagedAttachments((prev) =>
      prev.map((staged, i) =>
        i === index
          ? { ...staged, attachmentType: type, source: "manual", needsReview: false }
          : staged,
      ),
    );
  }, []);

  const removeStagedAttachment = useCallback((index: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearStagedAttachments = useCallback(() => {
    setStagedAttachments([]);
  }, []);

  const handleAttachmentUpload = useCallback(async () => {
    if (stagedAttachments.length === 0) return;
    const hasUnresolved = stagedAttachments.some((staged) => {
      const needsReview = staged.needsReview;
      const classifying = staged.classifying;
      return needsReview || classifying;
    });
    if (hasUnresolved) return;
    setIsUploadingAttachment(true);
    const failures: { staged: StagedAttachment; message: string }[] = [];
    await stagedAttachments.reduce(
      (chain, staged) =>
        chain.then(async () => {
          try {
            await stockControlApiClient.uploadJobCardAttachment(jobId, staged.file, {
              attachmentType: staged.attachmentType,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            failures.push({ staged, message });
          }
        }),
      Promise.resolve(),
    );
    setIsUploadingAttachment(false);
    if (failures.length > 0) {
      failures.slice(0, MAX_FAILURE_TOASTS).forEach((failure) => {
        const fileName = failure.staged.file.name;
        showToast(`Could not upload ${fileName}: ${failure.message}`, "error");
      });
    }
    const failedSet = new Set(failures.map((failure) => failure.staged));
    const uploaded = stagedAttachments.filter((staged) => !failedSet.has(staged));
    setStagedAttachments((prev) => prev.filter((staged) => failedSet.has(staged)));
    const updatedAttachments = await stockControlApiClient
      .jobCardAttachments(jobId)
      .catch(() => null);
    if (updatedAttachments) setAttachments(updatedAttachments);
    if (uploaded.length > 0) {
      const drawingCount = uploaded.filter((staged) => staged.attachmentType === "drawing").length;
      const qcCount = uploaded.filter((staged) => staged.attachmentType === "qc_document").length;
      const parts: string[] = [];
      if (drawingCount > 0) {
        parts.push(`${drawingCount} drawing${drawingCount === 1 ? "" : "s"}`);
      }
      if (qcCount > 0) {
        parts.push(`${qcCount} QC document${qcCount === 1 ? "" : "s"}`);
      }
      const summary = parts.join(" and ");
      const qcSuffix = qcCount > 0 ? " QC documents are in the Quality tab." : "";
      showToast(`Uploaded ${summary}.${qcSuffix}`, "success");
      if (onAttachmentsUploaded) onAttachmentsUploaded();
    }
  }, [jobId, stagedAttachments, showToast, onAttachmentsUploaded]);

  const handleTriggerExtraction = useCallback(
    async (attachmentId: number) => {
      const stats = await metricsApi
        .extractionStats("drawing-extraction", "extract")
        .catch(() => null);
      const learnedMs = stats ? stats.averageMs : null;
      const estimate = learnedMs && learnedMs > 0 ? learnedMs : SINGLE_EXTRACT_FALLBACK_MS;
      try {
        setIsExtracting(attachmentId);
        showExtraction({
          brand: "stock-control",
          label: "Nix is analysing the drawing…",
          estimatedDurationMs: estimate,
          backgroundSafe: true,
        });
        await stockControlApiClient.triggerDrawingExtraction(jobId, attachmentId);
        const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
        setAttachments(updatedAttachments);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Extraction failed";
        showToast(`Extraction failed: ${message}`, "error");
      } finally {
        setIsExtracting(null);
        hideExtraction();
      }
    },
    [jobId, showExtraction, hideExtraction, showToast],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: number) => {
      if (confirmFn) {
        const confirmed = await confirmFn({
          title: "Delete Attachment",
          message: "Delete this attachment?",
          confirmLabel: "Delete",
          variant: "danger",
        });
        if (!confirmed) return;
      }
      try {
        await stockControlApiClient.deleteJobCardAttachment(jobId, attachmentId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete attachment");
      }
    },
    [jobId, confirmFn],
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
    const drawingCount = attachments.filter((a) => a.attachmentType !== "qc_document").length;
    const stats = await metricsApi
      .extractionStats("drawing-extraction", "extract-all")
      .catch(() => null);
    const learnedMs = stats ? stats.averageMs : null;
    const estimate =
      learnedMs && learnedMs > 0
        ? learnedMs
        : Math.max(drawingCount, 1) * EXTRACT_ALL_FALLBACK_PER_DRAWING_MS;
    try {
      setIsExtractingAll(true);
      showExtraction({
        brand: "stock-control",
        label: "Nix is analysing all drawings…",
        estimatedDurationMs: estimate,
        itemCount: drawingCount,
        backgroundSafe: true,
      });
      await stockControlApiClient.extractAllDrawings(jobId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      showToast(`Drawing extraction failed: ${message}`, "error");
    } finally {
      setIsExtractingAll(false);
      hideExtraction();
    }
  }, [jobId, fetchData, attachments, showExtraction, hideExtraction, showToast]);

  const handleAttachmentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingAttachment(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        addStagedFiles(Array.from(files));
      }
    },
    [addStagedFiles],
  );

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
    stagedAttachments,
    addStagedFiles,
    setStagedAttachmentType,
    removeStagedAttachment,
    clearStagedAttachments,
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
