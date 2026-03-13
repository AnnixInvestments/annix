"use client";

import { Fragment, useState } from "react";
import {
  useCvCandidateAction,
  useCvCandidates,
  useCvDismissMatch,
  useCvJobPostings,
  useCvRecommendedJobs,
} from "@/app/lib/query/hooks";
import { UploadCvModal } from "../components/UploadCvModal";
import { RecommendedJobsPanel } from "../components/RecommendedJobsPanel";

export default function CandidatesPage() {
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);

  const { data: candidates = [], isLoading: isLoadingCandidates } = useCvCandidates({
    status: selectedStatus !== "all" ? selectedStatus : null,
    jobPostingId: selectedJob !== "all" ? parseInt(selectedJob, 10) : null,
  });

  const { data: jobs = [] } = useCvJobPostings();

  const { data: recommendedJobs = [], isLoading: isLoadingMatches } =
    useCvRecommendedJobs(expandedCandidate);

  const candidateAction = useCvCandidateAction();
  const dismissMatch = useCvDismissMatch();

  const handleAction = (candidateId: number, action: "reject" | "shortlist" | "accept") => {
    candidateAction.mutate({ id: candidateId, action });
  };

  const handleViewMatches = (candidateId: number) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(candidateId);
    }
  };

  const handleDismissMatch = (matchId: number) => {
    dismissMatch.mutate(matchId);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      screening: "bg-yellow-100 text-yellow-800",
      shortlisted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      reference_check: "bg-purple-100 text-purple-800",
      accepted: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoadingCandidates) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600 mt-1">Review and manage candidate applications</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload CV
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="screening">Screening</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="reference_check">Reference Check</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No candidates found. Upload CVs to get started.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <Fragment key={candidate.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">{candidate.email || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.jobPosting?.title || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.matchScore !== null ? (
                          <div className="flex items-center">
                            <span
                              className={`text-sm font-bold ${
                                candidate.matchScore >= 80
                                  ? "text-green-600"
                                  : candidate.matchScore >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {candidate.matchScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {candidate.matchAnalysis ? (
                          <div className="flex flex-wrap gap-1">
                            {candidate.matchAnalysis.skillsMatched.slice(0, 2).map((skill, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {candidate.matchAnalysis.skillsMissing.slice(0, 1).map((skill, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(candidate.status)}`}
                        >
                          {candidate.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewMatches(candidate.id)}
                            className={`text-sm ${
                              expandedCandidate === candidate.id
                                ? "text-violet-700 font-medium"
                                : "text-violet-600 hover:text-violet-700"
                            }`}
                          >
                            Matches
                          </button>
                          {candidate.status !== "accepted" && candidate.status !== "rejected" && (
                            <>
                              {candidate.status !== "shortlisted" &&
                                candidate.status !== "reference_check" && (
                                  <button
                                    onClick={() => handleAction(candidate.id, "shortlist")}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    Shortlist
                                  </button>
                                )}
                              {(candidate.status === "shortlisted" ||
                                candidate.status === "reference_check") && (
                                <button
                                  onClick={() => handleAction(candidate.id, "accept")}
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  Accept
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(candidate.id, "reject")}
                                className="text-red-600 hover:text-red-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedCandidate === candidate.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-violet-50">
                          <RecommendedJobsPanel
                            matches={recommendedJobs}
                            isLoading={isLoadingMatches}
                            onDismiss={handleDismissMatch}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <UploadCvModal
          jobs={jobs}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
