"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Signal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { SignalSnapshotResponse } from "@/app/lib/api/insightsApi";
import { useSignalsLatest } from "@/app/lib/query/hooks";
import { INSIGHTS_VERSION } from "../config/version";
import { useInsightsAuth } from "../context/InsightsAuthContext";
import { ScoreBar } from "./components/ScoreBar";
import { SignalBreakdown } from "./components/SignalBreakdown";

const NAV_ITEMS: NavItem[] = [];

type SortKey = "opportunityScore" | "riskScore" | "confidenceScore" | "symbol";

export default function InsightsSignalsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const query = useSignalsLatest();
  const [sortKey, setSortKey] = useState<SortKey>("opportunityScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const queryData = query.data;
  const signals: SignalSnapshotResponse[] = useMemo(() => queryData ?? [], [queryData]);

  const filteredAndSorted = useMemo(() => {
    const lower = filter.toLowerCase().trim();
    const matched = lower
      ? signals.filter((s) => {
          const sectorRaw = s.sector;
          const sectorText = sectorRaw ?? "";
          return (
            s.symbol.toLowerCase().includes(lower) ||
            s.name.toLowerCase().includes(lower) ||
            sectorText.toLowerCase().includes(lower)
          );
        })
      : signals;
    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "symbol") {
        return sortDir === "asc"
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [signals, filter, sortKey, sortDir]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/insights");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFA500]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] text-white">
      <PortalToolbar
        portalType="insights"
        navItems={NAV_ITEMS}
        user={{ email: user.email }}
        onLogout={logout}
        version={INSIGHTS_VERSION}
        hideThemeToggle
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/insights")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#FFA500] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
              <p className="text-sm text-gray-400">
                Daily scores per asset. {signals.length} asset
                {signals.length === 1 ? "" : "s"} scored.
              </p>
            </div>
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by symbol, name, sector…"
            className="w-64 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:border-transparent"
          />
        </div>

        {query.isLoading ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFA500]" />
          </div>
        ) : signals.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
            <Signal className="w-10 h-10 text-[#FFA500] mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No signal snapshots yet.</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              The signal engine runs daily at 06:00 SAST. Wait for the next cron tick, or ensure
              watchlist assets have at least 21 days of price history.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <SortHeader
                      label="Symbol"
                      active={sortKey === "symbol"}
                      dir={sortDir}
                      onClick={() => handleSort("symbol")}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Name / Sector</th>
                  <th className="px-4 py-3 text-left w-56">
                    <SortHeader
                      label="Opportunity"
                      active={sortKey === "opportunityScore"}
                      dir={sortDir}
                      onClick={() => handleSort("opportunityScore")}
                    />
                  </th>
                  <th className="px-4 py-3 text-left w-56">
                    <SortHeader
                      label="Risk"
                      active={sortKey === "riskScore"}
                      dir={sortDir}
                      onClick={() => handleSort("riskScore")}
                    />
                  </th>
                  <th className="px-4 py-3 text-left w-56">
                    <SortHeader
                      label="Confidence"
                      active={sortKey === "confidenceScore"}
                      dir={sortDir}
                      onClick={() => handleSort("confidenceScore")}
                    />
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredAndSorted.map((sig) => {
                  const isExpanded = expanded === sig.symbol;
                  return (
                    <RowGroup
                      key={sig.symbol}
                      sig={sig}
                      expanded={isExpanded}
                      onToggle={() => setExpanded(isExpanded ? null : sig.symbol)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}

function SortHeader(props: SortHeaderProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-1 hover:text-white transition-colors ${
        props.active ? "text-[#FFA500]" : ""
      }`}
    >
      {props.label}
      {props.active ? (
        props.dir === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      ) : null}
    </button>
  );
}

function RowGroup(props: { sig: SignalSnapshotResponse; expanded: boolean; onToggle: () => void }) {
  const sig = props.sig;
  const sectorRaw = sig.sector;
  const sectorDisplay = sectorRaw ?? "—";
  return (
    <>
      <tr
        className="hover:bg-gray-900/40 transition-colors cursor-pointer"
        onClick={props.onToggle}
      >
        <td className="px-4 py-3">
          <Link
            href={`/insights/assets/${encodeURIComponent(sig.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[#FFA500] hover:underline"
          >
            {sig.symbol}
          </Link>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm">{sig.name}</div>
          <div className="text-xs text-gray-500">{sectorDisplay}</div>
        </td>
        <td className="px-4 py-3">
          <ScoreBar value={sig.opportunityScore} variant="opportunity" />
        </td>
        <td className="px-4 py-3">
          <ScoreBar value={sig.riskScore} variant="risk" />
        </td>
        <td className="px-4 py-3">
          <ScoreBar value={sig.confidenceScore} variant="confidence" />
        </td>
        <td className="px-4 py-3 text-right">
          {props.expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 inline" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 inline" />
          )}
        </td>
      </tr>
      {props.expanded ? (
        <tr className="bg-gray-950/40">
          <td colSpan={6} className="px-4 py-4">
            <SignalBreakdown signal={sig} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
