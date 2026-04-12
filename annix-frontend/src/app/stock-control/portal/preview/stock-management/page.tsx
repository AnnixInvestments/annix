"use client";

import Link from "next/link";
import { useState } from "react";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";

interface SeedResult {
  productsCreated: number;
  productsSkipped: number;
  compoundsCreated: number;
  categoriesCreated: number;
  batchesCreated: number;
}

interface PreviewLink {
  title: string;
  description: string;
  href: string;
  group: "workflow" | "admin" | "license";
}

const PREVIEW_LINKS: PreviewLink[] = [
  {
    title: "Issue Stock (Unified)",
    description:
      "Single-page issuing flow for consumables, paint, rubber rolls, and CPO issuing. Stepper + picker + photo + cart.",
    href: "/stock-control/portal/preview/stock-management/issue-stock",
    group: "workflow",
  },
  {
    title: "Returns",
    description: "Outstanding-return dashboard and offcut-return modal.",
    href: "/stock-control/portal/preview/stock-management/returns",
    group: "workflow",
  },
  {
    title: "Stock Take",
    description: "Split-pane lifecycle — draft, counting, approval, post.",
    href: "/stock-control/portal/preview/stock-management/stock-take",
    group: "workflow",
  },
  {
    title: "Variance Archive",
    description: "Trend analysis over a rolling window of posted stock takes.",
    href: "/stock-control/portal/preview/stock-management/variance-archive",
    group: "workflow",
  },
  {
    title: "Module License",
    description: "Tier selection, per-feature overrides, validity window.",
    href: "/stock-control/portal/preview/stock-management/admin/module-license",
    group: "license",
  },
  {
    title: "Admin · Product Categories",
    description: "Manage categories across consumable, paint, and rubber types.",
    href: "/stock-control/portal/preview/stock-management/admin/product-categories",
    group: "admin",
  },
  {
    title: "Admin · Variance Categories",
    description: "Shortage/overage categories with severity + photo requirement.",
    href: "/stock-control/portal/preview/stock-management/admin/variance-categories",
    group: "admin",
  },
  {
    title: "Admin · Rubber Compounds",
    description: "Compound registry used by rubber rolls and offcut inference.",
    href: "/stock-control/portal/preview/stock-management/admin/rubber-compounds",
    group: "admin",
  },
  {
    title: "Admin · Product Datasheets",
    description: "Upload / view / extract technical datasheets for products.",
    href: "/stock-control/portal/preview/stock-management/admin/product-datasheets",
    group: "admin",
  },
  {
    title: "Admin · Stock Hold",
    description: "Quarantined items awaiting QA disposition.",
    href: "/stock-control/portal/preview/stock-management/admin/stock-hold",
    group: "admin",
  },
  {
    title: "Admin · Location Migration",
    description: "Reclassify products across locations via AI suggestion.",
    href: "/stock-control/portal/preview/stock-management/admin/location-migration",
    group: "admin",
  },
];

function groupLabel(group: PreviewLink["group"]): string {
  if (group === "workflow") return "Workflow pages";
  if (group === "admin") return "Admin pages";
  return "License";
}

export default function StockManagementPreviewIndexPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedError(null);
    setSeedResult(null);
    try {
      const response = await fetch("/api/stock-management/demo-seed", {
        method: "POST",
        headers: {
          ...stockControlTokenStore.authHeaders(),
        },
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`${response.status} ${text}`);
      }
      const data = (await response.json()) as SeedResult;
      setSeedResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSeedError(message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSyncLegacy = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const response = await fetch("/api/stock-management/demo-seed/sync-legacy-stock", {
        method: "POST",
        headers: {
          ...stockControlTokenStore.authHeaders(),
        },
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

  const grouped = ["workflow", "admin", "license"] as const;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Stock Management — Preview</h1>
        <p className="text-sm text-gray-700">
          Preview every page of the new unified Stock Management module. The module runs in parallel
          to the existing Stock Control pages and shares the same database — there is no separate
          "demo mode".
        </p>
      </header>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <h2 className="text-base font-semibold text-teal-900">Load demo data</h2>
        <p className="mt-1 text-sm text-teal-800">
          Creates 4 consumables, 3 paints, and 3 rubber rolls with categories, compounds, and FIFO
          legacy batches for your current company. <strong>Idempotent</strong> — running it twice
          will skip items that already exist (by SKU).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSeeding ? "Seeding…" : "Load demo data"}
          </button>
          {seedResult ? (
            <span className="text-sm text-teal-900">
              Created {seedResult.productsCreated} products, skipped {seedResult.productsSkipped} ·{" "}
              {seedResult.categoriesCreated} categories · {seedResult.compoundsCreated} compounds ·{" "}
              {seedResult.batchesCreated} FIFO batches
            </span>
          ) : null}
          {seedError ? <span className="text-sm text-red-700">Error: {seedError}</span> : null}
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-base font-semibold text-blue-900">Sync legacy stock items</h2>
        <p className="mt-1 text-sm text-blue-800">
          Imports all stock items from the Stock Control system into the Stock Management module.
          Maps paint, rubber rolls, and consumables with their details. <strong>Idempotent</strong>{" "}
          — skips items already synced.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSyncLegacy}
            disabled={isSyncing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? "Syncing…" : "Sync legacy stock"}
          </button>
          {syncResult ? (
            <span className="text-sm text-blue-900">
              Created {syncResult.created}, skipped {syncResult.skipped}
              {syncResult.errors.length > 0 ? `, ${syncResult.errors.length} errors` : ""}
            </span>
          ) : null}
          {syncError ? <span className="text-sm text-red-700">Error: {syncError}</span> : null}
        </div>
      </section>

      {grouped.map((group) => {
        const items = PREVIEW_LINKS.filter((link) => link.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">{groupLabel(group)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-teal-400 hover:shadow"
                >
                  <div className="font-semibold text-gray-900">{link.title}</div>
                  <div className="mt-1 text-xs text-gray-600">{link.description}</div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <footer className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        These routes live under <code>annix-frontend/src/app/stock-control/portal/preview/</code>.
        Delete that folder when Phase 12 cutover removes the legacy stock-control pages. The backend
        module (<code>annix-backend/src/stock-management/</code>) remains in place.
      </footer>
    </div>
  );
}
