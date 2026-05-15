"use client";

import { ArrowLeft, ExternalLink, Newspaper, ScrollText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { PaperTrade, PaperTradeAction, TradeNewsProvenance } from "@/app/lib/api/insightsApi";
import { fromISO } from "@/app/lib/datetime";
import { usePaperPortfolio, usePaperTrades } from "@/app/lib/query/hooks";
import { INSIGHTS_VERSION } from "../../../config/version";
import { useInsightsAuth } from "../../../context/InsightsAuthContext";

const NAV_ITEMS: NavItem[] = [];
const ALL_ACTIONS: PaperTradeAction[] = ["buy", "sell", "rebalance", "contribution"];

function fmtNumber(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  return fromISO(iso).toFormat("yyyy-LL-dd HH:mm");
}

export default function InsightsPaperPortfolioTradesPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const [actionFilter, setActionFilter] = useState<PaperTradeAction | "all">("all");

  const rawSlug = params?.slug;
  const slug = useMemo(() => {
    if (!rawSlug) return null;
    const decoded = decodeURIComponent(rawSlug);
    return decoded.length > 0 ? decoded : null;
  }, [rawSlug]);

  const portfolioQuery = usePaperPortfolio(slug);
  const tradesQuery = usePaperTrades(slug, 1000);

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

  const portfolio = portfolioQuery.data;
  const tradesData = tradesQuery.data;
  const allTrades: PaperTrade[] = tradesData ?? [];
  const trades =
    actionFilter === "all" ? allTrades : allTrades.filter((t) => t.action === actionFilter);

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
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() =>
              router.push(`/insights/paper-portfolios/${encodeURIComponent(slug ?? "")}`)
            }
            className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-gray-300 hover:text-[#FFA500] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Portfolio
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trade log</h1>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              {portfolio ? portfolio.displayName : slug} — {trades.length} trade
              {trades.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <FilterPill
            active={actionFilter === "all"}
            onClick={() => setActionFilter("all")}
            label={`All (${allTrades.length})`}
          />
          {ALL_ACTIONS.map((a) => {
            const count = allTrades.filter((t) => t.action === a).length;
            return (
              <FilterPill
                key={a}
                active={actionFilter === a}
                onClick={() => setActionFilter(a)}
                label={`${a} (${count})`}
              />
            );
          })}
        </div>

        <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden text-slate-900 dark:text-white">
          {tradesQuery.isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFA500]" />
            </div>
          ) : trades.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText
                className="w-10 h-10 text-slate-400 dark:text-gray-600 mx-auto mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm text-slate-600 dark:text-gray-400">
                No trades match the filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-gray-900/80 text-xs uppercase tracking-wider text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Conf</th>
                  <th className="px-4 py-3 text-left">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                {trades.map((t) => {
                  const confidence = t.confidenceScore;
                  const confidenceDisplay = confidence !== null ? confidence.toFixed(0) : "—";
                  const symbolRaw = t.symbol;
                  const symbolDisplay = symbolRaw ?? "—";
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-100 dark:hover:bg-gray-900/40 transition-colors align-top"
                    >
                      <td className="px-4 py-3 text-slate-600 dark:text-gray-400 text-xs whitespace-nowrap">
                        {fmtDate(t.executedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={t.action} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[#FFA500]">{symbolDisplay}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-gray-300">
                        {t.quantity > 0 ? fmtNumber(t.quantity) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-gray-300">
                        {t.price > 0 ? fmtNumber(t.price) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-gray-200">
                        {fmtNumber(t.tradeValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-gray-400">
                        {confidenceDisplay}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-400 max-w-[400px]">
                        <div>{t.appReasoning}</div>
                        <TradeNewsDisclosure news={t.newsConsidered} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterPill(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
        props.active
          ? "bg-[#FFA500] text-gray-900"
          : "bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {props.label}
    </button>
  );
}

function TradeNewsDisclosure(props: { news: TradeNewsProvenance[] }) {
  const [open, setOpen] = useState(false);
  const news = props.news;
  const count = news.length;
  if (count === 0) {
    return null;
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-gray-500 hover:text-[#FFA500] transition-colors"
      >
        <Newspaper className="w-3 h-3" />
        {count} news article{count === 1 ? "" : "s"} considered
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <ul className="mt-2 space-y-2 border-l border-slate-200 dark:border-gray-800 pl-3">
          {news.map((item) => (
            <TradeNewsRow key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TradeNewsRow(props: { item: TradeNewsProvenance }) {
  const item = props.item;
  const sentiment = item.sentiment;
  const sentimentLabel =
    sentiment === null ? "—" : sentiment >= 0 ? `+${sentiment.toFixed(2)}` : sentiment.toFixed(2);
  const sentimentClass =
    sentiment === null
      ? "text-slate-400 dark:text-gray-600"
      : sentiment > 0.15
        ? "text-emerald-600 dark:text-emerald-400"
        : sentiment < -0.15
          ? "text-red-600 dark:text-red-400"
          : "text-amber-600 dark:text-amber-400";
  const source = item.source;
  const sourceLabel = source === null || source.length === 0 ? "unknown source" : source;
  const publishedAt = item.publishedAt;
  const dateLabel = publishedAt === null ? "" : publishedAt.slice(0, 10);
  const impact = item.impactLevel;
  const impactLabel = impact === null ? "" : impact;
  return (
    <li className="text-[11px] leading-snug">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1 text-slate-700 dark:text-gray-300 hover:text-[#FFA500] transition-colors"
      >
        <span>{item.title}</span>
        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
      </a>
      <div className="text-slate-400 dark:text-gray-600 mt-0.5">
        {sourceLabel}
        {dateLabel ? ` · ${dateLabel}` : ""}
        {impactLabel ? ` · ${impactLabel} impact` : ""}
        {" · "}
        <span className={sentimentClass}>sentiment {sentimentLabel}</span>
        {item.feedType === "macro" ? " · macro" : ""}
      </div>
    </li>
  );
}

function ActionBadge(props: { action: string }) {
  const styles: Record<string, string> = {
    buy: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    sell: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    rebalance:
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    contribution:
      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  };
  const styleMatch = styles[props.action];
  const cls =
    styleMatch ??
    "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-700";
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>
      {props.action}
    </span>
  );
}
