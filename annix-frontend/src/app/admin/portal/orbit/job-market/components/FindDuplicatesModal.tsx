"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { DuplicateJobSide } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminAutoResolveOrbitDuplicates,
  useAdminDeleteOrbitExternalJob,
  useAdminOrbitJobMarketDuplicates,
} from "@/app/lib/query/hooks";

function SideRow(props: { side: DuplicateJobSide; onDelete: () => void; deleting: boolean }) {
  const side = props.side;
  const company = side.company;
  const location = side.location;
  const companyText = company || "—";
  const locationText = location || "—";
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{side.title}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {companyText} · {locationText}
        </p>
        <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          {side.source}
        </span>
      </div>
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

  // On open, auto-remove EXACT duplicates first (keeping the most-respected
  // source), then list the remaining near-duplicates for manual review.
  useEffect(() => {
    if (!isOpen) {
      autoResolvedRef.current = false;
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

  const handleDelete = async (side: DuplicateJobSide) => {
    const confirmed = await confirm({
      title: "Delete this listing?",
      message: `"${side.title}" (${side.source}) will be permanently removed from the feed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      deleteJob.mutate(side.id);
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
              Near-duplicates below need your review.
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
            return (
              <div
                key={`${pair.a.id}-${pair.b.id}`}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {scorePercent}% title match
                  </span>
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
                  />
                  <SideRow
                    side={pair.b}
                    onDelete={() => handleDelete(pair.b)}
                    deleting={deletingId === pair.b.id}
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
