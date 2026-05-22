"use client";

import { ArrowLeft, RefreshCw, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useToast } from "@/app/components/Toast";
import { ApiError } from "@/app/lib/api/apiError";
import { insightsApi, type PriceBar, type SignalSnapshotResponse } from "@/app/lib/api/insightsApi";
import { fromISO, nowISO } from "@/app/lib/datetime";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useAssetHistory, useInvalidateAssetData, useSignalHistory } from "@/app/lib/query/hooks";
import { PriceChart } from "../../components/PriceChart";
import { Sparkline } from "../../components/Sparkline";
import { INSIGHTS_VERSION } from "../../config/version";
import { useInsightsAuth } from "../../context/InsightsAuthContext";
import { ScoreBar } from "../../signals/components/ScoreBar";
import { SignalBreakdown } from "../../signals/components/SignalBreakdown";

const NAV_ITEMS: NavItem[] = [];

type Range = "1M" | "6M" | "1Y" | "5Y" | "MAX";

const RANGES: { value: Range; label: string; days: number | null }[] = [
  { value: "1M", label: "1M", days: 31 },
  { value: "6M", label: "6M", days: 186 },
  { value: "1Y", label: "1Y", days: 366 },
  { value: "5Y", label: "5Y", days: 1830 },
  { value: "MAX", label: "Max", days: null },
];

function fromIsoForRange(days: number | null): string | undefined {
  if (days === null) return undefined;
  const past = fromISO(nowISO()).minus({ days });
  return past.toISODate() ?? undefined;
}

export default function InsightsAssetDetailPage() {
  const params = useParams<{ symbol: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const { showToast } = useToast();
  const { runBulk } = useAdaptiveExtractionProgress();
  const invalidateAsset = useInvalidateAssetData();
  const [range, setRange] = useState<Range>("1Y");

  const rawSymbol = params?.symbol;
  const symbol = useMemo(() => {
    if (!rawSymbol) return null;
    const decoded = decodeURIComponent(rawSymbol).toUpperCase();
    return decoded.length > 0 ? decoded : null;
  }, [rawSymbol]);

  const rangeMeta = RANGES.find((r) => r.value === range) ?? RANGES[2];
  const fromIso = fromIsoForRange(rangeMeta.days);
  const historyQuery = useAssetHistory(symbol, fromIso);
  const signalHistoryQuery = useSignalHistory(symbol, 90);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/insights");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!symbol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] text-white">
        <div className="text-center">
          <p className="text-slate-600 dark:text-gray-400 mb-3">Unknown symbol.</p>
          <button
            type="button"
            onClick={() => router.push("/insights/watchlist")}
            className="bg-[#FF8A00] hover:bg-[#CC6900] text-gray-900 px-4 py-2 rounded-lg font-semibold"
          >
            Back to watchlist
          </button>
        </div>
      </div>
    );
  }

  const queryData = historyQuery.data;
  const bars: PriceBar[] = queryData ?? [];
  const signalQueryData = signalHistoryQuery.data;
  const signalHistory: SignalSnapshotResponse[] = signalQueryData ?? [];
  const latestSignal = signalHistory.length > 0 ? signalHistory[signalHistory.length - 1] : null;
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const firstBar = bars.length > 0 ? bars[0] : null;
  const rangeChange =
    latestBar && firstBar ? ((latestBar.close - firstBar.close) / firstBar.close) * 100 : null;

  const handleBackfill = async () => {
    const targetSymbol = symbol;
    const result = await runBulk({
      brand: "insights",
      metricCategory: "insights-market-data",
      metricOperation: "backfill",
      items: [targetSymbol],
      itemId: (s) => s,
      itemLabel: (s, _i, _t) => `Backfilling ${s} from Yahoo Finance…`,
      fallbackPerItemMs: 60_000,
      run: async (s) => {
        await insightsApi.admin.backfill(s);
      },
    });
    invalidateAsset(targetSymbol);
    if (result.failed.length > 0) {
      const errMsg =
        result.failed[0].error instanceof ApiError
          ? result.failed[0].error.message
          : result.failed[0].error instanceof Error
            ? result.failed[0].error.message
            : "Backfill failed.";
      showToast(errMsg, "error");
    } else {
      showToast(`${targetSymbol} history refreshed.`, "success");
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
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/insights/watchlist")}
              className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-300 hover:text-[#FF8A00] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Watchlist
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-mono text-[#FF8A00]">
                {symbol}
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                {bars.length} bar{bars.length === 1 ? "" : "s"} in selected range.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    r.value === range
                      ? "bg-[#FF8A00] text-gray-900"
                      : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleBackfill}
              className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-700 text-sm text-slate-700 dark:text-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Backfill
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 text-slate-900 dark:text-white">
          {historyQuery.isLoading ? (
            <div className="h-[360px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A00]" />
            </div>
          ) : bars.length === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-10 h-10 text-[#FF8A00] mx-auto mb-3" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold">No price history yet.</h2>
              <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 max-w-md">
                Run a backfill to pull 20 years of daily OHLCV bars from Yahoo Finance. Or wait for
                the 06:00 SAST cron to fill it in.
              </p>
              <button
                type="button"
                onClick={handleBackfill}
                className="mt-4 inline-flex items-center gap-1.5 bg-[#FF8A00] hover:bg-[#CC6900] text-gray-900 px-4 py-2 rounded-lg font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Run backfill now
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-4">
                {latestBar ? (
                  <span className="text-3xl font-mono text-slate-900 dark:text-white">
                    {latestBar.close.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : null}
                {rangeChange !== null ? (
                  <span
                    className={`text-sm font-semibold ${rangeChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {rangeChange >= 0 ? "+" : ""}
                    {rangeChange.toFixed(2)}% over {rangeMeta.label}
                  </span>
                ) : null}
              </div>
              <PriceChart data={bars} height={360} />
            </>
          )}
        </div>

        {latestSignal ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                  Latest signal · {latestSignal.snapshotDate}
                </h2>
                <span className="text-xs text-slate-500 dark:text-gray-500 font-mono">
                  {signalHistory.length} day{signalHistory.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <SignalStat
                  label="Opportunity"
                  value={latestSignal.opportunityScore}
                  variant="opportunity"
                />
                <SignalStat label="Risk" value={latestSignal.riskScore} variant="risk" />
                <SignalStat
                  label="Confidence"
                  value={latestSignal.confidenceScore}
                  variant="confidence"
                />
              </div>
              <SignalBreakdown signal={latestSignal} />
            </div>
            <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 text-slate-900 dark:text-white">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-3">
                Opportunity score over 90 days
              </h2>
              {signalHistory.length > 1 ? (
                <Sparkline
                  closes={signalHistory.map((s) => s.opportunityScore)}
                  width={300}
                  height={180}
                />
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-500">
                  Need ≥ 2 daily snapshots.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function SignalStat(props: {
  label: string;
  value: number;
  variant: "opportunity" | "risk" | "confidence";
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-500 mb-1">
        {props.label}
      </div>
      <ScoreBar value={props.value} variant={props.variant} />
    </div>
  );
}
