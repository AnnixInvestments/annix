"use client";

import { useState } from "react";
import type { SeekerRecommendedJob } from "@/app/lib/api/annixOrbitApi";

interface SeekerJobCardProps {
  match: SeekerRecommendedJob;
  onApply: (match: SeekerRecommendedJob) => void;
  onDismiss: (matchId: number) => void;
  onMuteCompany?: (company: string) => void;
  onMuteCategory?: (category: string) => void;
  isDismissing?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  adzuna: "via Adzuna",
  remotive: "via Remotive",
  dpsa: "via DPSA",
  executiveplacements: "via Executive Placements",
  jobplacements: "via Job Placements",
  jobmail: "via JobMail",
};

export function SeekerJobCard(props: SeekerJobCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const match = props.match;
  const job = match.job;
  const muteCompanyHandler = props.onMuteCompany;
  const muteCategoryHandler = props.onMuteCategory;
  const hasMuteOptions = Boolean(muteCompanyHandler) || Boolean(muteCategoryHandler);
  const overall = Math.round(match.overallScore * 100);
  const matchDetails = match.matchDetails;
  const detailsReasoning = matchDetails ? matchDetails.reasoning : null;
  const reasoning = detailsReasoning || null;
  const detailsMatchedSkills = matchDetails ? matchDetails.skillsMatched : null;
  const matchedSkills = detailsMatchedSkills || [];
  const detailsMissingSkills = matchDetails ? matchDetails.skillsMissing : null;
  const missingSkills = detailsMissingSkills || [];
  const provider = job.sourceProvider;
  const providerLabel = providerBadgeLabel(provider);
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const sourceUrl = job.sourceUrl;
  const sourceHref = sourceUrl || "#";

  const handleApply = () => {
    props.onApply(match);
  };

  const handleDismiss = () => {
    props.onDismiss(match.matchId);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-2">
            {job.company ? <span>{job.company}</span> : null}
            {job.locationRaw ? <span>· {job.locationRaw}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {providerLabel ? (
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              {providerLabel}
            </a>
          ) : null}
          {salaryLabel ? (
            <span className="text-sm font-medium text-emerald-700">{salaryLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">Match {overall}%</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, overall))}%` }}
            />
          </div>
        </div>
        {reasoning ? <p className="text-xs text-gray-500 mt-2">{reasoning}</p> : null}
      </div>

      {matchedSkills.length > 0 || missingSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {matchedSkills.slice(0, 6).map((skill) => (
            <span
              key={`matched-${skill}`}
              className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              {skill}
            </span>
          ))}
          {missingSkills.slice(0, 4).map((skill) => (
            <span
              key={`missing-${skill}`}
              className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={props.isDismissing}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Not for me
          </button>
          {hasMuteOptions ? (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="ml-2 text-sm text-gray-400 hover:text-gray-600"
                aria-label="More options"
              >
                ⋯
              </button>
              {menuOpen ? (
                <div className="absolute left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  {muteCompanyHandler && job.company ? (
                    <button
                      type="button"
                      onClick={() => {
                        const jobCompany = job.company;
                        if (jobCompany) muteCompanyHandler(jobCompany);
                        setMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Mute "{job.company}"
                    </button>
                  ) : null}
                  {muteCategoryHandler && job.category ? (
                    <button
                      type="button"
                      onClick={() => {
                        const jobCategory = job.category;
                        if (jobCategory) muteCategoryHandler(jobCategory);
                        setMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Hide "{job.category}" roles
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          View &amp; apply
        </button>
      </div>
    </div>
  );
}

function providerBadgeLabel(provider: string | null): string | null {
  if (!provider) return null;
  const lookup = PROVIDER_LABELS[provider];
  if (lookup) return lookup;
  return `via ${provider}`;
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "ZAR" ? "R" : currency ? `${currency} ` : "";
  if (min != null && max != null) {
    return `${symbol}${formatThousands(min)} - ${symbol}${formatThousands(max)}`;
  }
  if (min != null) return `From ${symbol}${formatThousands(min)}`;
  if (max != null) return `Up to ${symbol}${formatThousands(max)}`;
  return null;
}

function formatThousands(n: number): string {
  return Math.round(n).toLocaleString("en-ZA");
}
