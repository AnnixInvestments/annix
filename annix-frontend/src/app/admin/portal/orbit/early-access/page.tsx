"use client";

import { useState } from "react";
import { adminApiClient, type OrbitEarlyAccessBucket } from "@/app/lib/api/adminApi";
import { fromISO } from "@/app/lib/datetime";
import { useAdminOrbitEarlyAccessList, useAdminOrbitEarlyAccessStats } from "@/app/lib/query/hooks";

const ETHNIC_LABELS: Record<string, string> = {
  african_black: "African / Black",
  coloured: "Coloured",
  indian: "Indian",
  white: "White",
  prefer_not_to_say: "Prefer not to say",
};

function ethnicLabel(value: string | null): string {
  if (!value) {
    return "—";
  }
  const label = ETHNIC_LABELS[value];
  return label ? label : value;
}

function KpiCard(props: { label: string; value: number | string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{props.label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{props.value}</p>
    </div>
  );
}

function BreakdownCard(props: { title: string; buckets: OrbitEarlyAccessBucket[] }) {
  const buckets = props.buckets;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{props.title}</h3>
      {buckets.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {buckets.slice(0, 8).map((b) => (
            <li key={b.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 truncate">{b.key}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{b.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrbitEarlyAccessAdminPage() {
  const statsQuery = useAdminOrbitEarlyAccessStats();
  const listQuery = useAdminOrbitEarlyAccessList();
  const [exporting, setExporting] = useState(false);

  const stats = statsQuery.data;
  const total = stats ? stats.total : 0;
  const today = stats ? stats.today : 0;
  const thisWeek = stats ? stats.thisWeek : 0;
  const bySource = stats ? stats.bySource : [];
  const byCampaign = stats ? stats.byCampaign : [];
  const byIndustry = stats ? stats.byIndustry : [];
  const topReferrers = stats ? stats.topReferrers : [];

  const rawRows = listQuery.data;
  const rows = rawRows ? rawRows : [];

  const handleExport = async () => {
    setExporting(true);
    try {
      await adminApiClient.orbitEarlyAccessExportCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Orbit Early Access
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pre-launch waiting list — your deduplicated marketing list of interested seekers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || rows.length === 0}
          className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3da3] disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total signups" value={total} />
        <KpiCard label="Today" value={today} />
        <KpiCard label="This week" value={thisWeek} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BreakdownCard title="By source" buckets={bySource} />
        <BreakdownCard title="By campaign" buckets={byCampaign} />
        <BreakdownCard title="By industry" buckets={byIndustry} />
        <BreakdownCard title="Top referrers" buckets={topReferrers} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {[
                  "#",
                  "Name",
                  "Email",
                  "Mobile",
                  "Role",
                  "Industry",
                  "Years",
                  "Age",
                  "Ethnicity",
                  "Source",
                  "Campaign",
                  "Referred by",
                  "Friends referred",
                  "Joined",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {listQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No signups yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const joined = row.createdAt
                    ? fromISO(row.createdAt).toFormat("yyyy/MM/dd")
                    : "—";
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-200">
                        {row.position}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.email}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {row.mobileNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.currentRole || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.industry || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {row.yearsExperience || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {row.ageRange || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {ethnicLabel(row.ethnicBackground)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.source}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.campaign || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.referredBy || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200">
                        {row.referralCount}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {joined}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
