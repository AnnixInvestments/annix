"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PlatformLimitCard } from "@/app/lib/api/adminApi";
import { useAdminPlatformLimitBreakdown } from "@/app/lib/query/hooks";

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function barColor(percent: number): string {
  if (percent >= 85) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-indigo-500";
}

export function LimitBreakdownModal(props: {
  card: PlatformLimitCard | null;
  onClose: () => void;
}) {
  const card = props.card;
  const onClose = props.onClose;
  const isOpen = card !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const breakdownQuery = useAdminPlatformLimitBreakdown(card ? card.id : null);

  if (!isOpen || !card) return null;

  const breakdown = breakdownQuery.data;
  const rows = breakdown ? breakdown.rows : [];
  const note = breakdown ? breakdown.note : null;
  const title = breakdown ? breakdown.title : card.label;
  const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{card.details}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-1">
          {breakdownQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading breakdown…
            </p>
          ) : breakdownQuery.isError ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No breakdown available for this dial.
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nothing to break down right now.
            </p>
          ) : (
            rows.map((row) => {
              const percent = row.percent;
              const widthPercent =
                percent !== null
                  ? Math.min(percent, 100)
                  : maxValue > 0
                    ? Math.min((row.value / maxValue) * 100, 100)
                    : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatValue(row.value)} {row.unit}
                      {percent !== null ? (
                        <span className="ml-1.5 font-normal text-gray-400">{percent}%</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${barColor(percent ?? 0)}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {note ? (
          <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] leading-snug text-gray-500 dark:border-white/10 dark:text-gray-400">
            {note}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
