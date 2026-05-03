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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const pdfPreview = usePdfPreview();

  const { data: candidates = [], isLoading: isLoadingCandidates } = useCvCandidates({
    jobPostingId: selectedJob !== "all" ? parseInt(selectedJob, 10) : null,
  });

  const { data: jobs = [] } = useCvJobPostings();
  const statusMutation = useCvCandidateStatusUpdate();

  const rejectedCount = useMemo(
    () => candidates.filter((c) => c.status === "rejected").length,
    [candidates],
  );
  const showingRejected = selectedStatuses.has("rejected");

  const rankedCandidates = useMemo(() => {
    const filtered = candidates.filter((c) => {
      const score = c.matchScore;
      if (score !== null && (score < minScore || score > maxScore)) return false;
      if (selectedStatuses.size > 0) {
        if (!selectedStatuses.has(c.status)) return false;
      } else if (c.status === "rejected") {
        return false;
      }
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

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (visibleIds: number[]) => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = async (
    targetStatus: string,
    label: string,
    variant: "default" | "danger" | "warning" = "default",
  ) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const confirmed = await confirm({
      title: `${label} ${ids.length} candidate${ids.length === 1 ? "" : "s"}?`,
      message: `This will set every selected candidate's status to "${targetStatus.replace(/_/g, " ")}". The matching email template will be sent to each.`,
      confirmLabel: `${label} ${ids.length}`,
      cancelLabel: "Cancel",
      variant,
    });
    if (!confirmed) return;

    setBulkPending(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => statusMutation.mutateAsync({ id, status: targetStatus })),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (failed === 0) {
        showToast(
          `${succeeded} candidate${succeeded === 1 ? "" : "s"} ${label.toLowerCase()}.`,
          "success",
        );
      } else {
        showToast(
          `${succeeded} updated, ${failed} failed. Check the candidates list and retry the rest.`,
          "warning",
        );
      }
      clearSelection();
    } finally {
      setBulkPending(false);
    }
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
          <h1 className="text-2xl font-bold text-white">
            {showingRejected ? "Rejected applicants" : "Candidate Shortlist"}
          </h1>
          <p className="text-white/70 mt-1">
            Ranked by AI match score. Showing {visibleCount} of {totalCandidates} candidates.
            {!showingRejected && rejectedCount > 0 ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setSelectedStatuses(new Set(["rejected"]))}
                  className="underline hover:text-white"
                >
                  {rejectedCount} rejected hidden — view rejected
                </button>
              </>
            ) : null}
            {showingRejected ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setSelectedStatuses(new Set())}
                  className="underline hover:text-white"
                >
                  ← back to active shortlist
                </button>
              </>
            ) : null}
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

      {selectedIds.size > 0 ? (
        <div className="bg-[#252560] text-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-white/70 hover:text-white underline"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkStatusChange("shortlisted", "Shortlist")}
              disabled={bulkPending}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              Shortlist selected
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange("screening", "Move to screening", "warning")}
              disabled={bulkPending}
              className="px-3 py-1.5 text-xs font-semibold bg-yellow-500 text-[#1a1a40] rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              Move to screening
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange("reference_check", "Send to reference check")}
              disabled={bulkPending}
              className="px-3 py-1.5 text-xs font-semibold bg-[#FFA500] text-[#1a1a40] rounded-lg hover:bg-[#FFB733] disabled:opacity-50"
            >
              Reference check
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange("accepted", "Accept")}
              disabled={bulkPending}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange("rejected", "Reject", "danger")}
              disabled={bulkPending}
              className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible candidates"
                    checked={
                      rankedCandidates.length > 0 &&
                      rankedCandidates.every((c) => selectedIds.has(c.id))
                    }
                    onChange={() => toggleSelectAll(rankedCandidates.map((c) => c.id))}
                    className="h-4 w-4 text-[#252560] border-gray-300 rounded focus:ring-[#252560]"
                  />
                </th>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                  const isSelected = selectedIds.has(candidate.id);
                  const selectLabel = candidateName ? candidateName : "candidate";
                  return (
                    <tr
                      key={candidate.id}
                      className={
                        isSelected ? "bg-[#f0f0fc] hover:bg-[#e8e8f5]" : "hover:bg-gray-50"
                      }
                    >
                      <td className="px-3 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(candidate.id)}
                          aria-label={`Select ${selectLabel}`}
                          className="h-4 w-4 text-[#252560] border-gray-300 rounded focus:ring-[#252560]"
                        />
                      </td>
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
                      <td className="px-3 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
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
