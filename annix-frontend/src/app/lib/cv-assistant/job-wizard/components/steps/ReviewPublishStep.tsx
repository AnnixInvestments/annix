"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { isApiError } from "@/app/lib/api/apiError";
import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import { useCvPublishJobDraft } from "@/app/lib/query/hooks";
import { JobPreviewCard } from "../JobPreviewCard";
import { StepShell } from "../StepShell";

export interface ReviewPublishStepProps {
  draft: JobPosting;
  onPublished: (job: JobPosting) => void;
  onFlush: () => Promise<void>;
}

interface ReadinessIssue {
  message: string;
}

const readinessIssues = (draft: JobPosting): ReadinessIssue[] => {
  const issues: ReadinessIssue[] = [];
  const trimmed = draft.title?.trim();
  if (!trimmed || trimmed === "Untitled draft") {
    issues.push({ message: "Job title is required" });
  }
  const draftDescription = draft.description;
  const description = draftDescription ? draftDescription : "";
  if (description.trim().length < 40) {
    issues.push({ message: "Description must be at least 40 characters" });
  }
  const draftLocation = draft.location;
  const draftProvince = draft.province;
  const draftEmploymentType = draft.employmentType;
  if (!draftLocation || !draftProvince) {
    issues.push({ message: "City and province are required" });
  }
  if (!draftEmploymentType) {
    issues.push({ message: "Employment type is required" });
  }
  return issues;
};

export function ReviewPublishStep({ draft, onPublished, onFlush }: ReviewPublishStepProps) {
  const publishMutation = useCvPublishJobDraft();
  const { showToast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const issues = readinessIssues(draft);
  const canPublish = issues.length === 0;

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsPublishing(true);
    try {
      await onFlush();
      const published = await publishMutation.mutateAsync(draft.id);
      showToast("Job published — candidates can now apply.", "success");
      onPublished(published);
    } catch (err) {
      const message =
        isApiError(err) && err.message ? err.message : "Could not publish. Please try again.";
      showToast(message, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <StepShell
        title="Review & Publish"
        subtitle="Phase 3 plugs in the live quality score (clarity / salary / inclusivity / matching). For now, basic readiness checks gate publish."
      >
        {issues.length > 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900 mb-2">Almost ready — fix these first:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
              {issues.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            All required fields are present. Click <strong>Publish</strong> to make this role
            visible.
          </div>
        )}

        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish || isPublishing}
          className="px-6 py-3 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg shadow-md hover:bg-[#FFB733] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? "Publishing…" : "Publish Job"}
        </button>
      </StepShell>

      <JobPreviewCard draft={draft} />
    </div>
  );
}
