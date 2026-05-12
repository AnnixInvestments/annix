"use client";

import { isUndefined } from "es-toolkit/compat";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { PaperPortfolioSummary } from "@/app/lib/api/insightsApi";
import { usePaperPortfolios } from "@/app/lib/query/hooks";
import { INSIGHTS_VERSION } from "../config/version";
import { useInsightsAuth } from "../context/InsightsAuthContext";
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

  const queryData = query.data;
  const portfolios: PaperPortfolioSummary[] = queryData ?? [];

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
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => router.push("/insights")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Paper portfolios</h1>
            <p className="text-sm text-gray-400">
              Six fake-money portfolios running in parallel. No real money, no execution. Returns
              here are an empirical answer to "is the signal engine actually any good?"
            </p>
          </div>
        </div>

        {query.isLoading ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
          </div>
        ) : portfolios.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
            <Briefcase className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No portfolios seeded yet.</h2>
            <p className="text-sm text-gray-400 mt-1">
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
              return (
                <Link
                  key={p.id}
                  href={`/insights/paper-portfolios/${encodeURIComponent(p.slug)}`}
                  className="group bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:border-[#D4AF37] hover:bg-gray-900/70 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{p.displayName}</h3>
                      <p className="text-xs text-gray-500 font-mono">{p.slug}</p>
                    </div>
                    <RiskBadge profile={p.riskProfile} />
                  </div>
                  <div className="space-y-1.5 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total value</span>
                      <span className="font-mono">{fmtCurrency(p.totalValue, p.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cash</span>
                      <span className="font-mono text-gray-300">
                        {fmtCurrency(p.currentCashBalance, p.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Invested</span>
                      <span className="font-mono text-gray-300">
                        {fmtCurrency(p.currentPortfolioValue, p.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Holdings</span>
                      <span className="font-mono text-gray-300">{p.holdingsCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <span
                      className={`text-sm font-semibold ${
                        totalReturnPct >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {totalReturnPct >= 0 ? "+" : ""}
                      {totalReturnPct.toFixed(2)}% total
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#D4AF37] transition-colors" />
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
