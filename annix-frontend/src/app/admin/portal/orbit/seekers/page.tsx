"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateZA } from "@/app/lib/datetime";
import { useAdminOrbitSeekers } from "@/app/lib/query/hooks";

const PAGE_SIZE = 20;

function tierClass(tier: string): string {
  if (tier === "hard") {
    return "bg-green-100 text-green-700";
  }
  if (tier === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}

export default function OrbitSeekersPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/portal/orbit"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Orbit admin hub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Seekers</h1>
          <p className="text-gray-600 mt-1 text-sm max-w-2xl">
            Every job seeker on the platform. Search by name or email. To change a seeker's match
            tier, use Seeker Tiers.
          </p>
        </div>
        <Link
          href="/admin/portal/orbit/seeker-tiers"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 whitespace-nowrap"
        >
          Seeker tiers →
        </Link>
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
                return (
                  <tr key={seeker.id} className="text-gray-900">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge}`}>
                        {seeker.matchTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{seeker.status}</td>
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
