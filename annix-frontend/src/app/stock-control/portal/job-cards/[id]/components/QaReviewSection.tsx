"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QaApplicability, QaReviewDecision } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface QaReviewSectionProps {
  jobCardId: number;
  onReviewSubmitted: () => void;
}

type ReviewState = "loading" | "form" | "submitted";

interface PhotoEntry {
  id: number;
  url: string;
  name: string;
}

export function QaReviewSection(props: QaReviewSectionProps) {
  const { jobCardId, onReviewSubmitted } = props;

  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [applicability, setApplicability] = useState<QaApplicability | null>(null);
  const [latestDecision, setLatestDecision] = useState<QaReviewDecision | null>(null);

  const [rubberAccepted, setRubberAccepted] = useState<boolean | null>(null);
  const [paintAccepted, setPaintAccepted] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [applicRes, decisionRes] = await Promise.all([
        stockControlApiClient.qaApplicability(jobCardId),
        stockControlApiClient.latestQaReview(jobCardId),
      ]);
      setApplicability(applicRes);
      setLatestDecision(decisionRes);

      if (decisionRes) {
        setReviewState("submitted");
      } else {
        setReviewState("form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QA review data");
      setReviewState("form");
    }
  }, [jobCardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const result = await stockControlApiClient.uploadQaReviewPhoto(jobCardId, file);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
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
                allAccepted
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {allAccepted ? "Accepted" : "Rejected"}
            </span>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
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
        </div>
      </div>
    );
  }

  return (
    <div id="qa-review-section" className="rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-200 bg-blue-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-blue-900">QA Review</h3>
        <p className="text-xs text-blue-700 mt-0.5">
          Review rubber and paint quality. Accept or reject each applicable item.
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="px-5 py-4 space-y-4">
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
              <p className="text-xs font-medium text-red-800 mb-2">
                Defect Photos (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-300"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-20 h-20 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
