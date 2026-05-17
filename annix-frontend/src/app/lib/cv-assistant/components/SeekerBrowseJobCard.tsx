"use client";

import type { PublicJob } from "@/app/lib/api/cvAssistantApi";
import { formatDateZA } from "@/app/lib/datetime";

interface SeekerBrowseJobCardProps {
  job: PublicJob;
  onApply: (job: PublicJob) => void;
}

export function SeekerBrowseJobCard(props: SeekerBrowseJobCardProps) {
  const job = props.job;
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedAt = job.postedAt;
  const postedLabel = postedAt ? formatDateZA(postedAt) : null;
  const sourceUrl = job.sourceUrl;
  const sourceHref = sourceUrl || "#";
  const kindLabel = job.kind === "annix" ? "Posted on Annix" : "External listing";
  const rawLocation = job.locationRaw;
  const rawLocationArea = job.locationArea;
  const location = rawLocation || rawLocationArea || null;

  const handleApply = () => {
    props.onApply(job);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-2">
            {job.company ? <span>{job.company}</span> : null}
            {location ? <span>· {location}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-500">{kindLabel}</span>
          {salaryLabel ? (
            <span className="text-sm font-medium text-emerald-700">{salaryLabel}</span>
          ) : null}
        </div>
      </div>

      {job.extractedSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.extractedSkills.slice(0, 6).map((skill) => (
            <span
              key={`skill-${skill}`}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        {postedLabel ? (
          <span className="text-xs text-gray-500">Posted {postedLabel}</span>
        ) : (
          <span />
        )}
        {sourceUrl ? (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            View &amp; apply
          </a>
        ) : (
          <span className="text-sm text-gray-400">No apply link</span>
        )}
      </div>
    </div>
  );
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
