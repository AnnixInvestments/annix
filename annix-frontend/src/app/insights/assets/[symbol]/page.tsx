"use client";

import { isUndefined } from "es-toolkit/compat";
import { ArrowLeft, RefreshCw, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useToast } from "@/app/components/Toast";
import { ApiError } from "@/app/lib/api/apiError";
import { insightsApi, type PriceBar } from "@/app/lib/api/insightsApi";
import { fromISO, nowISO } from "@/app/lib/datetime";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useAssetHistory, useInvalidateAssetData } from "@/app/lib/query/hooks";
import { PriceChart } from "../../components/PriceChart";
import { INSIGHTS_VERSION } from "../../config/version";
import { useInsightsAuth } from "../../context/InsightsAuthContext";

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (!isUndefined(globalThis.window)) router.replace("/insights");
    return null;
  }

  if (!symbol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-3">Unknown symbol.</p>
          <button
            type="button"
            onClick={() => router.push("/insights/watchlist")}
            className="bg-[#D4AF37] hover:bg-[#b8902c] text-gray-900 px-4 py-2 rounded-lg font-semibold"
          >
            Back to watchlist
          </button>
        </div>
      </div>
    );
  }

  const queryData = historyQuery.data;
  const bars: PriceBar[] = queryData ?? [];
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
    <div className="min-h-screen bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] text-white">
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
              className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#D4AF37] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Watchlist
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-mono text-[#D4AF37]">
                {symbol}
              </h1>
              <p className="text-sm text-gray-400">
                {bars.length} bar{bars.length === 1 ? "" : "s"} in selected range.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    r.value === range
                      ? "bg-[#D4AF37] text-gray-900"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleBackfill}
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Backfill
            </button>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          {historyQuery.isLoading ? (
            <div className="h-[360px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
            </div>
          ) : bars.length === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold">No price history yet.</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-md">
                Run a backfill to pull 20 years of daily OHLCV bars from Yahoo Finance. Or wait for
                the 06:00 SAST cron to fill it in.
              </p>
              <button
                type="button"
                onClick={handleBackfill}
                className="mt-4 inline-flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#b8902c] text-gray-900 px-4 py-2 rounded-lg font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Run backfill now
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-4">
                {latestBar ? (
                  <span className="text-3xl font-mono text-white">
                    {latestBar.close.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : null}
                {rangeChange !== null ? (
                  <span
                    className={`text-sm font-semibold ${rangeChange >= 0 ? "text-green-400" : "text-red-400"}`}
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
      </main>
    </div>
  );
}
