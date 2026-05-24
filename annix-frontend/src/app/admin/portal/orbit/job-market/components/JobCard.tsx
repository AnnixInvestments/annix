"use client";

import type { ExternalJob } from "@/app/lib/api/annixOrbitApi";
import { fromISO } from "@/app/lib/datetime";

export function JobCard({ job }: { job: ExternalJob }) {
  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency ?? "ZAR";
    if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `From ${curr} ${min.toLocaleString()}`;
    return `Up to ${curr} ${max?.toLocaleString()}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = job.postedAt ? fromISO(job.postedAt).toFormat("d MMM yyyy") : null;
  const source = job.source;
  const vettingBadge = vettingBadgeFor(job);
  const vettingNotes = job.vettingNotes;
  const titleAttr = vettingNotes ?? undefined;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {job.company && <span>{job.company}</span>}
            {job.locationRaw && (
              <>
                <span className="text-gray-300">|</span>
                <span>{job.locationRaw}</span>
              </>
            )}
            {postedDate && (
              <>
                <span className="text-gray-300">|</span>
                <span>{postedDate}</span>
              </>
            )}
            {source && (
              <>
                <span className="text-gray-300">|</span>
                <span className="font-medium text-gray-700">via {source.name}</span>
              </>
            )}
          </div>
          {vettingBadge && (
            <div className="mt-2">
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full ${vettingBadge.className}`}
                title={titleAttr}
              >
                {vettingBadge.label}
              </span>
              {vettingNotes && <p className="mt-1 text-xs text-gray-500 italic">{vettingNotes}</p>}
            </div>
          )}
          {salary && <p className="mt-1 text-sm font-medium text-green-700">{salary}</p>}
          {job.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
          )}
          {job.category && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                {job.category}
              </span>
            </div>
          )}
        </div>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 flex-shrink-0 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

function vettingBadgeFor(job: ExternalJob): { label: string; className: string } | null {
  if (job.vettedAt == null) return null;
  if (job.acceptsZa === false) {
    return {
      label: "Excluded — SA residents ineligible",
      className: "bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (job.acceptsZa === null) {
    return {
      label: "Possibly restricted — review",
      className: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    };
  }
  return {
    label: "Open to SA residents",
    className: "bg-green-50 text-green-700 border border-green-200",
  };
}
