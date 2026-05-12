"use client";

import { isUndefined } from "es-toolkit/compat";
import { ArrowLeft, Briefcase, ScrollText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { PaperHolding, PaperPortfolioSummary, PaperTrade } from "@/app/lib/api/insightsApi";
import { usePaperHoldings, usePaperPortfolio, usePaperTrades } from "@/app/lib/query/hooks";
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

  const portfolio: PaperPortfolioSummary | undefined = portfolioQuery.data;
  const holdingsData = holdingsQuery.data;
  const holdings: PaperHolding[] = holdingsData ?? [];
  const tradesData = tradesQuery.data;
  const trades: PaperTrade[] = tradesData ?? [];
  const portfolioLoading = portfolioQuery.isLoading;

  if (portfolioLoading || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  const totalReturnPct =
    portfolio.startingCapital > 0
      ? ((portfolio.totalValue - portfolio.startingCapital) / portfolio.startingCapital) * 100
      : 0;
  const totalReturnPositive = totalReturnPct >= 0;

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
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/insights/paper-portfolios")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#D4AF37] transition-colors"
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
          <Link
            href={`/insights/paper-portfolios/${encodeURIComponent(portfolio.slug)}/trades`}
            className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ScrollText className="w-3.5 h-3.5" />
            Full trade log
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Holdings ({holdings.length})
            </h2>
            {holdingsQuery.isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]" />
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
                        <td className="py-2 font-mono text-[#D4AF37]">{h.symbol}</td>
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
              className="text-xs text-[#D4AF37] hover:underline"
            >
              View all →
            </Link>
          </div>
          {tradesQuery.isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]" />
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
                    {t.symbol ? <span className="font-mono text-[#D4AF37]">{t.symbol}</span> : null}
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
