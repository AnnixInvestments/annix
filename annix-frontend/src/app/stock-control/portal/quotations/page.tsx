"use client";

import { isString } from "es-toolkit/compat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import {
  quoteRefForSession,
  useDeleteNixExtractionSession,
  useFeatureFlagEnabled,
  useNixExtractionSessions,
} from "@/app/lib/query/hooks";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";

const NIX_QUOTE_FROM_DOCS_FLAG = "STOCK_MGMT_NIX_QUOTE_FROM_DOCUMENTS";

const MOCK_QUOTES = [
  {
    id: 1,
    quoteNumber: "QUO-2026-0187",
    customer: "Example Mining Co",
    subject: "DN100 spool assemblies x 12",
    raisedBy: "Sales A",
    raisedAt: "2026-04-03",
    validUntil: "2026-05-03",
    lineCount: 8,
    totalValue: 487_200,
    status: "sent",
  },
  {
    id: 2,
    quoteNumber: "QUO-2026-0186",
    customer: "Sample Chemical Works",
    subject: "Rubber-lined pipework refurb",
    raisedBy: "Sales B",
    raisedAt: "2026-04-02",
    validUntil: "2026-05-02",
    lineCount: 15,
    totalValue: 1_240_000,
    status: "won",
  },
  {
    id: 3,
    quoteNumber: "QUO-2026-0185",
    customer: "Test Power Station",
    subject: "Tee and flange fabrication",
    raisedBy: "Sales A",
    raisedAt: "2026-03-30",
    validUntil: "2026-04-30",
    lineCount: 22,
    totalValue: 892_500,
    status: "negotiating",
  },
  {
    id: 4,
    quoteNumber: "QUO-2026-0184",
    customer: "Example Refinery Ltd",
    subject: "Emergency bend replacement",
    raisedBy: "Sales C",
    raisedAt: "2026-03-28",
    validUntil: "2026-04-11",
    lineCount: 3,
    totalValue: 145_800,
    status: "lost",
  },
  {
    id: 5,
    quoteNumber: "QUO-2026-0183",
    customer: "Sample Water Utility",
    subject: "DN600 HDPE spools",
    raisedBy: "Sales B",
    raisedAt: "2026-03-27",
    validUntil: "2026-04-27",
    lineCount: 6,
    totalValue: 376_400,
    status: "draft",
  },
];

