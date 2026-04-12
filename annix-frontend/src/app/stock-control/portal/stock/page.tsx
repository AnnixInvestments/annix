"use client";

import { useState } from "react";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";
import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  "inventory-stock": "View and manage all stock items, quantities, and locations",
  "inventory-stock-value": "Stock valuation report across all locations",
  "inventory-import": "Bulk import stock items from spreadsheets",
  "inventory-identify": "Scan or photograph items to identify stock",
  "issue-stock": "Issue consumables, paint, and rubber to job cards or CPOs",
  returns: "Return paint, consumables, and rubber offcuts to stock",
  "stock-take": "Month-end stock take with count, approval, and posting",
  "stock-management-admin": "Module admin — demo data, sync, product categories, compounds",
};

export default function StockHubPage() {
  const items = useVisibleNavItems("Stock");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const response = await fetch("/api/stock-management/demo-seed/sync-legacy-stock", {
        method: "POST",
        headers: stockControlTokenStore.authHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`${response.status} ${text}`);
      }
      const data = await response.json();
      setSyncResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const hubItems = items.map((item) => {
    const desc = DESCRIPTIONS[item.key];
    return { item, description: desc == null ? "" : desc };
  });

  return (
    <div className="space-y-6">
      <HubPage
        title="Stock"
        description="Inventory management, stock issuing, returns, and stock takes."
        items={hubItems}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-base font-semibold text-blue-900">Sync Stock Catalog</h2>
        <p className="mt-1 text-sm text-blue-800">
          Import all stock items from the legacy inventory into the Stock Management module.
          Idempotent — safe to run multiple times.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync Stock Catalog"}
          </button>
          {syncResult ? (
            <span className="text-sm text-blue-900">
              Created {syncResult.created}, skipped {syncResult.skipped}
              {syncResult.errors.length > 0 ? `, ${syncResult.errors.length} errors` : ""}
            </span>
          ) : null}
          {syncError ? <span className="text-sm text-red-700">Error: {syncError}</span> : null}
        </div>
      </div>
    </div>
  );
}
