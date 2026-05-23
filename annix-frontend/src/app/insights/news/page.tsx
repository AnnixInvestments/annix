"use client";

import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import type { NewsItemDto } from "@/app/lib/api/insightsApi";
import { fromISO } from "@/app/lib/datetime";
import { useNews } from "@/app/lib/query/hooks";
import { INSIGHTS_VERSION } from "../config/version";
import { useInsightsAuth } from "../context/InsightsAuthContext";

const NAV_ITEMS: NavItem[] = [];
const PAGE_SIZE = 50;

export default function InsightsNewsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const [symbolFilter, setSymbolFilter] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/insights");
    }
  }, [isLoading, isAuthenticated, router]);

  const trimmedSymbol = symbolFilter.trim().toUpperCase();
  const query = useNews({
    limit: PAGE_SIZE,
    offset,
    symbol: trimmedSymbol.length > 0 ? trimmedSymbol : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const data = query.data;
  const rawItems = data?.items;
  const rawTotal = data?.total;
  const items: NewsItemDto[] = rawItems ?? [];
  const total = rawTotal ?? 0;
  const errorMessage = query.error instanceof Error ? query.error.message : null;

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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/insights")}
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 dark:text-gray-300 hover:text-[#FF8A00] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">News</h1>
              <p className="text-sm text-slate-300 dark:text-gray-400">
                Yahoo Finance articles tagged by Gemini for sentiment and impact. {total} item
                {total === 1 ? "" : "s"} total.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by symbol (e.g. AGL.JO)"
              value={symbolFilter}
              onChange={(e) => {
                setSymbolFilter(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A00]" />
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl p-6 text-red-700 dark:text-red-200"
          >
            Could not load news. Please refresh the page.
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center text-slate-900 dark:text-white">
            <Newspaper className="w-10 h-10 text-[#FF8A00] mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No news yet.</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 max-w-md mx-auto">
              News ingestion runs as part of the 06:00 SAST cron. Trigger the cron manually from the
              dashboard, or wait for tomorrow.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900/50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-300 dark:text-gray-400">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900/50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItemDto }) {
  const sentimentValue = item.sentiment;
  const sentimentLabel =
    sentimentValue === null
      ? "—"
      : sentimentValue > 0.2
        ? "Bullish"
        : sentimentValue < -0.2
          ? "Bearish"
          : "Neutral";
  const sentimentTone =
    sentimentValue === null
      ? "text-slate-500 dark:text-gray-500"
      : sentimentValue > 0.2
        ? "text-emerald-600 dark:text-emerald-400"
        : sentimentValue < -0.2
          ? "text-red-600 dark:text-red-400"
          : "text-slate-600 dark:text-gray-400";

  const impactColor =
    item.impactLevel === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
      : item.impactLevel === "medium"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
        : item.impactLevel === "low"
          ? "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300"
          : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-500";

  const publishedDisplay = item.publishedAt
    ? fromISO(item.publishedAt).toFormat("yyyy-LL-dd HH:mm")
    : "—";

  const itemSource = item.source;
  const sourceDisplay = itemSource ?? "Unknown source";
  const itemShortTerm = item.shortTermImplication;
  const itemMediumTerm = item.mediumTermImplication;
  const hasImplications = itemShortTerm !== null || itemMediumTerm !== null;

  return (
    <article className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 text-slate-900 dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold hover:text-[#FF8A00] transition-colors inline-flex items-start gap-1.5"
          >
            {item.title}
            <ExternalLink className="w-3.5 h-3.5 mt-1 flex-shrink-0 opacity-60" />
          </a>
          {item.summary ? (
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">{item.summary}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {item.impactLevel ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md uppercase ${impactColor}`}>
              {item.impactLevel}
            </span>
          ) : null}
          <span className={`text-xs font-medium ${sentimentTone}`}>
            {sentimentLabel}
            {sentimentValue !== null ? ` (${sentimentValue.toFixed(2)})` : ""}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-gray-500">
        <span>{sourceDisplay}</span>
        <span>·</span>
        <span>{publishedDisplay}</span>
        {item.relatedSymbols.length > 0 ? (
          <>
            <span>·</span>
            <span className="font-mono text-[#FF8A00]">
              {item.relatedSymbols.slice(0, 6).join(" · ")}
              {item.relatedSymbols.length > 6 ? ` +${item.relatedSymbols.length - 6}` : ""}
            </span>
          </>
        ) : null}
        {item.relatedThemes.length > 0 ? (
          <>
            <span>·</span>
            <span className="text-slate-500 dark:text-gray-400">
              {item.relatedThemes.slice(0, 5).join(", ")}
            </span>
          </>
        ) : null}
        {item.extractionStatus !== "extracted" ? (
          <>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400">
              {item.extractionStatus === "pending"
                ? "Awaiting extraction"
                : item.extractionStatus === "failed"
                  ? "Extraction failed"
                  : item.extractionStatus}
            </span>
          </>
        ) : null}
      </div>
      {hasImplications ? (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-800 grid sm:grid-cols-2 gap-3 text-xs">
          {itemShortTerm ? (
            <div>
              <div className="text-slate-500 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
                1-7 day
              </div>
              <div className="text-slate-700 dark:text-gray-300">{itemShortTerm}</div>
            </div>
          ) : null}
          {itemMediumTerm ? (
            <div>
              <div className="text-slate-500 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
                1-3 month
              </div>
              <div className="text-slate-700 dark:text-gray-300">{itemMediumTerm}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