function statusBadge(status: string): string {
  if (status === "won") return "bg-green-100 text-green-800 border-green-200";
  if (status === "lost") return "bg-red-100 text-red-800 border-red-200";
  if (status === "negotiating") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "sent") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatZar(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuotationsPage() {
  const router = useRouter();
  const nixQuoteFlag = useFeatureFlagEnabled(NIX_QUOTE_FROM_DOCS_FLAG);
  const isNixEnabled = nixQuoteFlag.enabled;
  const draftsQuery = useNixExtractionSessions(
    isNixEnabled ? { sourceModule: "asca", status: "draft" } : undefined,
  );
  const draftsData = draftsQuery.data;
  const drafts = isNixEnabled && draftsData ? draftsData : [];
  const promotedQuery = useNixExtractionSessions(
    isNixEnabled ? { sourceModule: "asca", status: "promoted" } : undefined,
  );
  const promotedData = promotedQuery.data;
  const promotedSessions = isNixEnabled && promotedData ? promotedData : [];
  const deleteMutation = useDeleteNixExtractionSession();
  const { confirm, ConfirmDialog } = useConfirm();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allChecked = drafts.length > 0 && drafts.every((s) => selectedIds.has(s.id));
  const someChecked = selectedIds.size > 0;

  const toggleOne = (id: number) => {
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

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (drafts.every((s) => prev.has(s.id))) return new Set();
      return new Set(drafts.map((s) => s.id));
    });
  };

  const handleDeleteDraft = async (sessionId: number, ref: string) => {
    const ok = await confirm({
      title: "Delete this draft?",
      message: `${ref} will be removed from your drafts. Any documents extracted under it stay available for cross-quote reuse — only the draft listing is deleted. This can't be undone.`,
      confirmLabel: "Delete draft",
      cancelLabel: "Keep it",
      variant: "danger",
    });
    if (!ok) return;
    await deleteMutation.mutateAsync(sessionId);
    await draftsQuery.refetch();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const refs = drafts.filter((s) => selectedIds.has(s.id)).map((s) => quoteRefForSession(s));
    const ok = await confirm({
      title: `Delete ${refs.length} draft${refs.length === 1 ? "" : "s"}?`,
      message: `${refs.join(", ")} will be removed. Any documents extracted under these drafts stay available for cross-quote reuse — only the draft listings are deleted. This can't be undone.`,
      confirmLabel: `Delete ${refs.length} draft${refs.length === 1 ? "" : "s"}`,
      cancelLabel: "Keep them",
      variant: "danger",
    });
    if (!ok) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
    setSelectedIds(new Set());
    await draftsQuery.refetch();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quotations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Quotes and RFQ responses issued to customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isNixEnabled && (
            <Link
              href="/stock-control/portal/quotations/new-from-documents"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-purple-700"
            >
              New from documents (Nix)
            </Link>
          )}
          <button
            type="button"
            disabled
            className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
          >
            New Quotation
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — issued quotes table at the bottom of this page is still scaffold content. The
        in-progress drafts and promoted quotes sections above it are real.
      </div>

      {isNixEnabled && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              In-progress drafts
            </h2>
            {someChecked && (
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete {selectedIds.size} selected
              </button>
            )}
          </div>
          {draftsQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No drafts in progress. Start one with{" "}
              <Link
                href="/stock-control/portal/quotations/new-from-documents"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                New from documents (Nix)
              </Link>
              .
            </p>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        aria-label="Select all drafts"
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quote #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Documents
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Started
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Last edit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {drafts.map((s) => {
                    const ref = quoteRefForSession(s);
                    const docCount = s.extractions ? s.extractions.length : 0;
                    const startedAt = fromISO(s.createdAt).toFormat("dd MMM yyyy");
                    const updatedAt = fromISO(s.updatedAt).toFormat("dd MMM yyyy HH:mm");
                    const titleText = s.title ? s.title : `Draft from documents — session #${s.id}`;
                    const draftHref = `/stock-control/portal/quotations/drafts/${s.id}`;
                    const openDraft = () => router.push(draftHref);
                    const onRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDraft();
                      }
                    };
                    return (
                      <tr
                        key={s.id}
                        onClick={openDraft}
                        onKeyDown={onRowKeyDown}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${ref} — ${titleText}`}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#323288]/40"
                      >
                        <td
                          className="px-3 py-3 w-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                            aria-label={`Select ${ref}`}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[#323288]">{ref}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {titleText}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {docCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {startedAt}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {updatedAt}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void handleDeleteDraft(s.id, ref)}
                            disabled={deleteMutation.isPending}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                            aria-label={`Delete draft ${ref}`}
                            title="Delete this draft (extractions stay available for reuse)"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isNixEnabled && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Promoted quotes (from documents)
            </h2>
          </div>
          {promotedQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : promotedSessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              Quotes you promote from a draft will appear here, with all items pooled by their
              coating + lining specification.
            </p>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quote #
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Documents
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Promoted
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Submitted
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {promotedSessions.map((s) => {
                    const promoted = s.promotedRef;
                    const ref = promoted ? promoted : quoteRefForSession(s);
                    const docCount = s.extractions ? s.extractions.length : 0;
                    const promotedAt = fromISO(s.updatedAt).toFormat("dd MMM yyyy HH:mm");
                    const submittedAtIso = s.submittedAt;
                    const submittedAt =
                      isString(submittedAtIso) && submittedAtIso.length > 0
                        ? fromISO(submittedAtIso).toFormat("dd MMM yyyy")
                        : "—";
                    const titleText = s.title ? s.title : `Quote from documents — session #${s.id}`;
                    const quoteHref = `/stock-control/portal/quotations/quotes/${s.id}`;
                    const openQuote = () => router.push(quoteHref);
                    const onRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openQuote();
                      }
                    };
                    return (
                      <tr
                        key={s.id}
                        onClick={openQuote}
                        onKeyDown={onRowKeyDown}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${ref} — ${titleText}`}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#323288]/40"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-[#323288]">{ref}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {titleText}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {docCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {promotedAt}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {submittedAt}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={openQuote}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium border border-[#323288] text-[#323288] rounded hover:bg-[#323288] hover:text-white"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Open Pipeline</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">R 1.8m</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Win Rate</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">62%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Awaiting Response</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">9</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Expiring This Week</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">3</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search quote number / customer…"
          className="rounded-md border-gray-300 text-sm"
        />
        <select className="rounded-md border-gray-300 text-sm">
          <option>All customers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Negotiating</option>
          <option>Won</option>
          <option>Lost</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quote #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Subject
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Raised
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Valid Until
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Lines
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {MOCK_QUOTES.map((q) => {
              const badgeClass = statusBadge(q.status);
              const valueDisplay = formatZar(q.totalValue);
              return (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-[#323288]">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.customer}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.subject}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.raisedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.validUntil}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {q.lineCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {valueDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                    >
                      {q.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          What Quotations will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Generate from customer RFQ attachments using AI line extraction</li>
          <li>Reuse material pricing from stock cards and supplier quotes</li>
          <li>Auto-calculate fabrication weld metres, labour, markup</li>
          <li>Branded PDF export emailed direct to customer contact</li>
          <li>Revision history per quote (v1, v2…) with diff view</li>
          <li>Convert won quote to customer Purchase Order with one click</li>
          <li>Pipeline value, win rate and aged pipeline on dashboard</li>
        </ul>
      </div>

      {ConfirmDialog}
    </div>
  );
}
