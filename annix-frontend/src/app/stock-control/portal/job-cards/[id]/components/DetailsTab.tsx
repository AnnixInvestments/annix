"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import type React from "react";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { JobCard, JobCardAttachment, JobCardVersion } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import type { StagedAttachment } from "../hooks/useJobCardDocuments";
import {
  extractionStatusBadge,
  INVALID_LINE_ITEM_PATTERNS,
  statusBadgeColor,
} from "../lib/helpers";

interface DetailsTabProps {
  jobCard: JobCard;
  versions: JobCardVersion[];
  attachments: JobCardAttachment[];
  lineItemsContent: React.ReactNode;
  showVersionHistory: boolean;
  onToggleVersionHistory: () => void;
  showAmendmentModal: boolean;
  onToggleAmendmentModal: (show: boolean) => void;
  amendmentNotes: string;
  onAmendmentNotesChange: (notes: string) => void;
  amendmentFile: File | null;
  onAmendmentFileChange: (file: File | null) => void;
  isUploadingAmendment: boolean;
  onAmendmentUpload: () => void;
  isDraggingAmendment: boolean;
  onAmendmentDrop: (e: React.DragEvent) => void;
  onAmendmentDragOver: (e: React.DragEvent) => void;
  onAmendmentDragLeave: (e: React.DragEvent) => void;
  stagedAttachments: StagedAttachment[];
  onAddStagedFiles: (files: File[]) => void;
  onSetStagedAttachmentType: (index: number, type: "drawing" | "qc_document") => void;
  onRemoveStagedAttachment: (index: number) => void;
  onClearStagedAttachments: () => void;
  isUploadingAttachment: boolean;
  onAttachmentUpload: () => void;
  isDraggingAttachment: boolean;
  onAttachmentDrop: (e: React.DragEvent) => void;
  onAttachmentDragOver: (e: React.DragEvent) => void;
  onAttachmentDragLeave: (e: React.DragEvent) => void;
  onTriggerExtraction: (attachmentId: number) => void;
  isExtracting: number | null;
  isExtractingAll: boolean;
  onExtractAll: () => void;
  onDeleteAttachment: (attachmentId: number) => Promise<void>;
  canEditNotes: boolean;
  onSaveNotes: (notes: string) => Promise<void>;
  onReExtractNotes: () => Promise<void>;
  isReExtracting: boolean;
}

