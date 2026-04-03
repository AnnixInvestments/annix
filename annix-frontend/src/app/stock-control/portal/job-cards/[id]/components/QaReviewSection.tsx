"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BackgroundStepStatus,
  QaApplicability,
  QaReviewDecision,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface QaReviewSectionProps {
  jobCardId: number;
  backgroundSteps: BackgroundStepStatus[];
  activeBgStepKeys: Set<string>;
  onReviewSubmitted: () => void;
  stepAssignments: Record<string, { name: string; isPrimary: boolean }[]>;
  currentUserName: string | null;
}

type ReviewState = "loading" | "form" | "repairs" | "submitted";

interface PhotoEntry {
  id: number;
  url: string;
  name: string;
}

interface DefectPhoto {
  id: number;
  url: string;
  originalFilename: string;
}

export function QaReviewSection(props: QaReviewSectionProps) {
  const {
    jobCardId,
    backgroundSteps,
    activeBgStepKeys,
    onReviewSubmitted,
    stepAssignments,
    currentUserName,
  } = props;

  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [applicability, setApplicability] = useState<QaApplicability | null>(null);
  const [latestDecision, setLatestDecision] = useState<QaReviewDecision | null>(null);
  const [defectPhotos, setDefectPhotos] = useState<DefectPhoto[]>([]);

  const [rubberAccepted, setRubberAccepted] = useState<boolean | null>(null);
  const [paintAccepted, setPaintAccepted] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [repairPhotos, setRepairPhotos] = useState<PhotoEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletingRepairs, setIsCompletingRepairs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const repairFileInputRef = useRef<HTMLInputElement>(null);

  const qaReviewStep = backgroundSteps.find(
    (bg) => bg.stepKey === "qa_review" || bg.label?.toLowerCase() === "qa review",
  );
  const qcRepairsStep = backgroundSteps.find(
    (bg) => bg.stepKey === "qc_repairs" || bg.label?.toLowerCase().includes("repair"),
  );
  const qcRepairsPending = qcRepairsStep ? qcRepairsStep.completedAt === null : false;

  const qaReviewPending = qaReviewStep ? qaReviewStep.completedAt === null : false;

  const qaStepKey = qaReviewStep?.stepKey || "qa_review";
  const qaReviewActive = activeBgStepKeys.has(qaStepKey) || activeBgStepKeys.has("qa_review");
  const loadData = useCallback(async () => {
    try {
      const [applicRes, decisionRes, filesRes] = await Promise.all([
        stockControlApiClient.qaApplicability(jobCardId),
        stockControlApiClient.latestQaReview(jobCardId),
        stockControlApiClient.jobCardJobFiles(jobCardId),
      ]);
      setApplicability(applicRes);
      setLatestDecision(decisionRes);

      const imageFiles = (filesRes || []).filter((f) => f.mimeType.startsWith("image/"));
      const photosWithUrls = await Promise.all(
        imageFiles.map(async (f) => {
          const viewUrlRes = await stockControlApiClient.jobCardJobFileViewUrl(jobCardId, f.id);
          return { id: f.id, url: viewUrlRes.url, originalFilename: f.originalFilename };
        }),
      );
      setDefectPhotos(photosWithUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QA review data");
    }
  }, [jobCardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (applicability === null) return;

    const hasDecision = latestDecision !== null;
    const decisionHasRejection =
      (latestDecision?.rubberApplicable && latestDecision?.rubberAccepted === false) ||
      (latestDecision?.paintApplicable && latestDecision?.paintAccepted === false);

    if (qaReviewPending) {
      setReviewState("form");
    } else if (hasDecision && decisionHasRejection && qcRepairsPending) {
      setReviewState("repairs");
    } else if (hasDecision) {
      setReviewState("submitted");
    } else {
      setReviewState("form");
    }
  }, [applicability, latestDecision, qaReviewPending, qcRepairsPending]);

  const hasRejection =
    (applicability?.hasRubber && rubberAccepted === false) ||
    (applicability?.hasPaint && paintAccepted === false);

  const canSubmit =
    (applicability?.hasRubber ? rubberAccepted !== null : true) &&
    (applicability?.hasPaint ? paintAccepted !== null : true) &&
    (!hasRejection || notes.trim().length > 0);

  const handlePhotoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      const result = await stockControlApiClient.uploadReadyPhoto(jobCardId, file);
      setPhotos((prev) => [
        ...prev,
        { id: result.id, url: result.filePath, name: result.originalFilename },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRepairPhotoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      const result = await stockControlApiClient.uploadReadyPhoto(jobCardId, file);
      setRepairPhotos((prev) => [
        ...prev,
        { id: result.id, url: result.filePath, name: result.originalFilename },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload repair photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteJobCardJobFile(jobCardId, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  };

  const handleDeleteRepairPhoto = async (photoId: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteJobCardJobFile(jobCardId, photoId);
      setRepairPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
      e.target.value = "";
    }
  };

  const handleRepairFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRepairPhotoUpload(file);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await stockControlApiClient.submitQaReview(jobCardId, {
        rubberAccepted: applicability?.hasRubber ? rubberAccepted : null,
        paintAccepted: applicability?.hasPaint ? paintAccepted : null,
        notes: notes.trim() || null,
      });
      await loadData();
      onReviewSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit QA review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepairsComplete = async () => {
    try {
      setIsCompletingRepairs(true);
      setError(null);
      await stockControlApiClient.completeBackgroundStep(jobCardId, "qc_repairs");
      await loadData();
      onReviewSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete repairs");
    } finally {
      setIsCompletingRepairs(false);
    }
  };

  if (!qaReviewActive) {
    return null;
  }

  if (reviewState === "loading") {
    return (
      <div id="qa-review-section" className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">QA Review</h3>
        </div>
        <div className="py-8 text-center text-sm text-gray-500">Loading QA review data...</div>
      </div>
    );
  }

  if (!applicability?.hasRubber && !applicability?.hasPaint) {
    return (
      <div id="qa-review-section" className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">QA Review</h3>
        </div>
        <div className="py-8 text-center text-sm text-gray-500">
          No rubber or paint applicable for this job card.
        </div>
      </div>
    );
  }

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
        {error}
        <button onClick={() => setError(null)} className="ml-2 font-medium underline">
          Dismiss
        </button>
      </div>
    );
  };

  const renderDecisionSummary = () => {
    if (!latestDecision) return null;
    return (
      <>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">Reviewed by:</span>
          <span className="font-medium text-gray-900">
            {latestDecision.reviewedByName || "Unknown"}
          </span>
          <span className="text-gray-400">{formatDateZA(latestDecision.reviewedAt)}</span>
          <span className="text-gray-400">Cycle {latestDecision.cycleNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {latestDecision.rubberApplicable && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rubber:</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  latestDecision.rubberAccepted
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {latestDecision.rubberAccepted ? "Accepted" : "Rejected"}
              </span>
            </div>
          )}
          {latestDecision.paintApplicable && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Paint:</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  latestDecision.paintAccepted
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {latestDecision.paintAccepted ? "Accepted" : "Rejected"}
              </span>
            </div>
          )}
        </div>

        {latestDecision.notes && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Defect Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{latestDecision.notes}</p>
          </div>
        )}

        {defectPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Defect Photos</p>
            <div className="flex flex-wrap gap-2">
              {defectPhotos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-24 h-24 rounded-md overflow-hidden border border-gray-300 hover:border-blue-400 transition-colors"
                >
                  <img
                    src={photo.url}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderPhotoUploadButton = (inputRef: React.RefObject<HTMLInputElement | null>) => (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={isUploading}
      className="w-20 h-20 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50 transition-colors"
    >
      {isUploading ? (
        <span className="text-xs">...</span>
      ) : (
        <>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-[10px] mt-0.5">Photo</span>
        </>
      )}
    </button>
  );

  if (reviewState === "repairs" && latestDecision) {
    return (
      <div id="qa-review-section" className="rounded-lg border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">QA Repairs Required</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Repairs In Progress
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-0.5">
            Review the defects below, upload photos of repairs, then mark repairs as complete.
          </p>
        </div>

        {renderError()}

        <div className="px-5 py-4 space-y-4">
          {renderDecisionSummary()}

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-800">Upload Repair Photos</p>
            <div className="flex flex-wrap gap-2">
              {repairPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-300 group"
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeleteRepairPhoto(photo.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    X
                  </button>
                </div>
              ))}
              {renderPhotoUploadButton(repairFileInputRef)}
            </div>
            <input
              ref={repairFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleRepairFileChange}
              className="hidden"
            />
          </div>

          <button
            onClick={handleRepairsComplete}
            disabled={isCompletingRepairs}
            className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCompletingRepairs ? "Submitting..." : "Repairs Complete — Send Back to QA Review"}
          </button>
        </div>
      </div>
    );
  }

  if (reviewState === "submitted" && latestDecision) {
    const allAccepted =
      (!latestDecision.rubberApplicable || latestDecision.rubberAccepted === true) &&
      (!latestDecision.paintApplicable || latestDecision.paintAccepted === true);

    return (
      <div id="qa-review-section" className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">QA Review</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                allAccepted ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {allAccepted ? "Accepted" : "Rejected"}
            </span>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">{renderDecisionSummary()}</div>
      </div>
    );
  }

  if (!qaReviewActive) {
    return null;
  }

  return (
    <div id="qa-review-section" className="rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-200 bg-blue-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-blue-900">QA Review</h3>
        <p className="text-xs text-blue-700 mt-0.5">
          Review rubber and paint quality. Accept or reject each applicable item.
        </p>
      </div>

      {renderError()}

      <div className="px-5 py-4 space-y-4">
        {latestDecision && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Previous Review — Cycle {latestDecision.cycleNumber}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {latestDecision.rubberApplicable && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rubber:</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      latestDecision.rubberAccepted
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {latestDecision.rubberAccepted ? "Accepted" : "Rejected"}
                  </span>
                </div>
              )}
              {latestDecision.paintApplicable && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Paint:</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      latestDecision.paintAccepted
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {latestDecision.paintAccepted ? "Accepted" : "Rejected"}
                  </span>
                </div>
              )}
            </div>
            {latestDecision.notes && (
              <div className="rounded-md bg-white p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Defect Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{latestDecision.notes}</p>
              </div>
            )}
            {defectPhotos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Photos</p>
                <div className="flex flex-wrap gap-2">
                  {defectPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-24 h-24 rounded-md overflow-hidden border border-gray-300 hover:border-blue-400 transition-colors"
                    >
                      <img
                        src={photo.url}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {applicability?.hasRubber && (
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                Rubber
              </span>
              <span className="text-sm text-gray-700">Internal Rubber Lining</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRubberAccepted(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rubberAccepted === true
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                Accept
              </button>
              <button
                onClick={() => setRubberAccepted(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rubberAccepted === false
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {applicability?.hasPaint && (
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Paint
              </span>
              <span className="text-sm text-gray-700">Paint Coating System</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaintAccepted(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  paintAccepted === true
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                Accept
              </button>
              <button
                onClick={() => setPaintAccepted(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  paintAccepted === false
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {hasRejection && (
          <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium text-red-800">
              Describe the defects found (required for rejection)
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the defects..."
              rows={3}
              className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />

            <div>
              <p className="text-xs font-medium text-red-800 mb-2">Defect Photos (optional)</p>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-300 group"
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      X
                    </button>
                  </div>
                ))}
                {renderPhotoUploadButton(fileInputRef)}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit QA Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
