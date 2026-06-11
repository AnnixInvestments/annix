"use client";

import { useAdminOrbitClusterUsage } from "@/app/lib/query/hooks";

export function ClusterUsagePanel() {
  const usageQuery = useAdminOrbitClusterUsage();
  const usage = usageQuery.data;

  if (!usage) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
        <p className="text-sm text-gray-500">Loading Atlas cluster usage…</p>
      </div>
    );
  }

  const pct = usage.percentUsed;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Orbit cluster storage (M0 · 512 MB cap)
        </h3>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {usage.totalMb} MB / {usage.capMb} MB ({pct}%)
        </span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {usage.freeMb} MB free · logical size (the metric Atlas enforces on M0)
      </p>
      <div className="mt-3 space-y-1.5">
        {usage.databases.map((db) => {
          const dbPct = Math.round((db.logicalMb / usage.capMb) * 100);
          return (
            <div key={db.name} className="flex items-center gap-2 text-xs">
              <span className="w-36 shrink-0 text-gray-600 dark:text-gray-300">{db.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-full bg-indigo-400"
                  style={{ width: `${Math.min(dbPct, 100)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-gray-500">{db.logicalMb} MB</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