function cleanedNotes(notes: string | null): string {
  const lines = (notes || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .map((line) => line.trim());
  return [...new Set(lines)].join("\n").trim();
}

export function DetailsTab({
  jobCard,
  versions,
  attachments,
  showVersionHistory,
  onToggleVersionHistory,
  showAmendmentModal,
  onToggleAmendmentModal,
  amendmentNotes,
  onAmendmentNotesChange,
  amendmentFile,
  onAmendmentFileChange,
  isUploadingAmendment,
  onAmendmentUpload,
  isDraggingAmendment,
  onAmendmentDrop,
  onAmendmentDragOver,
  onAmendmentDragLeave,
  lineItemsContent,
  stagedAttachments,
  onAddStagedFiles,
  onSetStagedAttachmentType,
  onRemoveStagedAttachment,
  onClearStagedAttachments,
  isUploadingAttachment,
  onAttachmentUpload,
  isDraggingAttachment,
  onAttachmentDrop,
  onAttachmentDragOver,
  onAttachmentDragLeave,
  onTriggerExtraction,
  isExtracting,
  isExtractingAll,
  onExtractAll,
  onDeleteAttachment,
  canEditNotes,
  onSaveNotes,
  onReExtractNotes,
  isReExtracting,
}: DetailsTabProps) {
  const { showToast } = useToast();
  const filteredNotes = cleanedNotes(jobCard.notes);
  const [editedNotes, setEditedNotes] = useState(filteredNotes);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleDeleteAttachmentClick = async (attachmentId: number) => {
    try {
      await onDeleteAttachment(attachmentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete attachment";
      showToast(`Could not delete attachment: ${message}`, "error");
    }
  };

  const handleNotesChange = (value: string) => {
    setEditedNotes(value);
    setHasUnsavedChanges(value !== filteredNotes);
  };

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      await onSaveNotes(editedNotes);
      setHasUnsavedChanges(false);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const jcNumber = jobCard.jcNumber;
  const pageNumber = jobCard.pageNumber;
  const rawCustomerName = jobCard.customerName;
  const customerName = jobCard.customerName;

  const drawingAttachments = attachments.filter((a) => a.attachmentType !== "qc_document");
  const classifyingCount = stagedAttachments.filter((staged) => staged.classifying).length;
  const needsReviewCount = stagedAttachments.filter(
    (staged) => staged.needsReview && !staged.classifying,
  ).length;
  const hasUnresolvedStaged = classifyingCount > 0 || needsReviewCount > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-3 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Card Details</h3>
        </div>
        <div className="px-4 py-3 sm:px-6">
          <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Job Number</dt>
              <dd className="text-sm text-gray-900">{jobCard.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">JC Number</dt>
              <dd className="text-sm text-gray-900">{jcNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Page Number</dt>
              <dd className="text-sm text-gray-900">{pageNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Job Name</dt>
              <dd className="text-sm text-gray-900">{jobCard.jobName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Status</dt>
              <dd>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
                >
                  {jobCard.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Customer</dt>
              <dd className="text-sm text-gray-900 truncate" title={rawCustomerName || "-"}>
                {customerName || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDateZA(jobCard.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">{formatDateZA(jobCard.updatedAt)}</dd>
            </div>
            {jobCard.description && (
              <div className="col-span-2">
                <dt className="text-xs font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{jobCard.description}</dd>
              </div>
            )}
            {jobCard.poNumber && (
              <div>
                <dt className="text-xs font-medium text-gray-500">PO Number</dt>
                <dd className="text-sm text-gray-900">{jobCard.poNumber}</dd>
              </div>
            )}
            {jobCard.reference && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Reference</dt>
                <dd className="text-sm text-gray-900">{jobCard.reference}</dd>
              </div>
            )}
            {jobCard.siteLocation && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Site / Location</dt>
                <dd className="text-sm text-gray-900">{jobCard.siteLocation}</dd>
              </div>
            )}
            {jobCard.contactPerson && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Contact Person</dt>
                <dd className="text-sm text-gray-900">{jobCard.contactPerson}</dd>
              </div>
            )}
            {jobCard.dueDate && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Due Date</dt>
                <dd className="text-sm text-gray-900">{jobCard.dueDate}</dd>
              </div>
            )}
            <div className="col-span-2 sm:col-span-4 lg:col-span-6">
              <dt className="text-xs font-medium text-gray-500 mb-1">
                Specifications (AI Extracted)
              </dt>
              {canEditNotes ? (
                <div className="space-y-1">
                  <textarea
                    value={editedNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    rows={2}
                    placeholder="No specifications extracted yet. Click Re-extract to pull from line item notes."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--sc-primary,#323288)] focus:ring-[var(--sc-primary,#323288)] sm:text-sm"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes || !hasUnsavedChanges}
                      className="px-3 py-1 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:bg-gray-400"
                    >
                      {isSavingNotes ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={onReExtractNotes}
                      disabled={isReExtracting}
                      className="px-3 py-1 text-sm font-medium text-[var(--sc-primary-hover,#252560)] bg-[var(--sc-primary-50,#eeeef6)] border border-[var(--sc-primary-300,#8484b5)] rounded-md hover:bg-[var(--sc-primary-100,#d6d6e9)] disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300"
                    >
                      {isReExtracting ? "Re-extracting..." : "Re-extract"}
                    </button>
                  </div>
                </div>
              ) : (
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                  {filteredNotes || "No specifications extracted"}
                </dd>
              )}
            </div>
          </dl>
          {jobCard.customFields && keys(jobCard.customFields).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Custom Fields</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {entries(jobCard.customFields).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {versions.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <button
            onClick={onToggleVersionHistory}
            className="w-full px-4 py-4 sm:px-6 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Version History</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {versions.length} archived
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${showVersionHistory ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showVersionHistory && (
            <div className="px-4 py-4 sm:px-6 space-y-3">
              {versions.map((version) => {
                const originalFilename = version.originalFilename;
                return (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900">
                          v{version.versionNumber}
                        </span>
                        <span className="text-sm text-gray-500">
                          {originalFilename || "No file"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateZA(version.createdAt)}
                        {version.createdBy && ` by ${version.createdBy}`}
                      </p>
                      {version.amendmentNotes && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          &quot;{version.amendmentNotes}&quot;
                        </p>
                      )}
                    </div>
                    {version.filePath && (
                      <a
                        href={version.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)]"
                      >
                        View
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {lineItemsContent}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Drawing Attachments</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {drawingAttachments.length} attachment{drawingAttachments.length === 1 ? "" : "s"}
            </span>
            {drawingAttachments.some(
              (a) => a.extractionStatus === "pending" || a.extractionStatus === "failed",
            ) && (
              <button
                onClick={onExtractAll}
                disabled={isExtractingAll}
                className="px-3 py-1 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:bg-gray-400"
              >
                {isExtractingAll ? "Nix is analysing all drawings..." : "Extract All Drawings"}
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div
            onDrop={onAttachmentDrop}
            onDragOver={onAttachmentDragOver}
            onDragEnter={onAttachmentDragOver}
            onDragLeave={onAttachmentDragLeave}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDraggingAttachment
                ? "border-[var(--sc-primary,#323288)] bg-[var(--sc-primary-50,#eeeef6)]"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {stagedAttachments.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  {stagedAttachments.length} file{stagedAttachments.length > 1 ? "s" : ""} ready to
                  upload
                </p>
                <ul className="space-y-2 text-left">
                  {stagedAttachments.map((staged, idx) => {
                    const isDrawing = staged.attachmentType === "drawing";
                    return (
                      <li
                        key={staged.id}
                        className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm text-gray-700" title={staged.file.name}>
                            {staged.file.name}
                          </span>
                          {staged.classifying && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--sc-primary,#323288)]" />
                              Nix is checking…
                            </span>
                          )}
                          {staged.classifyFailed && !staged.classifying && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Couldn&apos;t auto-classify — please confirm
                            </span>
                          )}
                          {staged.needsReview && !staged.classifyFailed && !staged.classifying && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Unsure — please confirm
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex overflow-hidden rounded-md border border-gray-300"
                            role="group"
                            aria-label={`Document type for ${staged.file.name}`}
                          >
                            <button
                              type="button"
                              onClick={() => onSetStagedAttachmentType(idx, "drawing")}
                              disabled={staged.classifying}
                              aria-pressed={isDrawing}
                              className={`px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                isDrawing
                                  ? "bg-[var(--sc-primary,#323288)] text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              Drawing
                            </button>
                            <button
                              type="button"
                              onClick={() => onSetStagedAttachmentType(idx, "qc_document")}
                              disabled={staged.classifying}
                              aria-pressed={!isDrawing}
                              className={`px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                !isDrawing
                                  ? "bg-[var(--sc-primary,#323288)] text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              QC Doc
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveStagedAttachment(idx)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {classifyingCount > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--sc-primary,#323288)]" />
                    Nix is checking {classifyingCount} file{classifyingCount === 1 ? "" : "s"}…
                  </p>
                )}
                {needsReviewCount > 0 && (
                  <p className="text-xs text-amber-700">
                    Confirm the document type for the highlighted files before uploading.
                  </p>
                )}
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={onClearStagedAttachments}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onAttachmentUpload}
                    disabled={isUploadingAttachment || hasUnresolvedStaged}
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isUploadingAttachment ? "Uploading..." : "Upload All"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
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
                <p className="mt-2 text-sm text-gray-600">
                  Drop PDF, DXF, or image files here or{" "}
                  <label className="text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)] cursor-pointer">
                    browse
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.dxf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          onAddStagedFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Upload all drawings for this job, then click Extract for Nix to analyse them
                  together
                </p>
              </>
            )}
          </div>

          {drawingAttachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {drawingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.originalFilename}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${extractionStatusBadge(attachment.extractionStatus)}`}
                      >
                        {attachment.extractionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateZA(attachment.createdAt)}
                      {attachment.uploadedBy && ` by ${attachment.uploadedBy}`}
                    </p>
                    {attachment.extractionStatus === "analysed" && attachment.extractedData && (
                      <div className="mt-2 text-xs text-gray-600">
                        {(attachment.extractedData as { drawingType?: string }).drawingType ===
                        "tank_chute" ? (
                          <>
                            {(attachment.extractedData as { tankData?: { assemblyType?: string } })
                              .tankData?.assemblyType && (
                              <span className="mr-3 font-medium text-amber-700">
                                {(
                                  attachment.extractedData as {
                                    tankData: { assemblyType: string };
                                  }
                                ).tankData.assemblyType
                                  .charAt(0)
                                  .toUpperCase() +
                                  (
                                    attachment.extractedData as {
                                      tankData: { assemblyType: string };
                                    }
                                  ).tankData.assemblyType.slice(1)}
                              </span>
                            )}
                            {(attachment.extractedData as { totalLiningM2?: number })
                              .totalLiningM2 !== undefined &&
                              (attachment.extractedData as { totalLiningM2: number })
                                .totalLiningM2 > 0 && (
                                <span className="mr-3">
                                  Lining:{" "}
                                  {
                                    (attachment.extractedData as { totalLiningM2: number })
                                      .totalLiningM2
                                  }{" "}
                                  m²
                                </span>
                              )}
                            {(attachment.extractedData as { totalCoatingM2?: number })
                              .totalCoatingM2 !== undefined &&
                              (attachment.extractedData as { totalCoatingM2: number })
                                .totalCoatingM2 > 0 && (
                                <span>
                                  Coating:{" "}
                                  {
                                    (attachment.extractedData as { totalCoatingM2: number })
                                      .totalCoatingM2
                                  }{" "}
                                  m²
                                </span>
                              )}
                          </>
                        ) : (
                          <>
                            {(attachment.extractedData as { totalExternalM2?: number })
                              .totalExternalM2 !== undefined && (
                              <span className="mr-3">
                                Ext:{" "}
                                {
                                  (attachment.extractedData as { totalExternalM2: number })
                                    .totalExternalM2
                                }{" "}
                                m²
                              </span>
                            )}
                            {(attachment.extractedData as { totalInternalM2?: number })
                              .totalInternalM2 !== undefined && (
                              <span>
                                Int:{" "}
                                {
                                  (attachment.extractedData as { totalInternalM2: number })
                                    .totalInternalM2
                                }{" "}
                                m²
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {attachment.extractionStatus === "failed" && attachment.extractionError && (
                      <p className="text-xs text-red-600 mt-1">{attachment.extractionError}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {(attachment.extractionStatus === "pending" ||
                      attachment.extractionStatus === "failed") && (
                      <button
                        onClick={() => onTriggerExtraction(attachment.id)}
                        disabled={isExtracting === attachment.id}
                        className="text-sm text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)] disabled:text-gray-400"
                      >
                        {isExtracting === attachment.id ? "Extracting..." : "Extract"}
                      </button>
                    )}
                    <a
                      href={attachment.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeleteAttachmentClick(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAmendmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => onToggleAmendmentModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Amendment</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a new version of this job card. The current version will be archived.
              </p>
              <div className="space-y-4">
                <div
                  onDrop={onAmendmentDrop}
                  onDragOver={onAmendmentDragOver}
                  onDragEnter={onAmendmentDragOver}
                  onDragLeave={onAmendmentDragLeave}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDraggingAmendment
                      ? "border-[var(--sc-primary,#323288)] bg-[var(--sc-primary-50,#eeeef6)]"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {amendmentFile ? (
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-8 w-8 text-[var(--sc-primary,#323288)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">{amendmentFile.name}</p>
                      <button
                        onClick={() => onAmendmentFileChange(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-8 w-8 text-gray-400"
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
                      <p className="mt-2 text-sm text-gray-600">
                        Drop a file here or{" "}
                        <label className="text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)] cursor-pointer">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                onAmendmentFileChange(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amendment Notes (optional)
                  </label>
                  <textarea
                    value={amendmentNotes}
                    onChange={(e) => onAmendmentNotesChange(e.target.value)}
                    rows={2}
                    placeholder="Describe what changed in this version..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--sc-primary,#323288)] focus:ring-[var(--sc-primary,#323288)] sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    onToggleAmendmentModal(false);
                    onAmendmentFileChange(null);
                    onAmendmentNotesChange("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onAmendmentUpload}
                  disabled={isUploadingAmendment || !amendmentFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] border border-transparent rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUploadingAmendment ? "Uploading..." : "Upload Amendment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
