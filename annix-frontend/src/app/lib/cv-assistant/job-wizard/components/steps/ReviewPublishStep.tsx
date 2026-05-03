"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { isApiError } from "@/app/lib/api/apiError";
import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import { useCvNixQualityScore, useCvPublishJobDraft } from "@/app/lib/query/hooks";
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
  const qualityScoreMutation = useCvNixQualityScore();
  const { showToast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const issues = readinessIssues(draft);
  const canPublish = issues.length === 0;
  const qualityData = qualityScoreMutation.data;
  const isScoring = qualityScoreMutation.isPending;
  const handleScore = async () => {
    await onFlush();
    qualityScoreMutation.mutate(draft.id, {
      onError: () => showToast("Couldn't fetch quality score. Try again.", "error"),
    });
  };

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
        subtitle="Get Nix to score this post — clarity, salary fit, candidate attraction, screening strength, matching readiness, and inclusivity."
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleScore}
            disabled={isScoring}
            className="text-sm px-4 py-2 bg-[#252560] text-white font-semibold rounded-lg hover:bg-[#1a1a40] transition-all disabled:opacity-50"
          >
            {isScoring ? "Nix scoring…" : qualityData ? "Re-score with Nix" : "Score with Nix"}
          </button>
        </div>

        {qualityData ? <QualityScoreCard data={qualityData} /> : null}

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

interface QualityScoreCardProps {
  data: {
    totalScore: number;
    clarity: number;
    salaryCompetitiveness: number;
    candidateAttraction: number;
    screeningStrength: number;
    matchingReadiness: number;
    inclusivity: number;
    criticalIssues: string[];
    recommendedFixes: string[];
    flaggedTerms: Array<{
      term: string;
      category: "gendered" | "age_coded" | "ableist" | "national_origin" | "other";
      replacement: string;
      explanation: string;
    }>;
    readyToPost: boolean;
  };
}

function QualityScoreCard({ data }: QualityScoreCardProps) {
  const totalColor = data.totalScore >= 70 ? "emerald" : data.totalScore >= 50 ? "amber" : "red";
  const dimensions: Array<{ key: keyof typeof data; label: string }> = [
    { key: "clarity", label: "Clarity" },
    { key: "salaryCompetitiveness", label: "Salary fit" },
    { key: "candidateAttraction", label: "Attraction" },
    { key: "screeningStrength", label: "Screening" },
    { key: "matchingReadiness", label: "Matching" },
    { key: "inclusivity", label: "Inclusivity" },
  ];

  return (
    <div className="rounded-lg bg-[#f5f5fc] border border-[#e0e0f5] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Nix Quality Score</span>
        <span
          className={`text-2xl font-bold ${
            totalColor === "emerald"
              ? "text-emerald-700"
              : totalColor === "amber"
                ? "text-amber-700"
                : "text-red-700"
          }`}
        >
          {data.totalScore}/100
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {dimensions.map((d) => {
          const value = data[d.key] as number;
          return (
            <div key={d.key} className="bg-white rounded p-2 border border-[#e0e0f5]">
              <div className="text-xs text-gray-500">{d.label}</div>
              <div className="text-sm font-semibold text-[#1a1a40]">{value}/10</div>
            </div>
          );
        })}
      </div>

      {data.criticalIssues.length > 0 ? (
        <section>
          <p className="text-sm font-semibold text-red-800 mb-1">Critical issues</p>
          <ul className="list-disc pl-5 space-y-0.5 text-sm text-red-800">
            {data.criticalIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.recommendedFixes.length > 0 ? (
        <section>
          <p className="text-sm font-semibold text-[#1a1a40] mb-1">Recommended fixes</p>
          <ul className="list-disc pl-5 space-y-0.5 text-sm text-gray-700">
            {data.recommendedFixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.flaggedTerms.length > 0 ? (
        <section>
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Inclusive-language suggestions
          </p>
          <ul className="space-y-1 text-sm text-amber-900">
            {data.flaggedTerms.map((term) => (
              <li key={term.term}>
                <span className="font-mono bg-white border border-amber-300 px-1 rounded">
                  {term.term}
                </span>{" "}
                → <strong>{term.replacement}</strong> · {term.explanation}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
