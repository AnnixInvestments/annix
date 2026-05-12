"use client";

import { isUndefined } from "es-toolkit/compat";
import { ArrowLeft, Plus, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { useToast } from "@/app/components/Toast";
import { ApiError } from "@/app/lib/api/apiError";
import type { AddWatchlistItemPayload, WatchlistItemResponse } from "@/app/lib/api/insightsApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from "@/app/lib/query/hooks";
import { Sparkline } from "../components/Sparkline";
import { INSIGHTS_VERSION } from "../config/version";
import { useInsightsAuth } from "../context/InsightsAuthContext";
import { AddWatchlistModal } from "./components/AddWatchlistModal";

const NAV_ITEMS: NavItem[] = [];

export default function InsightsWatchlistPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useInsightsAuth();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const watchlistQuery = useWatchlist();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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

  const handleAdd = (payload: AddWatchlistItemPayload) => {
    setAddError(null);
    addMutation.mutate(payload, {
      onSuccess: (saved) => {
        showToast(`${saved.symbol} added to watchlist.`, "success");
        setIsAddOpen(false);
      },
      onError: (err) => {
        const apiMessage = err instanceof ApiError ? err.message : null;
        const fallback = err instanceof Error ? err.message : "Could not add symbol.";
        const message = apiMessage ?? fallback;
        setAddError(message);
      },
    });
  };

  const handleDelete = async (item: WatchlistItemResponse) => {
    const confirmed = await confirm({
      title: `Remove ${item.symbol}?`,
      message: `${item.name} will be removed from the watchlist. You can add it back at any time.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    removeMutation.mutate(item.id, {
      onSuccess: () => {
        showToast(`${item.symbol} removed from watchlist.`, "success");
      },
      onError: (err) => {
        const apiMessage = err instanceof ApiError ? err.message : null;
        const fallback = err instanceof Error ? err.message : "Could not remove symbol.";
        const message = apiMessage ?? fallback;
        showToast(message, "error");
      },
    });
  };

  const queryData = watchlistQuery.data;
  const items: WatchlistItemResponse[] = queryData ?? [];
  const queryError = watchlistQuery.error;
  const queryErrorMessage = queryError instanceof Error ? queryError.message : null;

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
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
              <p className="text-sm text-gray-400">
                Assets tracked by Annix Insights. {items.length} symbol
                {items.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-[#FFA500] hover:bg-[#CC8400] text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add symbol
          </button>
        </div>

        {watchlistQuery.isLoading ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFA500]" />
          </div>
        ) : queryErrorMessage ? (
          <div
            role="alert"
            className="bg-red-900/30 border border-red-700 rounded-2xl p-6 text-red-200"
          >
            Could not load the watchlist. Please refresh the page.
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
            <TrendingUp className="w-10 h-10 text-[#FFA500] mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No symbols yet.</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              Add your first symbol to start tracking it. JSE symbols use the `.JO` suffix (e.g.
              AGL.JO); US symbols use bare tickers (e.g. SPY).
            </p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Exchange</th>
                  <th className="px-4 py-3 text-left">Currency</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Sector</th>
                  <th className="px-4 py-3 text-left">30d</th>
                  <th className="px-4 py-3 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((item) => {
                  const sectorRaw = item.sector;
                  const sectorDisplay = sectorRaw ?? "—";
                  const sparkCloses = item.sparkline;
                  return (
                    <tr key={item.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm">
                        <Link
                          href={`/insights/assets/${encodeURIComponent(item.symbol)}`}
                          className="text-[#FFA500] hover:underline"
                        >
                          {item.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{item.exchange}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{item.currency}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{item.assetType}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{sectorDisplay}</td>
                      <td className="px-4 py-3">
                        {sparkCloses.length > 1 ? (
                          <Sparkline closes={sparkCloses} />
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={removeMutation.isPending}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          aria-label={`Remove ${item.symbol}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AddWatchlistModal
        isOpen={isAddOpen}
        isSubmitting={addMutation.isPending}
        error={addError}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
      />
      {ConfirmDialog}
    </div>
  );
}
