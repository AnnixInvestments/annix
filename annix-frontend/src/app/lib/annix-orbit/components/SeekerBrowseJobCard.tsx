"use client";

import { sourceNameFromUrl } from "@/app/lib/annix-orbit/provider-labels";
import type { PublicJob } from "@/app/lib/api/annixOrbitApi";
import { formatDateZA } from "@/app/lib/datetime";

interface SeekerBrowseJobCardProps {
  job: PublicJob;
  onApply: (job: PublicJob) => void;
  onReportDelisted?: (externalJobId: number) => void;
}

export function SeekerBrowseJobCard(props: SeekerBrowseJobCardProps) {
  const job = props.job;
  const salaryLabel = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedAt = job.postedAt;
  const postedLabel = postedAt ? formatDateZA(postedAt) : null;
  const sourceUrl = job.sourceUrl;
  const kindLabel = job.kind === "annix" ? "Posted on Annix" : "External listing";
  const reportDelisted = props.onReportDelisted;
  const isExternal = job.kind === "external";
  const canReportDelisted = Boolean(reportDelisted && isExternal && sourceUrl);

  const handleReportDelisted = () => {
    if (reportDelisted) reportDelisted(job.id);
  };
  const rawLocation = job.locationRaw;
  const rawLocationArea = job.locationArea;
  const location = rawLocation || rawLocationArea || null;
  const rawDescription = job.description;
  const descriptionPreview = rawDescription ? rawDescription.trim() : "";
  const skills = job.extractedSkills;
  const visibleSkills = skills.slice(0, 6);
  const extraSkillCount = skills.length - visibleSkills.length;

  const isAnnixJob = job.kind === "annix";
  const applyLabel = isAnnixJob ? "View & apply" : `Apply on ${sourceNameFromUrl(sourceUrl)}`;

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

      {descriptionPreview ? (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{descriptionPreview}</p>
      ) : null}

      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={`skill-${skill}`}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200"
            >
              {skill}
            </span>
          ))}
          {extraSkillCount > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              +{extraSkillCount} more
            </span>
          ) : null}
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
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
          >
            {applyLabel}
          </a>
        ) : (
          <span className="text-sm text-gray-400">No apply link</span>
        )}
      </div>

      {canReportDelisted ? (
        <div className="mt-2 border-t border-gray-100 pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleReportDelisted}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600"
          >
            <span aria-hidden="true">⚑</span>
            Job Delisted
          </button>
        </div>
      ) : null}
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
