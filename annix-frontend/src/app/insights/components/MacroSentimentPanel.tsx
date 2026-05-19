"use client";

import { toPairs as entries, isNumber } from "es-toolkit/compat";
import { Globe2 } from "lucide-react";
import { useMacroHistory, useMacroToday } from "@/app/lib/query/hooks";
import { Sparkline } from "./Sparkline";

const HISTORY_DAYS = 30;
const TOP_BREAKDOWN = 3;

export function MacroSentimentPanel() {
  const today = useMacroToday();
  const history = useMacroHistory(HISTORY_DAYS);

  const todayData = today.data;
  const historyData = history.data;
  // A "no snapshot" backend response is null, but the shared apiClient turns an
  // empty HTTP body into {}, so guard on the actual payload, not just null.
  const todayRow = todayData != null && isNumber(todayData.overallScore) ? todayData : null;
  const historyRows = historyData === undefined ? [] : historyData;
  const sparklineValues = historyRows.map((row) => row.overallScore);

  const todayLoading = today.isLoading;
  const historyLoading = history.isLoading;
  if (todayLoading || historyLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mt-6 text-gray-400 text-sm">
        Loading macro sentiment…
      </div>
    );
  }

  if (todayRow === null) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe2 className="w-5 h-5 text-[#FFA500]" strokeWidth={2} />
          <h3 className="text-base font-semibold">Macro sentiment</h3>
        </div>
        <p className="text-sm text-gray-400">
          No macro snapshot for today yet — wait for the 06:00 or 18:00 SAST cron to run, or trigger
          a manual run from Admin.
        </p>
      </div>
    );
  }

  const score = todayRow.overallScore;
  const scoreLabel = score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
  const scoreColor = sentimentColor(score);
  const topSectors = topEntries(todayRow.sectorBreakdown);
  const topCommodities = topEntries(todayRow.commodityBreakdown);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-[#FFA500]" strokeWidth={2} />
          <h3 className="text-base font-semibold">Macro sentiment · {todayRow.snapshotDate}</h3>
        </div>
        <span className="text-xs text-gray-500">
          {todayRow.articleCount} articles · {todayRow.highImpactCount} high-impact · last 48h
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center bg-gray-950/60 border border-gray-800 rounded-xl p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">Overall</span>
          <span className={`text-3xl font-bold font-mono ${scoreColor}`}>{scoreLabel}</span>
          <span className="text-[10px] text-gray-500 mt-1">
            −1.00 bearish · 0 neutral · +1.00 bullish
          </span>
          {sparklineValues.length > 1 ? (
            <div className="mt-3 h-9 flex items-center">
              <Sparkline closes={sparklineValues} width={200} height={36} />
            </div>
          ) : (
            <span className="mt-3 text-[10px] text-gray-600">history builds as cron runs</span>
          )}
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500">Top sectors</span>
          {topSectors.length === 0 ? (
            <p className="text-xs text-gray-600 mt-2">No sector-tagged articles today.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {topSectors.map((entry) => (
                <li key={entry.key} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize truncate pr-2">{entry.key}</span>
                  <span
                    className={`font-mono text-xs ${sentimentColor(entry.value.meanSentiment)}`}
                  >
                    {formatSentiment(entry.value.meanSentiment)} · {entry.value.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4">
          <span className="text-xs uppercase tracking-wide text-gray-500">Top commodities</span>
          {topCommodities.length === 0 ? (
            <p className="text-xs text-gray-600 mt-2">No commodity-tagged articles today.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {topCommodities.map((entry) => (
                <li key={entry.key} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize truncate pr-2">{entry.key}</span>
                  <span
                    className={`font-mono text-xs ${sentimentColor(entry.value.meanSentiment)}`}
                  >
                    {formatSentiment(entry.value.meanSentiment)} · {entry.value.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function sentimentColor(score: number): string {
  if (score > 0.15) return "text-emerald-400";
  if (score < -0.15) return "text-red-400";
  return "text-amber-400";
}

function formatSentiment(score: number): string {
  return score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}

interface BreakdownRow {
  key: string;
  value: { count: number; meanSentiment: number };
}

function topEntries(
  breakdown: Record<string, { count: number; meanSentiment: number }>,
): BreakdownRow[] {
  const rows: BreakdownRow[] = entries(breakdown).map(
    ([key, value]: [string, { count: number; meanSentiment: number }]) => ({
      key,
      value,
    }),
  );
  rows.sort((a, b) => {
    if (b.value.count !== a.value.count) return b.value.count - a.value.count;
    return Math.abs(b.value.meanSentiment) - Math.abs(a.value.meanSentiment);
  });
  return rows.slice(0, TOP_BREAKDOWN);
}
