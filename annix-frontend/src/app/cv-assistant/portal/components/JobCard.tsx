"use client";

import { useState } from "react";
import type { CandidateJobMatch, ExternalJob } from "@/app/lib/api/cvAssistantApi";
import { fromISO } from "@/app/lib/datetime";
import { useCvMatchingCandidates } from "@/app/lib/query/hooks";

export function JobCard({ job }: { job: ExternalJob }) {
  const [showCandidates, setShowCandidates] = useState(false);

  const { data: matchingCandidates = [], isLoading: isLoadingCandidates } = useCvMatchingCandidates(
    showCandidates ? job.id : null,
  );

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency ?? "ZAR";
    if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `From ${curr} ${min.toLocaleString()}`;
    return `Up to ${curr} ${max?.toLocaleString()}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = job.postedAt ? fromISO(job.postedAt).toFormat("d MMM yyyy") : null;

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
          </div>
          {salary && <p className="mt-1 text-sm font-medium text-green-700">{salary}</p>}
          {job.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {job.category && (
              <span className="px-2 py-0.5 text-xs bg-violet-50 text-violet-700 rounded-full">
                {job.category}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowCandidates(!showCandidates)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                showCandidates
                  ? "bg-violet-100 text-violet-700 font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-600"
              }`}
            >
              Matching Candidates
            </button>
          </div>
        </div>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 flex-shrink-0 px-3 py-1.5 text-sm text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            View
          </a>
        )}
      </div>
      {showCandidates && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {isLoadingCandidates ? (
            <div className="flex items-center gap-2 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600" />
              <span className="text-xs text-gray-500">Finding matching candidates...</span>
            </div>
          ) : matchingCandidates.length === 0 ? (
            <p className="text-xs text-gray-500 py-1">No matching candidates found.</p>
          ) : (
            <div className="space-y-2">
              {matchingCandidates.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: CandidateJobMatch }) {
  const candidate = match.candidate;
  const scorePct = Math.round(match.overallScore * 100);

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-bold ${
            scorePct >= 70 ? "text-green-600" : scorePct >= 40 ? "text-yellow-600" : "text-gray-500"
          }`}
        >
          {scorePct}%
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">{candidate?.name ?? "Unknown"}</p>
          <p className="text-xs text-gray-500">{candidate?.email ?? ""}</p>
        </div>
      </div>
      {match.matchDetails && (
        <div className="flex flex-wrap gap-1">
          {match.matchDetails.skillsMatched.slice(0, 3).map((skill) => (
            <span key={skill} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
