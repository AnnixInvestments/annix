"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { Download } from "lucide-react";
import { useState } from "react";
import { annixOrbitApiClient, type JobPosting } from "@/app/lib/api/annixOrbitApi";
import { isApiError } from "@/app/lib/api/apiError";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useOrbitClearTestCandidates,
  useOrbitPublishJobDraft,
  useOrbitSeedTestCandidates,
} from "@/app/lib/query/hooks";
import { useNixCall } from "../../hooks/useNixCall";
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

const formatSalaryRange = (
  min: number | null,
  max: number | null,
  currency: string,
): string | null => {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-ZA")}`;
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)} / month`;
  if (min != null) return `from ${fmt(min)} / month`;
  return `up to ${fmt(max as number)} / month`;
};

const readableTimeframe = (timeframe: string): string =>
  timeframe === "3_months" ? "By 3 months" : "By 12 months";

const cleanFilenamePart = (value: string): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "job-post";
};

const jobPostDownloadText = (draft: JobPosting): string => {
  const title = draft.title && draft.title !== "Untitled draft" ? draft.title : "Untitled role";
  const location = draft.location;
  const province = draft.province;
  const employmentType = draft.employmentType;
  const workMode = draft.workMode;
  const draftSalaryCurrency = draft.salaryCurrency;
  const salaryCurrency = draftSalaryCurrency || "ZAR";
  const salaryRange = formatSalaryRange(draft.salaryMin, draft.salaryMax, salaryCurrency);
  const description = draft.description;
  const draftSuccessMetrics = draft.successMetrics;
  const successMetrics = draftSuccessMetrics || [];
  const draftSkills = draft.skills;
  const skills = draftSkills || [];
  const requiredEducation = draft.requiredEducation;
  const draftRequiredCertifications = draft.requiredCertifications;
  const requiredCertifications = draftRequiredCertifications || [];
  const minExperienceYears = draft.minExperienceYears;
  const applyByEmail = draft.applyByEmail;

  const locationLine = [location, province, employmentType, workMode].filter(Boolean).join(" | ");
  const successLines = successMetrics.map(
    (metric) => `- ${readableTimeframe(metric.timeframe)}: ${metric.metric}`,
  );
  const skillLines = skills.map((skill) => {
    const importance = skill.importance;
    const proficiency = skill.proficiency;
    return `- ${skill.name} (${importance}, ${proficiency})`;
  });
  const requirementLines = [
    minExperienceYears != null ? `Minimum experience: ${minExperienceYears} years` : null,
    requiredEducation ? `Education: ${requiredEducation}` : null,
    requiredCertifications.length > 0
      ? `Certifications: ${requiredCertifications.join(", ")}`
      : null,
  ].filter(Boolean);

  return [
    title,
    locationLine,
    salaryRange,
    "",
    description || "No description added yet.",
    "",
    successLines.length > 0 ? "What success looks like" : null,
    successLines.length > 0 ? successLines.join("\n") : null,
    "",
    skillLines.length > 0 ? "Skills" : null,
    skillLines.length > 0 ? skillLines.join("\n") : null,
    "",
    requirementLines.length > 0 ? "Requirements" : null,
    requirementLines.length > 0 ? requirementLines.join("\n") : null,
    "",
    applyByEmail ? `Apply by email: ${applyByEmail}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export function ReviewPublishStep({ draft, onPublished, onFlush }: ReviewPublishStepProps) {
  const publishMutation = useOrbitPublishJobDraft();
  const seedMutation = useOrbitSeedTestCandidates();
  const clearTestMutation = useOrbitClearTestCandidates();
  const qualityScoreMutation = useNixCall({
    operation: "quality-score",
    label: "Nix is scoring your job post…",
    fn: (id: number) => annixOrbitApiClient.nixQualityScore(id),
  });
  const volumeMutation = useNixCall({
    operation: "volume-prediction",
    label: "Nix is predicting candidate volume…",
    fn: (id: number) => annixOrbitApiClient.nixPredictedVolume(id),
  });
  const { alert, AlertDialog } = useAlert();
  const [isPublishing, setIsPublishing] = useState(false);
  const [seedCountInput, setSeedCountInput] = useState("10");

  const issues = readinessIssues(draft);
  const canPublish = issues.length === 0;
  const isPublished = draft.status === "active";
  const isTestMode = Boolean(draft.testMode);
  const qualityData = qualityScoreMutation.data;
  const isScoring = qualityScoreMutation.isPending;
  const volumeData = volumeMutation.data;
  const isPredicting = volumeMutation.isPending;
  const handleScore = async () => {
    await onFlush();
    qualityScoreMutation.mutate(draft.id, {
      onError: () =>
        alert({ message: "Couldn't fetch quality score. Try again.", variant: "error" }),
    });
  };
  const handlePredict = async () => {
    await onFlush();
    volumeMutation.mutate(draft.id, {
      onError: () => alert({ message: "Couldn't predict volume. Try again.", variant: "error" }),
    });
  };

  const handlePublish = async (testMode: boolean) => {
    if (!canPublish) return;
    setIsPublishing(true);
    try {
      await onFlush();
      const published = await publishMutation.mutateAsync({ id: draft.id, testMode });
      const message = testMode
        ? "Job published in TEST MODE — no external portals were notified. Seed fake applicants below to walk through the company flow."
        : "Job published — it's live on your Annix Orbit careers page and jobs feed. External job boards aren't connected yet.";
      alert({ message, variant: "success" });
      if (!testMode) {
        onPublished(published);
      }
    } catch (err) {
      const message =
        isApiError(err) && err.message ? err.message : "Could not publish. Please try again.";
      alert({ message, variant: "error" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSeed = () => {
    const parsed = Number.parseInt(seedCountInput, 10);
    const safeCount = Number.isFinite(parsed) ? Math.max(1, Math.min(50, parsed)) : 10;
    seedMutation.mutate(
      { id: draft.id, count: safeCount },
      {
        onSuccess: (data) => {
          const summary = entries(data.byProfile)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${v} ${k}`)
            .join(", ");
          alert({
            message: `Seeded ${data.created} test applicants — ${summary}.`,
            variant: "success",
          });
        },
        onError: () =>
          alert({ message: "Couldn't seed test candidates. Try again.", variant: "error" }),
      },
    );
  };

  const handleClearTestCandidates = () => {
    clearTestMutation.mutate(draft.id, {
      onSuccess: (data) => {
        alert({ message: `Cleared ${data.deleted} test applicants.`, variant: "success" });
      },
      onError: () =>
        alert({ message: "Couldn't clear test candidates. Try again.", variant: "error" }),
    });
  };

  const handleDownloadJobPost = async () => {
    await onFlush();
    const text = jobPostDownloadText(draft);
    const title = draft.title && draft.title !== "Untitled draft" ? draft.title : "job-post";
    const filename = `${cleanFilenamePart(title)}-${draft.id}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {AlertDialog}
      <StepShell
        title="Review & Publish"
        subtitle="Get Nix to score this post — clarity, salary fit, candidate attraction, screening strength, matching readiness, and inclusivity."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleScore}
            disabled={isScoring}
            className="text-sm px-4 py-2 bg-[#252560] text-white font-semibold rounded-lg hover:bg-[#1a1a40] transition-all disabled:opacity-50"
          >
            {isScoring ? "Nix scoring…" : qualityData ? "Re-score with Nix" : "Score with Nix"}
          </button>
          <button
            type="button"
            onClick={handlePredict}
            disabled={isPredicting}
            className="text-sm px-4 py-2 bg-[#FF8A00] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FF9C33] transition-all disabled:opacity-50"
          >
            {isPredicting
              ? "Estimating…"
              : volumeData
                ? "Re-estimate volume"
                : "Estimate candidate volume"}
          </button>
        </div>

        {qualityData ? <QualityScoreCard data={qualityData} /> : null}
        {volumeData ? <VolumePredictionCard data={volumeData} /> : null}

        {issues.length > 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900 mb-2">Almost ready — fix these first:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
              {issues.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : !isPublished ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-1">
            <p className="font-semibold">All required fields are present.</p>
            <p>
              Publishing makes this job live on your Annix Orbit careers page and includes it in
              your Orbit jobs feed. External job boards (Indeed, LinkedIn, PNet, etc.) aren&apos;t
              connected yet, so reach is limited to your own page and feed for now.
            </p>
          </div>
        ) : null}

        {isPublished && isTestMode ? (
          <div className="rounded-lg border border-purple-300 bg-purple-50 p-4 text-sm text-purple-900 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 text-xs font-bold">
              TEST MODE
            </span>
            <span>
              This job is published internally only — external portals were skipped. Seed fake
              applicants below to walk through the company flow.
            </span>
          </div>
        ) : null}

        {!isPublished ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handlePublish(false)}
              disabled={!canPublish || isPublishing}
              className="px-6 py-3 bg-[#FF8A00] text-[#1a1a40] font-semibold rounded-lg shadow-md hover:bg-[#FF9C33] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? "Publishing…" : "Publish to Annix Orbit"}
            </button>
            <button
              type="button"
              onClick={() => handlePublish(true)}
              disabled={!canPublish || isPublishing}
              className="px-6 py-3 bg-[#252560] text-white font-semibold rounded-lg shadow-md hover:bg-[#1a1a40] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? "Publishing…" : "Publish in TEST MODE (no external portals)"}
            </button>
          </div>
        ) : null}

        {isPublished && isTestMode ? (
          <div className="rounded-lg border border-[#252560]/30 bg-white p-4 space-y-3">
            <div>
              <p className="font-semibold text-[#1a1a40]">Seed fake applicants</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Generates a synthetic spread (~30% strong, 30% borderline, 30% weak, 10%
                disqualified) so you can walk through the company-side review, screening and
                reference flows. All emails use @example.com and phones use the +27 11 000 exchange.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Count:
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={seedCountInput}
                  onChange={(e) => setSeedCountInput(e.target.value)}
                  onBlur={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (!Number.isFinite(parsed)) {
                      setSeedCountInput("10");
                      return;
                    }
                    const clamped = Math.max(1, Math.min(50, parsed));
                    setSeedCountInput(String(clamped));
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                />
              </label>
              <button
                type="button"
                onClick={handleSeed}
                disabled={seedMutation.isPending}
                className="text-xs px-3 py-1.5 bg-[#FF8A00] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FF9C33] transition-all disabled:opacity-50"
              >
                {seedMutation.isPending ? "Seeding…" : "Seed test applicants"}
              </button>
              <button
                type="button"
                onClick={handleClearTestCandidates}
                disabled={clearTestMutation.isPending}
                className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {clearTestMutation.isPending ? "Clearing…" : "Clear all test applicants"}
              </button>
            </div>
          </div>
        ) : null}
      </StepShell>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#252560]/30 bg-white px-5 py-4 shadow-md">
          <div>
            <p className="text-sm font-semibold text-[#1a1a40]">Candidate-facing preview</p>
            <p className="text-xs text-gray-600">
              Download this advert as a text file for email or manual posting elsewhere.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadJobPost}
            className="inline-flex items-center gap-2 rounded-lg bg-[#252560] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a1a40]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download post
          </button>
        </div>
        <JobPreviewCard draft={draft} />
      </div>
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

interface VolumePredictionCardProps {
  data: {
    expectedApplicants: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    factors: string[];
    warnings: string[];
  };
}

function VolumePredictionCard({ data }: VolumePredictionCardProps) {
  const confidencePct = Math.round(data.confidence * 100);
  return (
    <div className="rounded-lg bg-gradient-to-br from-[#252560]/5 to-[#FF8A00]/10 border border-[#252560]/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">
          Market-norm volume estimate
        </span>
        <span className="text-xs text-gray-500">Nix confidence {confidencePct}%</span>
      </div>
      <p className="text-xs text-gray-600">
        What a role like this typically attracts in the SA market if broadly advertised — not a
        prediction of your Annix Orbit reach. External job boards aren&apos;t connected yet, so
        expect fewer applicants.
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded p-2 border border-[#e0e0f5]">
          <div className="text-xs text-gray-500">Lower</div>
          <div className="text-base font-semibold text-[#1a1a40]">{data.lowerBound}</div>
        </div>
        <div className="bg-[#FF8A00]/10 rounded p-2 border border-[#FF8A00]/40">
          <div className="text-xs text-gray-500">Market norm</div>
          <div className="text-2xl font-bold text-[#1a1a40]">{data.expectedApplicants}</div>
        </div>
        <div className="bg-white rounded p-2 border border-[#e0e0f5]">
          <div className="text-xs text-gray-500">Upper</div>
          <div className="text-base font-semibold text-[#1a1a40]">{data.upperBound}</div>
        </div>
      </div>
      {data.factors.length > 0 ? (
        <section>
          <p className="text-sm font-semibold text-[#1a1a40] mb-1">Drivers</p>
          <ul className="list-disc pl-5 space-y-0.5 text-sm text-gray-700">
            {data.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.warnings.length > 0 ? (
        <section>
          <p className="text-sm font-semibold text-amber-800 mb-1">Caveats</p>
          <ul className="list-disc pl-5 space-y-0.5 text-sm text-amber-900">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
