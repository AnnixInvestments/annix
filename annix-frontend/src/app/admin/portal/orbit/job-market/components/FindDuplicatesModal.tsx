"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DuplicateJobSide } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminAutoResolveOrbitDuplicates,
  useAdminBulkDeleteOrbitExternalJobs,
  useAdminDeleteOrbitExternalJob,
  useAdminOrbitJobMarketDuplicates,
} from "@/app/lib/query/hooks";

function SideRow(props: {
  side: DuplicateJobSide;
  onDelete: () => void;
  deleting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const side = props.side;
  const company = side.company;
  const location = side.location;
  const companyText = company || "—";
  const locationText = location || "—";
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
      <label className="flex min-w-0 cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={props.selected}
          onChange={props.onToggleSelect}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-900">{side.title}</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            {companyText} · {locationText}
          </span>
          <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            {side.source}
          </span>
        </span>
      </label>
      <button
        type="button"
        onClick={props.onDelete}
        disabled={props.deleting}
        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {props.deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}

export function FindDuplicatesModal(props: { isOpen: boolean; onClose: () => void }) {
  const { isOpen, onClose } = props;
  const { confirm, ConfirmDialog } = useConfirm();
  const autoResolve = useAdminAutoResolveOrbitDuplicates();
  const autoResolvedRef = useRef(false);
  const duplicatesQuery = useAdminOrbitJobMarketDuplicates(isOpen && autoResolve.isSuccess);
  const deleteJob = useAdminDeleteOrbitExternalJob();
  const bulkDelete = useAdminBulkDeleteOrbitExternalJobs();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // On open, auto-remove EXACT duplicates first (keeping the most-respected
  // source), then list the remaining near-duplicates for manual review.
  useEffect(() => {
    if (!isOpen) {
      autoResolvedRef.current = false;
      setSelectedIds(new Set());
      return;
    }
    if (autoResolvedRef.current) return;
    autoResolvedRef.current = true;
    autoResolve.mutate();
  }, [isOpen, autoResolve]);

  if (!isOpen) return null;

  const data = duplicatesQuery.data;
  const pairs = data ?? [];
  const isLoading = duplicatesQuery.isLoading;
  const isError = duplicatesQuery.isError;
  const removed = autoResolve.data;
  const deletingId = deleteJob.isPending ? deleteJob.variables : null;
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: number) => {
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

  const dropFromSelection = (id: number) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDelete = async (side: DuplicateJobSide) => {
    const confirmed = await confirm({
      title: "Delete this listing?",
      message: `"${side.title}" (${side.source}) will be permanently removed from the feed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      deleteJob.mutate(side.id);
      dropFromSelection(side.id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = await confirm({
      title: `Delete ${selectedCount} listing(s)?`,
      message: "The selected listings will be permanently removed from the feed.",
      confirmLabel: `Delete ${selectedCount}`,
      variant: "danger",
    });
    if (confirmed) {
      bulkDelete.mutate([...selectedIds], { onSuccess: () => setSelectedIds(new Set()) });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Find Duplicate Listings</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              Exact duplicates are removed automatically (keeping the most-respected source).
              Listings below share a title but have a different or missing employer, so they may be
              genuinely separate jobs — your review decides.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-2.5">
          <span className="text-xs text-gray-600">
            {selectedCount > 0
              ? `${selectedCount} listing(s) selected`
              : "Tick listings to delete several at once"}
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedCount === 0 || bulkDelete.isPending}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkDelete.isPending
              ? "Deleting…"
              : `Delete selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {autoResolve.isPending && (
            <p className="py-8 text-center text-sm text-gray-500">
              Removing exact duplicates (keeping the most-respected source)…
            </p>
          )}
          {removed && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {removed.deleted > 0
                ? `Auto-removed ${removed.deleted} exact duplicate listing(s) across ${removed.groups} group(s) — kept the copy from the most-respected source.`
                : "No exact duplicates to auto-remove."}
            </div>
          )}
          {autoResolve.isError && (
            <p className="py-8 text-center text-sm text-red-600">
              Auto-resolve failed — please try again.
            </p>
          )}
          {autoResolve.isSuccess && isLoading && (
            <p className="py-8 text-center text-sm text-gray-500">Scanning for near-duplicates…</p>
          )}
          {autoResolve.isSuccess && isError && (
            <p className="py-8 text-center text-sm text-red-600">
              Could not scan for near-duplicates — please try again.
            </p>
          )}
          {autoResolve.isSuccess && !isLoading && !isError && pairs.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No near-duplicates need manual review.
            </p>
          )}
          {pairs.map((pair) => {
            const scorePercent = Math.round(pair.score * 100);
            const rawCompanyA = pair.a.company;
            const rawCompanyB = pair.b.company;
            const companyA = (rawCompanyA || "").trim().toLowerCase();
            const companyB = (rawCompanyB || "").trim().toLowerCase();
            const bothBlank = companyA === "" && companyB === "";
            const oneBlank = !bothBlank && (companyA === "" || companyB === "");
            const sameEmployer = !bothBlank && !oneBlank && companyA === companyB;
            const employerLabel = bothBlank
              ? null
              : oneBlank
                ? "employer missing on one"
                : sameEmployer
                  ? "same employer"
                  : "different employer";
            const employerTone = sameEmployer
              ? "bg-gray-100 text-gray-600"
              : "bg-amber-100 text-amber-700";
            return (
              <div
                key={`${pair.a.id}-${pair.b.id}`}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {scorePercent}% title match
                  </span>
                  {employerLabel && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${employerTone}`}
                    >
                      {employerLabel}
                    </span>
                  )}
                  {pair.crossSource && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      cross-source
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SideRow
                    side={pair.a}
                    onDelete={() => handleDelete(pair.a)}
                    deleting={deletingId === pair.a.id}
                    selected={selectedIds.has(pair.a.id)}
                    onToggleSelect={() => toggleSelect(pair.a.id)}
                  />
                  <SideRow
                    side={pair.b}
                    onDelete={() => handleDelete(pair.b)}
                    deleting={deletingId === pair.b.id}
                    selected={selectedIds.has(pair.b.id)}
                    onToggleSelect={() => toggleSelect(pair.b.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <span className="text-xs text-gray-500">
            {pairs.length > 0 ? `${pairs.length} near-duplicate pair(s) to review` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
      {ConfirmDialog}
    </div>,
    document.body,
  );
}
