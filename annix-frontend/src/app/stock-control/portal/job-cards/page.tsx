"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useCreateJobCard,
  useDataBookStatuses,
  useDeleteJobCard,
  useJobCards,
} from "@/app/lib/query/hooks";
import { stockControlKeys } from "@/app/lib/query/keys";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { HelpTooltip } from "../../components/HelpTooltip";
import { StatusBadge } from "../../components/StatusBadge";
import { CompactWorkflowStepper } from "../../components/WorkflowStatus";
import { setPendingImportFile } from "./import/pending-file";

const STATUS_TABS = ["all", "draft", "active", "completed", "cancelled"] as const;

type SortKey =
  | "jobNumber"
  | "jcNumber"
  | "pageNumber"
  | "jobName"
  | "customerName"
  | "status"
  | "createdAt";
type SortDir = "asc" | "desc";

export default function JobCardsPage() {
  const router = useRouter();
  const { user } = useStockControlAuth();
  const isAdmin = user?.role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [createForm, setCreateForm] = useState({
    jobNumber: "",
    jcNumber: "",
    pageNumber: "",
    jobName: "",
    customerName: "",
    description: "",
    poNumber: "",
    siteLocation: "",
    contactPerson: "",
    dueDate: "",
    notes: "",
    reference: "",
  });
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; jobNumber: string } | null>(
    null,
  );
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [isBulkReanalysing, setIsBulkReanalysing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    currentJc: string;
    processed: number;
    failed: number;
  } | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const queryClient = useQueryClient();
  const { data: rawJobCards = [], isLoading, error } = useJobCards(activeTab);

  const jobCards = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    const filtered = lowerQuery
      ? rawJobCards.filter((jc) => {
          const searchable = [
            jc.jobNumber,
            jc.jtDnNumber,
            jc.jcNumber,
            jc.pageNumber,
            jc.jobName,
            jc.customerName,
            jc.status,
            formatDateZA(jc.createdAt),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(lowerQuery);
        })
      : rawJobCards;

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = (a[sortKey] || "").toString().toLowerCase();
      const bVal = (b[sortKey] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rawJobCards, searchQuery, sortKey, sortDir]);

  const jobCardIds = useMemo(() => jobCards.map((jc) => jc.id), [jobCards]);
  const { data: dataBookStatuses = {} } = useDataBookStatuses(jobCardIds);
  const createJobCard = useCreateJobCard();
  const deleteJobCard = useDeleteJobCard();
  const dedupRanRef = useRef(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [dedupResult, setDedupResult] = useState<{ merged: number; groups: number } | null>(null);

  useEffect(() => {
    if (dedupRanRef.current || !isAdmin) return;
    dedupRanRef.current = true;
    setIsDeduplicating(true);
    stockControlApiClient
      .deduplicateJobCards()
      .then((result) => {
        if (result.merged > 0) {
          setDedupResult(result);
          queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
        }
      })
      .catch(() => {})
      .finally(() => setIsDeduplicating(false));
  }, [isAdmin, queryClient]);

  const navigateWithFile = (file: File) => {
    setPendingImportFile(file);
    router.push("/stock-control/portal/job-cards/import");
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      navigateWithFile(files[0]);
    }
  };

  const handleImportDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleImportDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleImportDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleImportFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      navigateWithFile(selectedFile);
    }
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setShowCreateForm(false);
      navigateWithFile(files[0]);
    }
  };

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsModalDragging(true);
  };

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsModalDragging(false);
    }
  };

  const handleModalFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setShowCreateForm(false);
      navigateWithFile(selectedFile);
    }
  };

  const handleCreate = async () => {
    try {
      await createJobCard.mutateAsync({
        ...createForm,
        status: "draft",
      });
      setShowCreateForm(false);
      setCreateForm({
        jobNumber: "",
        jcNumber: "",
        pageNumber: "",
        jobName: "",
        customerName: "",
        description: "",
        poNumber: "",
        siteLocation: "",
        contactPerson: "",
        dueDate: "",
        notes: "",
        reference: "",
      });
    } catch (_err) {
      // mutation error handled by TanStack Query
    }
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      setDeleteError(null);
      await deleteJobCard.mutateAsync(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setDeleteError(msg);
      setDeletingId(null);
    } finally {
      setConfirmDelete(null);
      setDeletingId(null);
    }
  };

  if (isLoading && jobCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job cards...</p>
        </div>
      </div>
    );
  }

  if (error && jobCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 relative"
      onDrop={handleImportDrop}
      onDragOver={handleImportDragOver}
      onDragEnter={handleImportDragEnter}
      onDragLeave={handleImportDragLeave}
    >
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-teal-50 bg-opacity-90 border-2 border-dashed border-teal-500 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-lg font-medium text-teal-700">Drop file to import job cards</p>
            <p className="text-sm text-teal-600">Supports Excel, CSV, and PDF files</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Job Cards <HelpTooltip term="JC" />
          </h1>
          <p className="mt-1 text-sm text-gray-600">Manage job cards and stock allocations</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
            onChange={handleImportFileInput}
            className="hidden"
          />
          {isAdmin && (
            <button
              onClick={async () => {
                const eligible = rawJobCards.filter(
                  (jc) => jc.status === "draft" || jc.status === "active",
                );
                if (eligible.length === 0) return;
                try {
                  setIsBulkReanalysing(true);
                  setBulkProgress({
                    current: 0,
                    total: eligible.length,
                    currentJc: eligible[0].jobNumber,
                    processed: 0,
                    failed: 0,
                  });
                  let processed = 0;
                  let failed = 0;
                  for (let i = 0; i < eligible.length; i++) {
                    const jc = eligible[i];
                    setBulkProgress({
                      current: i + 1,
                      total: eligible.length,
                      currentJc: jc.jobNumber,
                      processed,
                      failed,
                    });
                    try {
                      await stockControlApiClient.triggerCoatingAnalysis(jc.id);
                      processed++;
                    } catch {
                      failed++;
                    }
                  }
                  setBulkProgress({
                    current: eligible.length,
                    total: eligible.length,
                    currentJc: "Complete",
                    processed,
                    failed,
                  });
                  queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
                } finally {
                  setIsBulkReanalysing(false);
                }
              }}
              disabled={isBulkReanalysing}
              className="inline-flex items-center px-4 py-2 border border-purple-300 rounded-md shadow-sm text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 disabled:opacity-50"
            >
              {isBulkReanalysing ? "Re-analysing..." : "Re-analyse All"}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Job Card
          </button>
        </div>
      </div>

      {bulkProgress &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="fixed inset-0 bg-black/10 backdrop-blur-md" aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-lg font-bold text-purple-700">N</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Nix Coating Analysis</h3>
                  <p className="text-xs text-gray-500">
                    {isBulkReanalysing
                      ? `Analysing ${bulkProgress.current} of ${bulkProgress.total}`
                      : `Complete — ${bulkProgress.processed} processed${bulkProgress.failed > 0 ? `, ${bulkProgress.failed} failed` : ""}`}
                  </p>
                </div>
              </div>
              {isBulkReanalysing && (
                <p className="text-sm text-gray-700 mb-3 truncate">
                  Checking{" "}
                  <span className="font-medium text-purple-700">{bulkProgress.currentJc}</span>
                </p>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {bulkProgress.current}/{bulkProgress.total} job cards
                </span>
                {bulkProgress.failed > 0 && (
                  <span className="text-red-600">{bulkProgress.failed} failed</span>
                )}
              </div>
              {!isBulkReanalysing && (
                <button
                  onClick={() => setBulkProgress(null)}
                  className="mt-4 w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Done
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}

      {dedupResult && dedupResult.merged > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            Deduplication: {dedupResult.merged} duplicate job card(s) merged across{" "}
            {dedupResult.groups} group(s). Previous versions saved to Job Files.
          </span>
          <button
            onClick={() => setDedupResult(null)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="relative mb-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search job cards..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {jobCards.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards found</h3>
            <p className="mt-1 text-sm text-gray-500">Create a new job card to get started.</p>
          </div>
        ) : (
          <>
            <div className="sm:hidden divide-y divide-gray-200">
              {jobCards.map((job) => (
                <div
                  key={job.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/stock-control/portal/job-cards/${job.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/stock-control/portal/job-cards/${job.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {job.jobNumber}
                      {job.jtDnNumber ? ` / ${job.jtDnNumber}` : ""}
                    </Link>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-gray-900 truncate">{job.jobName}</p>
                  {job.customerName ? (
                    <p className="text-xs text-gray-500 mt-1 truncate">{job.customerName}</p>
                  ) : null}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{formatDateZA(job.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      {job.parentJobCardId ? (
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600">
                          Delivery
                        </span>
                      ) : null}
                      {job.cpoId ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          CPO
                        </span>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ id: job.id, jobNumber: job.jobNumber });
                        }}
                        disabled={deletingId === job.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === job.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden sm:table w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    onClick={() => toggleSort("jobNumber")}
                    className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Job No.
                      {sortKey === "jobNumber" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("jcNumber")}
                    className="hidden lg:table-cell w-[8%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      JC No.
                      {sortKey === "jcNumber" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("pageNumber")}
                    className="hidden xl:table-cell w-[6%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Page
                      {sortKey === "pageNumber" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("jobName")}
                    className="w-[20%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Job Name
                      {sortKey === "jobName" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("customerName")}
                    className="hidden md:table-cell w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Customer
                      {sortKey === "customerName" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("status")}
                    className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortKey === "status" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="hidden xl:table-cell w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Workflow
                  </th>
                  <th
                    scope="col"
                    className="hidden lg:table-cell w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Quality
                  </th>
                  <th
                    scope="col"
                    onClick={() => toggleSort("createdAt")}
                    className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      Created
                      {sortKey === "createdAt" ? (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          {sortDir === "asc" ? (
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
                          ) : (
                            <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
                          )}
                        </svg>
                      ) : null}
                    </span>
                  </th>
                  <th scope="col" className="w-[3%] relative px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobCards.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/stock-control/portal/job-cards/${job.id}`)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link
                        href={`/stock-control/portal/job-cards/${job.id}`}
                        className="text-sm font-medium text-teal-700 hover:text-teal-900 truncate block"
                      >
                        {job.jobNumber}
                        {job.jtDnNumber ? ` / ${job.jtDnNumber}` : ""}
                      </Link>
                      {job.parentJobCardId ? (
                        <span className="ml-1.5 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600">
                          Delivery
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate">
                      {job.jcNumber || "-"}
                    </td>
                    <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {job.pageNumber || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 truncate max-w-0">
                      {job.jobName}
                    </td>
                    <td className="hidden md:table-cell px-3 py-3 text-sm text-gray-500 truncate max-w-0">
                      {job.customerName || "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={job.status} />
                      {job.cpoId ? (
                        <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          CPO
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden xl:table-cell px-3 py-3 whitespace-nowrap">
                      <CompactWorkflowStepper
                        workflowStatus={
                          job.effectiveWorkflowStatus || job.workflowStatus || job.status
                        }
                      />
                    </td>
                    <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                      {dataBookStatuses[job.id] ? (
                        <span className="inline-flex items-center gap-1.5">
                          {dataBookStatuses[job.id].exists && !dataBookStatuses[job.id].isStale ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Compiled
                            </span>
                          ) : dataBookStatuses[job.id].exists &&
                            dataBookStatuses[job.id].isStale ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                              Stale
                            </span>
                          ) : null}
                          {dataBookStatuses[job.id].certificateCount > 0 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-700">
                              {dataBookStatuses[job.id].certificateCount} cert
                              {dataBookStatuses[job.id].certificateCount !== 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(job.createdAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ id: job.id, jobNumber: job.jobNumber });
                        }}
                        disabled={deletingId === job.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                        title="Delete job card"
                      >
                        {deletingId === job.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Job Card"
        message={`Delete job card ${confirmDelete?.jobNumber || ""}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={() => {
          if (confirmDelete) {
            handleDelete(confirmDelete.id);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg">
          <div className="flex items-start gap-2">
            <span className="text-sm text-red-800">{deleteError}</span>
            <button
              onClick={() => setDeleteError(null)}
              className="ml-auto text-red-500 hover:text-red-700 font-medium text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowCreateForm(false)}
            ></div>
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
              onDrop={handleModalDrop}
              onDragOver={handleModalDragOver}
              onDragEnter={handleModalDragOver}
              onDragLeave={handleModalDragLeave}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Job Card</h3>

              <input
                ref={modalFileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                onChange={handleModalFileInput}
                className="hidden"
              />
              <div
                onClick={() => modalFileInputRef.current?.click()}
                className={`mb-6 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isModalDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`mx-auto h-10 w-10 ${isModalDragging ? "text-teal-500" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {isModalDragging ? "Drop to import" : "Drag & drop or click to import"}
                </p>
                <p className="mt-1 text-xs text-gray-500">Excel, CSV, or PDF</p>
              </div>

              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <span className="relative bg-white px-3 text-sm text-gray-500">
                  or create manually
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Number</label>
                    <input
                      type="text"
                      value={createForm.jobNumber}
                      onChange={(e) => setCreateForm({ ...createForm, jobNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Name</label>
                    <input
                      type="text"
                      value={createForm.jobName}
                      onChange={(e) => setCreateForm({ ...createForm, jobName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">JC Number</label>
                    <input
                      type="text"
                      value={createForm.jcNumber}
                      onChange={(e) => setCreateForm({ ...createForm, jcNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Page Number</label>
                    <input
                      type="text"
                      value={createForm.pageNumber}
                      onChange={(e) => setCreateForm({ ...createForm, pageNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Additional Details
                  </button>
                  {showAdditionalDetails && (
                    <div className="mt-3 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            PO Number
                          </label>
                          <input
                            type="text"
                            value={createForm.poNumber}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, poNumber: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Reference
                          </label>
                          <input
                            type="text"
                            value={createForm.reference}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, reference: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Site / Location
                          </label>
                          <input
                            type="text"
                            value={createForm.siteLocation}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, siteLocation: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            value={createForm.contactPerson}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, contactPerson: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input
                          type="text"
                          value={createForm.dueDate}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, dueDate: e.target.value })
                          }
                          placeholder="e.g. 2025-03-15"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createJobCard.isPending || !createForm.jobNumber || !createForm.jobName}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {createJobCard.isPending ? "Creating..." : "Create Job Card"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
