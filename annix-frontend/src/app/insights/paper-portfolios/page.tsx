"use client";

import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { PaperPortfolioSummary } from "@/app/lib/api/insightsApi";
import { usePaperPortfolios } from "@/app/lib/query/hooks";
import { Sparkline } from "../components/Sparkline";
import { INSIGHTS_VERSION } from "../config/version";
import { useInsightsAuth } from "../context/InsightsAuthContext";
import { ExecutorBadge } from "./components/ExecutorBadge";
import { RiskBadge } from "./components/RiskBadge";

const NAV_ITEMS: NavItem[] = [];

function fmtCurrency(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InsightsPaperPortfoliosPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const query = usePaperPortfolios();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/insights");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const queryData = query.data;
  const portfolios: PaperPortfolioSummary[] = queryData ?? [];

  return (
    <div className="min-h-screen text-white">
      <PortalToolbar
        portalType="insights"
        navItems={NAV_ITEMS}
        user={{ email: user.email }}
        onLogout={logout}
        version={INSIGHTS_VERSION}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => router.push("/insights")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-300 hover:text-[#FF8A00] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Paper portfolios</h1>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Six fake-money portfolios running in parallel. No real money, no execution. Returns
              here are an empirical answer to "is the signal engine actually any good?"
            </p>
          </div>
        </div>

        {query.isLoading ? (
          <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A00]" />
          </div>
        ) : portfolios.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center text-slate-900 dark:text-white">
            <Briefcase className="w-10 h-10 text-[#FF8A00] mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No portfolios seeded yet.</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Run migration 1820100000084 to seed the six paper portfolios.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {portfolios.map((p) => {
              const totalReturnPct =
                p.startingCapital > 0
                  ? ((p.totalValue - p.startingCapital) / p.startingCapital) * 100
                  : 0;
              const sparklineCloses = p.valueSparkline;
              const drawdownPct = p.maxDrawdownPercent;
              return (
                <Link
                  key={p.id}
                  href={`/insights/paper-portfolios/${encodeURIComponent(p.slug)}`}
                  className="group bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 hover:border-[#FF8A00] hover:bg-slate-100 dark:hover:bg-gray-900/70 transition-colors text-slate-900 dark:text-white"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{p.displayName}</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-500 font-mono">
                        {p.slug}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RiskBadge profile={p.riskProfile} />
                      <ExecutorBadge strategy={p.executorStrategy} />
                    </div>
                  </div>
                  <div className="mb-3 h-9 flex items-center">
                    {sparklineCloses.length > 1 ? (
                      <Sparkline closes={sparklineCloses} width={240} height={36} />
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-gray-600">
                        No snapshots yet.
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-400">Total value</span>
                      <span className="font-mono">{fmtCurrency(p.totalValue, p.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-400">Holdings · cash</span>
                      <span className="font-mono text-slate-700 dark:text-gray-300">
                        {p.holdingsCount} · {fmtCurrency(p.currentCashBalance, p.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-gray-400">Max drawdown</span>
                      <span className="font-mono text-slate-700 dark:text-gray-300">
                        −{drawdownPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-gray-800">
                    <span
                      className={`text-sm font-semibold ${
                        totalReturnPct >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {totalReturnPct >= 0 ? "+" : ""}
                      {totalReturnPct.toFixed(2)}% total
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 dark:text-gray-500 group-hover:text-[#FF8A00] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
