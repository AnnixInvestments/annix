"use client";

import { useAdminPlatformLimits } from "@/app/lib/query/hooks";
import { LimitGaugeCard } from "./LimitGaugeCard";

export function PlatformLimitsPanel() {
  const limitsQuery = useAdminPlatformLimits();
  const data = limitsQuery.data;

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
        <p className="text-sm text-gray-500">Loading platform limits…</p>
      </div>
    );
  }

  const cards = data.cards;
  const criticalCount = cards.filter((card) => card.status === "critical").length;
  const warnCount = cards.filter((card) => card.status === "warn").length;
  const summaryLabel =
    criticalCount > 0
      ? `${criticalCount} critical`
      : warnCount > 0
        ? `${warnCount} warning`
        : "all healthy";
  const summaryColor =
    criticalCount > 0
      ? "text-red-600 dark:text-red-400"
      : warnCount > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Platform limits (free-tier crash guard)
        </h3>
        <span className={`text-xs font-medium ${summaryColor}`}>{summaryLabel}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <LimitGaugeCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
