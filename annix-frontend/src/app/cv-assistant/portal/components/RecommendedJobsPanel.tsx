"use client";

import type { CandidateJobMatch } from "@/app/lib/api/cvAssistantApi";

export function RecommendedJobsPanel({ matches, isLoading, onDismiss }: { matches: CandidateJobMatch[]; isLoading: boolean; onDismiss: (matchId: number) => void }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
        <span className="text-sm text-gray-500">Finding matching jobs...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No job matches found. Matches are generated when embeddings are available.</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-violet-800">Recommended Jobs</h4>
      {matches.map((match) => {
        const job = match.externalJob;
        const scorePct = Math.round(match.overallScore * 100);
        const details = match.matchDetails;
        return (
          <div key={match.id} className="bg-white rounded-lg border border-violet-200 p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${scorePct >= 70 ? "text-green-600" : scorePct >= 40 ? "text-yellow-600" : "text-gray-500"}`}>{scorePct}%</span>
                <span className="text-sm font-medium text-gray-900 truncate">{job?.title ?? "Unknown job"}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                {job?.company && <span>{job.company}</span>}
                {job?.locationRaw && (<><span className="text-gray-300">|</span><span>{job.locationRaw}</span></>)}
              </div>
              {details && (
                <div className="mt-1.5">
                  <p className="text-xs text-gray-600">{details.reasoning}</p>
                  {details.skillsMatched.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {details.skillsMatched.map((skill) => (<span key={skill} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">{skill}</span>))}
                      {details.skillsMissing.slice(0, 3).map((skill) => (<span key={skill} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">{skill}</span>))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {job?.sourceUrl && (<a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline">View</a>)}
              <button type="button" onClick={() => onDismiss(match.id)} className="text-xs text-gray-400 hover:text-red-500" title="Dismiss">&times;</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
