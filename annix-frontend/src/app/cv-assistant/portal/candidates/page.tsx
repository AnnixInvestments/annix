"use client";

import { useMemo, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { type Candidate, cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useCvCandidateStatusUpdate,
  useCvCandidates,
  useCvJobPostings,
} from "@/app/lib/query/hooks";
import { UploadCvModal } from "../components/UploadCvModal";
import { CandidateDetailPanel } from "./components/CandidateDetailPanel";

type SortKey = "rank" | "name" | "score" | "status";
type SortDir = "asc" | "desc";
type TopN = 10 | 20 | 50 | "all";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "screening", label: "Screening" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "reference_check", label: "Reference Check" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  screening: "bg-yellow-100 text-yellow-800",
  shortlisted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  reference_check: "bg-[#e0e0f5] text-[#1a1a40]",
  accepted: "bg-emerald-100 text-emerald-800",
};

function statusColor(status: string): string {
  const color = STATUS_COLORS[status];
  return color || "bg-gray-100 text-gray-800";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

export default function CandidatesPage() {
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [topN, setTopN] = useState<TopN>(20);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [detailCandidateId, setDetailCandidateId] = useState<number | null>(null);

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const pdfPreview = usePdfPreview();

  const { data: candidates = [], isLoading: isLoadingCandidates } = useCvCandidates({
    jobPostingId: selectedJob !== "all" ? parseInt(selectedJob, 10) : null,
  });

  const { data: jobs = [] } = useCvJobPostings();
  const statusMutation = useCvCandidateStatusUpdate();

  const rankedCandidates = useMemo(() => {
    const filtered = candidates.filter((c) => {
      const score = c.matchScore;
      if (score !== null && (score < minScore || score > maxScore)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(c.status)) return false;
      return true;
    });

    const withRank = [...filtered]
      .sort((a, b) => {
        const aRaw = a.matchScore;
        const bRaw = b.matchScore;
        const aScore = aRaw === null ? -1 : aRaw;
        const bScore = bRaw === null ? -1 : bRaw;
        return bScore - aScore;
      })
      .map((c, i) => ({ ...c, rank: i + 1 }));

    const sorted = [...withRank].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "rank") return (a.rank - b.rank) * dir;
      if (sortKey === "name") {
        const aRawName = a.name;
        const bRawName = b.name;
        const aName = aRawName === null ? "" : aRawName;
        const bName = bRawName === null ? "" : bRawName;
        return aName.localeCompare(bName) * dir;
      }
      if (sortKey === "score") {
        const aRaw = a.matchScore;
        const bRaw = b.matchScore;
        const aScore = aRaw === null ? -1 : aRaw;
        const bScore = bRaw === null ? -1 : bRaw;
        return (aScore - bScore) * dir;
      }
      if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
      return 0;
    });

    if (topN === "all") return sorted;
    return sorted.slice(0, topN);
  }, [candidates, minScore, maxScore, selectedStatuses, sortKey, sortDir, topN]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleStatusChange = async (
    candidate: Candidate & { rank: number },
    targetStatus: string,
    label: string,
  ) => {
    const previousStatus = candidate.status;
    if (previousStatus === targetStatus) return;

    const confirmed = await confirm({
      title: `${label} candidate?`,
      message: `Change status from "${previousStatus.replace(/_/g, " ")}" to "${targetStatus.replace(/_/g, " ")}".`,
      confirmLabel: label,
      cancelLabel: "Cancel",
      variant: targetStatus === "rejected" ? "danger" : "default",
    });
    if (!confirmed) return;

    statusMutation.mutate(
      { id: candidate.id, status: targetStatus },
      {
        onSuccess: () => showToast(`Candidate ${label.toLowerCase()}`, "success"),
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Status update failed";
          showToast(message, "error");
        },
      },
    );
  };

  const handleViewCv = async (candidate: Candidate) => {
    const cvFilePath = candidate.cvFilePath;
    if (!cvFilePath) {
      showToast("No CV file on record", "warning");
      return;
    }
    const candidateName = candidate.name;
    const filename = `${candidateName || "candidate"}-cv.pdf`;
    pdfPreview.openWithFetch(async () => {
      const response = await cvAssistantApiClient.candidateCvUrl(candidate.id);
      const presignedUrl = response.url;
      if (!presignedUrl) {
        throw new Error("CV file unavailable");
      }
      const fetched = await fetch(presignedUrl);
      if (!fetched.ok) {
        throw new Error(`Failed to load CV (${fetched.status})`);
      }
      return fetched.blob();
    }, filename);
  };

  if (isLoadingCandidates) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288]" />
      </div>
    );
  }

  const totalCandidates = candidates.length;
  const visibleCount = rankedCandidates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidate Shortlist</h1>
          <p className="text-white/70 mt-1">
            Ranked by AI match score. Showing {visibleCount} of {totalCandidates} candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-lg hover:bg-[#252560] transition-colors"
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

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="job-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Job
            </label>
            <select
              id="job-filter"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            >
              <option value="all">All Jobs</option>
              {jobs.map((job) => {
                const refNumber = job.referenceNumber;
                const labelPrefix = refNumber ? `[${refNumber}] ` : "";
                return (
                  <option key={job.id} value={job.id}>
                    {labelPrefix}
                    {job.title}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="min-score" className="block text-sm font-medium text-gray-700 mb-1">
              Min Score
            </label>
            <input
              id="min-score"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="max-score" className="block text-sm font-medium text-gray-700 mb-1">
              Max Score
            </label>
            <input
              id="max-score"
              type="number"
              min={0}
              max={100}
              value={maxScore}
              onChange={(e) =>
                setMaxScore(Math.max(0, Math.min(100, Number(e.target.value) || 100)))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Top N</span>
            <div className="flex items-center gap-1 flex-wrap">
              {([10, 20, 50, "all"] as const).map((n) => {
                const isActive = topN === n;
                const labelText = n === "all" ? "All" : String(n);
                return (
                  <button
                    key={String(n)}
                    type="button"
                    onClick={() => setTopN(n)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#323288] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {labelText}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Status</span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isActive = selectedStatuses.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#e0e0f5] text-[#252560] border border-[#9999d6]"
                      : "bg-gray-50 text-gray-700 border border-[#e0e0f5] hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            {selectedStatuses.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStatuses(new Set())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader
                  label="Rank"
                  active={sortKey === "rank"}
                  dir={sortDir}
                  onClick={() => handleSort("rank")}
                />
                <SortHeader
                  label="Name"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => handleSort("name")}
                />
                <SortHeader
                  label="Match Score"
                  active={sortKey === "score"}
                  dir={sortDir}
                  onClick={() => handleSort("score")}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Strengths
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Gap
                </th>
                <SortHeader
                  label="Status"
                  active={sortKey === "status"}
                  dir={sortDir}
                  onClick={() => handleSort("status")}
                />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {totalCandidates === 0
                      ? "No candidates yet. Upload CVs to start ranking applicants."
                      : "No candidates match the current filters."}
                  </td>
                </tr>
              ) : (
                rankedCandidates.map((candidate) => {
                  const candidateName = candidate.name;
                  const candidateEmail = candidate.email;
                  const candidateScore = candidate.matchScore;
                  const analysis = candidate.matchAnalysis;
                  const matchedSkills = analysis ? analysis.skillsMatched : [];
                  const missingSkills = analysis ? analysis.skillsMissing : [];
                  const topStrengths = matchedSkills.slice(0, 3);
                  const topGap = missingSkills[0];
                  const jobPosting = candidate.jobPosting;
                  const jobTitle = jobPosting ? jobPosting.title : null;
                  const jobRef = jobPosting ? jobPosting.referenceNumber : null;
                  const candidateStatus = candidate.status;
                  const isFinalStatus =
                    candidateStatus === "accepted" || candidateStatus === "rejected";
                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#e0e0f5] text-[#252560] text-sm font-bold">
                          {candidate.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setDetailCandidateId(candidate.id)}
                          className="text-left"
                        >
                          <div className="text-sm font-medium text-gray-900 hover:text-[#252560]">
                            {candidateName || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">{candidateEmail || "-"}</div>
                          {jobTitle && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {jobRef ? `[${jobRef}] ` : ""}
                              {jobTitle}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidateScore !== null ? (
                          <span className={`text-lg font-bold ${scoreColor(candidateScore)}`}>
                            {candidateScore}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {topStrengths.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {topStrengths.map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {topGap ? (
                          <span className="inline-flex px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            {topGap}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(candidateStatus)}`}
                        >
                          {candidateStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => handleViewCv(candidate)}
                            className="text-[#323288] hover:text-[#252560] disabled:text-gray-300"
                            disabled={!candidate.cvFilePath}
                          >
                            View CV
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCandidateId(candidate.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Details
                          </button>
                          {!isFinalStatus && candidateStatus !== "shortlisted" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(candidate, "shortlisted", "Shortlist")
                              }
                              className="text-green-600 hover:text-green-700"
                            >
                              Shortlist
                            </button>
                          )}
                          {candidateStatus === "shortlisted" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(candidate, "screening", "Unshortlist")
                              }
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              Unshortlist
                            </button>
                          )}
                          {!isFinalStatus && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(candidate, "rejected", "Reject")}
                              className="text-red-600 hover:text-red-700"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && <UploadCvModal jobs={jobs} onClose={() => setShowUploadModal(false)} />}

      <CandidateDetailPanel
        candidateId={detailCandidateId}
        candidates={rankedCandidates}
        onClose={() => setDetailCandidateId(null)}
        onViewCv={handleViewCv}
      />

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />

      {ConfirmDialog}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}

function SortHeader(props: SortHeaderProps) {
  const { label, active, dir, onClick } = props;
  const indicator = active ? (dir === "asc" ? "▲" : "▼") : "";
  return (
    <th
      onClick={onClick}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-[10px]">{indicator}</span>
      </span>
    </th>
  );
}
