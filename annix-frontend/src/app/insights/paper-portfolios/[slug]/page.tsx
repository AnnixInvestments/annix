"use client";

import { isUndefined } from "es-toolkit/compat";
import { ArrowLeft, Briefcase, CirclePause, CirclePlay, ScrollText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useToast } from "@/app/components/Toast";
import { ApiError } from "@/app/lib/api/apiError";
import type {
  DecisionDto,
  PaperHolding,
  PaperPortfolioSnapshot,
  PaperPortfolioSummary,
  PaperTrade,
} from "@/app/lib/api/insightsApi";
import {
  usePaperDecisionsToday,
  usePaperHoldings,
  usePaperPortfolio,
  usePaperSnapshots,
  usePaperTrades,
  usePausePortfolio,
  useResumePortfolio,
} from "@/app/lib/query/hooks";
import { Sparkline } from "../../components/Sparkline";
import { INSIGHTS_VERSION } from "../../config/version";
import { useInsightsAuth } from "../../context/InsightsAuthContext";
import { AllocationRulesCard } from "../components/AllocationRulesCard";
import { RiskBadge } from "../components/RiskBadge";

const NAV_ITEMS: NavItem[] = [];

function fmtCurrency(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtNumber(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InsightsPaperPortfolioDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();

  const rawSlug = params?.slug;
  const slug = useMemo(() => {
    if (!rawSlug) return null;
    const decoded = decodeURIComponent(rawSlug);
    return decoded.length > 0 ? decoded : null;
  }, [rawSlug]);

  const portfolioQuery = usePaperPortfolio(slug);
  const holdingsQuery = usePaperHoldings(slug);
  const tradesQuery = usePaperTrades(slug, 10);
  const snapshotsQuery = usePaperSnapshots(slug, 365);
  const decisionsQuery = usePaperDecisionsToday(slug);
  const pauseMutation = usePausePortfolio();
  const resumeMutation = useResumePortfolio();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFA500]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (!isUndefined(globalThis.window)) router.replace("/insights");
    return null;
  }

  const portfolio: PaperPortfolioSummary | undefined = portfolioQuery.data;
  const holdingsData = holdingsQuery.data;
  const holdings: PaperHolding[] = holdingsData ?? [];
  const tradesData = tradesQuery.data;
  const trades: PaperTrade[] = tradesData ?? [];
  const snapshotsData = snapshotsQuery.data;
  const snapshots: PaperPortfolioSnapshot[] = snapshotsData ?? [];
  const decisionsData = decisionsQuery.data;
  const todayDecisions = decisionsData ? decisionsData.decisions : [];
  const todaySkipped = decisionsData ? decisionsData.skippedReasons : [];
  const todayEvaluatedAt = decisionsData ? decisionsData.evaluatedAt : null;
  const portfolioLoading = portfolioQuery.isLoading;
  const pausePending = pauseMutation.isPending;
  const resumePending = resumeMutation.isPending;
  const mutationPending = pausePending || resumePending;

  if (portfolioLoading || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFA500]" />
      </div>
    );
  }

  const totalReturnPct =
    portfolio.startingCapital > 0
      ? ((portfolio.totalValue - portfolio.startingCapital) / portfolio.startingCapital) * 100
      : 0;
  const totalReturnPositive = totalReturnPct >= 0;

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
              onClick={() => router.push("/insights/paper-portfolios")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#FFA500] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Portfolios
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{portfolio.displayName}</h1>
                <RiskBadge profile={portfolio.riskProfile} />
              </div>
              <p className="text-sm text-gray-400 font-mono">{portfolio.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {portfolio.riskProfile !== "buy-and-hold" ? (
              <button
                type="button"
                onClick={() => {
                  const slugValue = portfolio.slug;
                  if (portfolio.isPaused) {
                    resumeMutation.mutate(slugValue, {
                      onSuccess: () => showToast(`${slugValue} resumed.`, "success"),
                      onError: (err) => {
                        const apiMsg = err instanceof ApiError ? err.message : null;
                        const fallback = err instanceof Error ? err.message : "Resume failed.";
                        showToast(apiMsg ?? fallback, "error");
                      },
                    });
                  } else {
                    pauseMutation.mutate(slugValue, {
                      onSuccess: () => showToast(`${slugValue} paused.`, "success"),
                      onError: (err) => {
                        const apiMsg = err instanceof ApiError ? err.message : null;
                        const fallback = err instanceof Error ? err.message : "Pause failed.";
                        showToast(apiMsg ?? fallback, "error");
                      },
                    });
                  }
                }}
                disabled={mutationPending}
                className={`inline-flex items-center gap-1.5 border text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  portfolio.isPaused
                    ? "bg-green-900/40 hover:bg-green-900/60 border-green-700 text-green-300"
                    : "bg-yellow-900/40 hover:bg-yellow-900/60 border-yellow-700 text-yellow-300"
                }`}
              >
                {portfolio.isPaused ? (
                  <>
                    <CirclePlay className="w-3.5 h-3.5" />
                    Resume
                  </>
                ) : (
                  <>
                    <CirclePause className="w-3.5 h-3.5" />
                    Pause
                  </>
                )}
              </button>
            ) : null}
            <Link
              href={`/insights/paper-portfolios/${encodeURIComponent(portfolio.slug)}/trades`}
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Full trade log
            </Link>
          </div>
        </div>

        {portfolio.isPaused ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-sm text-yellow-200"
          >
            Auto-execution is paused for this portfolio. The next 06:00 SAST cron will skip it until
            you click Resume.
          </div>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <Stat label="Total value" value={fmtCurrency(portfolio.totalValue, portfolio.currency)} />
          <Stat
            label="Cash"
            value={fmtCurrency(portfolio.currentCashBalance, portfolio.currency)}
          />
          <Stat
            label="Invested"
            value={fmtCurrency(portfolio.currentPortfolioValue, portfolio.currency)}
          />
          <Stat
            label="Total return"
            value={`${totalReturnPositive ? "+" : ""}${totalReturnPct.toFixed(2)}%`}
            valueClass={totalReturnPositive ? "text-green-400" : "text-red-400"}
          />
          <Stat
            label="Max drawdown"
            value={`−${portfolio.maxDrawdownPercent.toFixed(2)}%`}
            valueClass="text-orange-300"
          />
          <Stat label="Volatility" value={`${portfolio.volatilityScore.toFixed(2)}%`} />
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Portfolio value over time
            </h2>
            <span className="text-xs text-gray-500 font-mono">{snapshots.length} snapshots</span>
          </div>
          {snapshots.length > 1 ? (
            <Sparkline closes={snapshots.map((s) => s.totalValue)} width={1100} height={120} />
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No snapshot history yet. The first snapshot lands on the next 06:00 SAST cron.
            </p>
          )}
        </div>

        {portfolio.riskProfile !== "buy-and-hold" ? (
          <DecisionsTodayCard
            decisions={todayDecisions}
            skipped={todaySkipped}
            isLoading={decisionsQuery.isLoading}
            evaluatedAt={todayEvaluatedAt}
            isPaused={portfolio.isPaused}
          />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Holdings ({holdings.length})
            </h2>
            {holdingsQuery.isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFA500]" />
              </div>
            ) : holdings.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-gray-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">
                  No holdings yet. Auto-execution starts in Phase 6.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="pb-2 text-left">Symbol</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Avg buy</th>
                    <th className="pb-2 text-right">Current</th>
                    <th className="pb-2 text-right">P/L %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {holdings.map((h) => {
                    const positive = h.unrealisedGainLossPercent >= 0;
                    return (
                      <tr key={h.id}>
                        <td className="py-2 font-mono text-[#FFA500]">{h.symbol}</td>
                        <td className="py-2 text-right font-mono text-gray-300">
                          {fmtNumber(h.quantity)}
                        </td>
                        <td className="py-2 text-right font-mono text-gray-300">
                          {fmtNumber(h.averageBuyPrice)}
                        </td>
                        <td className="py-2 text-right font-mono text-gray-300">
                          {fmtNumber(h.currentPrice)}
                        </td>
                        <td
                          className={`py-2 text-right font-mono font-semibold ${
                            positive ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {positive ? "+" : ""}
                          {fmtNumber(h.unrealisedGainLossPercent)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <AllocationRulesCard rules={portfolio.allocationRules} />
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Recent trades ({trades.length})
            </h2>
            <Link
              href={`/insights/paper-portfolios/${encodeURIComponent(portfolio.slug)}/trades`}
              className="text-xs text-[#FFA500] hover:underline"
            >
              View all →
            </Link>
          </div>
          {tradesQuery.isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFA500]" />
            </div>
          ) : trades.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No trades yet. Monthly contribution lands on the 1st of each month.
            </p>
          ) : (
            <ul className="divide-y divide-gray-800 text-sm">
              {trades.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ActionBadge action={t.action} />
                    {t.symbol ? <span className="font-mono text-[#FFA500]">{t.symbol}</span> : null}
                    <span className="text-gray-500 text-xs truncate">{t.appReasoning}</span>
                  </div>
                  <span className="font-mono text-gray-300 text-xs whitespace-nowrap">
                    {portfolio.currency} {fmtNumber(t.tradeValue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat(props: { label: string; value: string; valueClass?: string }) {
  const propsValueClass = props.valueClass;
  const valueClass = propsValueClass ?? "text-white";
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{props.label}</div>
      <div className={`text-lg font-mono font-semibold ${valueClass}`}>{props.value}</div>
    </div>
  );
}

interface DecisionsTodayCardProps {
  decisions: DecisionDto[];
  skipped: string[];
  isLoading: boolean;
  evaluatedAt: string | null;
  isPaused: boolean;
}

function DecisionsTodayCard(props: DecisionsTodayCardProps) {
  const buys = props.decisions.filter(
    (d): d is DecisionDto & { action: "buy" } => d.action === "buy",
  );
  const sells = props.decisions.filter(
    (d): d is DecisionDto & { action: "sell" } => d.action === "sell",
  );
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Today's decisions{props.isPaused ? " (preview only — paused)" : ""}
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          {props.decisions.length} decision{props.decisions.length === 1 ? "" : "s"}
        </span>
      </div>
      {props.isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFA500]" />
        </div>
      ) : props.decisions.length === 0 ? (
        <div>
          <p className="text-sm text-gray-400">
            No buys or sells today. The engine evaluated everything and found nothing actionable.
          </p>
          {props.skipped.length > 0 ? (
            <details className="mt-3 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300">
                Why ({props.skipped.length} skip reason{props.skipped.length === 1 ? "" : "s"})
              </summary>
              <ul className="mt-2 ml-3 list-disc space-y-1">
                {props.skipped.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {sells.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-red-300 mb-2">
                Sells ({sells.length})
              </h3>
              <ul className="space-y-2">
                {sells.map((decision) => (
                  <DecisionRow key={`sell-${decision.symbol}`} decision={decision} />
                ))}
              </ul>
            </div>
          ) : null}
          {buys.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-green-300 mb-2">
                Buys ({buys.length})
              </h3>
              <ul className="space-y-2">
                {buys.map((decision) => (
                  <DecisionRow key={`buy-${decision.symbol}`} decision={decision} />
                ))}
              </ul>
            </div>
          ) : null}
          {props.skipped.length > 0 ? (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300">
                {props.skipped.length} rule-block reason{props.skipped.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 ml-3 list-disc space-y-1">
                {props.skipped.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DecisionRow(props: { decision: DecisionDto }) {
  const d = props.decision;
  const isBuy = d.action === "buy";
  return (
    <li className="bg-gray-950/40 border border-gray-800 rounded-lg p-3">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div className="flex items-baseline gap-3">
          <span
            className={`inline-flex px-1.5 py-0.5 text-xs font-bold rounded ${
              isBuy
                ? "bg-green-900/40 text-green-300 border border-green-700"
                : "bg-red-900/40 text-red-300 border border-red-700"
            }`}
          >
            {d.action.toUpperCase()}
          </span>
          <span className="font-mono text-[#FFA500] text-sm">{d.symbol}</span>
          <span className="text-xs text-gray-500">{d.assetName}</span>
        </div>
        <span className="font-mono text-xs text-gray-300">
          {d.qty} @ {d.estimatedPrice.toFixed(2)} = {d.estimatedTradeValue.toFixed(0)}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{d.reasoning}</p>
    </li>
  );
}

function ActionBadge(props: { action: string }) {
  const styles: Record<string, string> = {
    buy: "bg-green-900/40 text-green-300 border-green-700",
    sell: "bg-red-900/40 text-red-300 border-red-700",
    rebalance: "bg-blue-900/40 text-blue-300 border-blue-700",
    contribution: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  };
  const styleMatch = styles[props.action];
  const cls = styleMatch ?? "bg-gray-800 text-gray-300 border-gray-700";
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>
      {props.action}
    </span>
  );
}
