"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  type Candidate,
  type CandidateJobMatch,
  cvAssistantApiClient,
  type JobPosting,
} from "@/app/lib/api/cvAssistantApi";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<CandidateJobMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedJob, selectedStatus]);

  const fetchData = async () => {
    try {
      const [candidatesData, jobsData] = await Promise.all([
        cvAssistantApiClient.candidates({
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          jobPostingId: selectedJob !== "all" ? parseInt(selectedJob, 10) : undefined,
        }),
        cvAssistantApiClient.jobPostings(),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (candidateId: number, action: "reject" | "shortlist" | "accept") => {
    try {
      if (action === "reject") {
        await cvAssistantApiClient.rejectCandidate(candidateId);
      } else if (action === "shortlist") {
        await cvAssistantApiClient.shortlistCandidate(candidateId);
      } else {
        await cvAssistantApiClient.acceptCandidate(candidateId);
      }
      fetchData();
    } catch (error) {
      console.error("Failed to update candidate:", error);
    }
  };

  const handleViewMatches = useCallback(async (candidateId: number) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
      return;
    }
    setExpandedCandidate(candidateId);
    setIsLoadingMatches(true);
    try {
      const matches = await cvAssistantApiClient.recommendedJobsForCandidate(candidateId);
      setRecommendedJobs(matches);
    } catch (error) {
      console.error("Failed to fetch recommended jobs:", error);
      setRecommendedJobs([]);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [expandedCandidate]);

  const handleDismissMatch = async (matchId: number) => {
    try {
      await cvAssistantApiClient.dismissMatch(matchId);
      setRecommendedJobs((prev) => prev.filter((m) => m.id !== matchId));
    } catch (error) {
      console.error("Failed to dismiss match:", error);
    }
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

  if (isLoading) {
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
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function UploadCvModal({
  jobs,
  onClose,
  onSuccess,
}: {
  jobs: JobPosting[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedJobId) return;

    setIsUploading(true);
    setError(null);

    try {
      await cvAssistantApiClient.uploadCv(
        file,
        parseInt(selectedJobId, 10),
        email || undefined,
        name || undefined,
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Upload CV</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select a job...</option>
              {jobs
                .filter((j) => j.status === "active")
                .map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CV File (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file || !selectedJobId}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload & Process"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecommendedJobsPanel({
  matches,
  isLoading,
  onDismiss,
}: {
  matches: CandidateJobMatch[];
  isLoading: boolean;
  onDismiss: (matchId: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
        <span className="text-sm text-gray-500">Finding matching jobs...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">
        No job matches found. Matches are generated when embeddings are available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-violet-800">Recommended Jobs</h4>
      {matches.map((match) => {
        const job = match.externalJob;
        const scorePct = Math.round(match.overallScore * 100);
        const details = match.matchDetails;

        return (
          <div
            key={match.id}
            className="bg-white rounded-lg border border-violet-200 p-3 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    scorePct >= 70
                      ? "text-green-600"
                      : scorePct >= 40
                        ? "text-yellow-600"
                        : "text-gray-500"
                  }`}
                >
                  {scorePct}%
                </span>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {job?.title ?? "Unknown job"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                {job?.company && <span>{job.company}</span>}
                {job?.locationRaw && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>{job.locationRaw}</span>
                  </>
                )}
              </div>
              {details && (
                <div className="mt-1.5">
                  <p className="text-xs text-gray-600">{details.reasoning}</p>
                  {details.skillsMatched.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {details.skillsMatched.map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {details.skillsMissing.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {job?.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 hover:underline"
                >
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => onDismiss(match.id)}
                className="text-xs text-gray-400 hover:text-red-500"
                title="Dismiss"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
