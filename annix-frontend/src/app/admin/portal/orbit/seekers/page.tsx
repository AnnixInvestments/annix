"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useAdminOrbitSeekers } from "@/app/lib/query/hooks";

const PAGE_SIZE = 20;
const EXPORT_LIMIT = 10000;

function tierClass(tier: string): string {
  if (tier === "hard") {
    return "bg-green-100 text-green-700";
  }
  if (tier === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}

function statusClass(status: string): string {
  if (status === "active" || status === "accepted") {
    return "bg-green-100 text-green-700";
  }
  if (status === "registered") {
    return "bg-indigo-100 text-indigo-700";
  }
  if (status === "invited") {
    return "bg-sky-100 text-sky-700";
  }
  if (status === "new" || status === "screening") {
    return "bg-blue-100 text-blue-700";
  }
  if (status === "shortlisted" || status === "reference_check") {
    return "bg-violet-100 text-violet-700";
  }
  if (status === "suspended" || status === "rejected" || status === "deactivated") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-600";
}

function csvCell(value: string | null): string {
  const raw = value || "";
  const needsQuotes = raw.includes(",") || raw.includes('"') || raw.includes("\n");
  if (!needsQuotes) {
    return raw;
  }
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export default function OrbitSeekersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const seekersQuery = useAdminOrbitSeekers({ search: appliedSearch, page, limit: PAGE_SIZE });
  const queryData = seekersQuery.data;
  const seekers = queryData ? queryData.seekers : [];
  const total = queryData ? queryData.total : 0;
  const isLoading = seekersQuery.isLoading;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await adminApiClient.orbitSeekers({
        search: appliedSearch || null,
        page: 1,
        limit: EXPORT_LIMIT,
      });
      const rows = result.seekers;
      if (rows.length === 0) {
        showToast("No seekers to export.", "info");
        return;
      }
      const header = [
        "Name",
        "Email",
        "Match tier",
        "Match score",
        "Status",
        "Has CV",
        "Last active",
        "Joined",
      ].join(",");
      const lines = rows.map((row) => {
        const matchScore = row.matchScore === null ? "" : String(row.matchScore);
        const hasCv = row.hasCv ? "Yes" : "No";
        const lastActive = row.lastActiveAt ? formatDateZA(row.lastActiveAt) : "";
        const joined = row.createdAt ? formatDateZA(row.createdAt) : "";
        return [
          csvCell(row.name),
          csvCell(row.email),
          csvCell(row.matchTier),
          csvCell(matchScore),
          csvCell(row.status),
          csvCell(hasCv),
          csvCell(lastActive),
          csvCell(joined),
        ].join(",");
      });
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "annix-orbit-seekers.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert({
        message: `Exported ${rows.length} seeker${rows.length === 1 ? "" : "s"}.`,
        variant: "success",
      });
    } catch {
      alert({ message: "Could not export seekers — please try again.", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {AlertDialog}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seekers</h1>
          <p className="text-gray-600 mt-1 text-sm max-w-2xl">
            Every job seeker on the platform. Search by name or email, or click a row to open the
            full seeker profile. To change a seeker's match tier, use Seeker Tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            {isExporting ? "Exporting…" : "Export CSV"}
          </button>
          <Link
            href="/admin/portal/orbit/seeker-tiers"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 whitespace-nowrap"
          >
            Seeker tiers →
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading seekers…</div>
        ) : seekers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No seekers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Match tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">CV</th>
                <th className="px-4 py-3 font-medium">Last active</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {seekers.map((seeker) => {
                const nameValue = seeker.name;
                const name = nameValue || "—";
                const emailValue = seeker.email;
                const email = emailValue || "—";
                const cvLabel = seeker.hasCv ? "Yes" : "No";
                const lastActiveRaw = seeker.lastActiveAt;
                const lastActive = lastActiveRaw ? formatDateZA(lastActiveRaw) : "—";
                const joinedRaw = seeker.createdAt;
                const joined = joinedRaw ? formatDateZA(joinedRaw) : "—";
                const tierBadge = tierClass(seeker.matchTier);
                const statusBadge = statusClass(seeker.status);
                const seekerId = seeker.id;
                const isProspect = seeker.isProspect === true;
                return (
                  <tr
                    key={seekerId}
                    onClick={
                      isProspect
                        ? undefined
                        : () => router.push(`/admin/portal/orbit/seekers/${seekerId}`)
                    }
                    title={isProspect ? "Invited via admin — no seeker profile yet" : undefined}
                    className={
                      isProspect
                        ? "text-gray-500 transition-colors"
                        : "text-gray-900 cursor-pointer hover:bg-violet-50 transition-colors"
                    }
                  >
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge}`}>
                        {seeker.matchTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}
                      >
                        {seeker.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cvLabel}</td>
                    <td className="px-4 py-3 text-gray-500">{lastActive}</td>
                    <td className="px-4 py-3 text-gray-500">{joined}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} · {total} seeker{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
