"use client";

import { useState } from "react";
import { useCompanyLicense, useLicenseMutations } from "../hooks/useLicenseQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import {
  STOCK_MANAGEMENT_FEATURE_KEYS,
  STOCK_MANAGEMENT_TIER_RANK,
  type StockManagementFeatureKey,
  type StockManagementTier,
} from "../types/license";

const TIERS: ReadonlyArray<{ key: StockManagementTier; label: string; description: string }> = [
  {
    key: "basic",
    label: "Basic",
    description: "Single-JC issuing only — no CPO batch, no photo, no approvals",
  },
  {
    key: "standard",
    label: "Standard",
    description: "Basic + categories + photo identification + CPO batch issuing",
  },
  {
    key: "premium",
    label: "Premium",
    description:
      "Standard + rubber rolls + offcuts + wastage bins + paint catalogue + datasheets + FIFO",
  },
  {
    key: "enterprise",
    label: "Enterprise",
    description: "Premium + full stock take + stock hold + variance reporting + valuation exports",
  },
];

interface ModuleLicensePageProps {
  companyId: number;
}

export function ModuleLicensePage(props: ModuleLicensePageProps) {
  const config = useStockManagementConfig();
  const { data: license, isLoading } = useCompanyLicense(props.companyId);
  const mutations = useLicenseMutations();
  const [editingTier, setEditingTier] = useState<StockManagementTier | null>(null);

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }
  if (!license) {
    return <div className="p-6 text-sm text-red-600">{config.label("common.error")}</div>;
  }

  const handleSetTier = async () => {
    if (!editingTier) return;
    try {
      await mutations.setTier(props.companyId, editingTier);
      setEditingTier(null);
    } catch (err) {
      console.error("Failed to set tier", err);
    }
  };

  const handleToggleFeature = async (feature: StockManagementFeatureKey) => {
    const current = license.features[feature];
    try {
      await mutations.setFeatureOverride(props.companyId, feature, !current);
    } catch (err) {
      console.error("Failed to toggle feature", err);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{config.label("admin.moduleLicense")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage the per-company stock management module tier and feature overrides
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Current Tier</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {TIERS.map((tier) => {
            const isActive = license.tier === tier.key;
            const isEditing = editingTier === tier.key;
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => setEditingTier(tier.key)}
                className={`text-left p-4 rounded-lg border-2 transition ${
                  isActive
                    ? "border-teal-600 bg-teal-50"
                    : isEditing
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">{tier.label}</div>
                <div className="text-xs text-gray-500 mt-1">{tier.description}</div>
                <div className="text-xs text-gray-400 mt-2">
                  Rank: {STOCK_MANAGEMENT_TIER_RANK[tier.key]}
                </div>
              </button>
            );
          })}
        </div>
        {editingTier && editingTier !== license.tier && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSetTier}
              disabled={mutations.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {mutations.isPending ? "Saving..." : `Set tier to ${editingTier}`}
            </button>
            <button
              type="button"
              onClick={() => setEditingTier(null)}
              className="px-4 py-2 bg-white border border-gray-300 rounded text-sm"
            >
              {config.label("common.cancel")}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Feature Overrides</h2>
        <p className="text-sm text-gray-600 mb-4">
          Toggle individual features on or off for this company. Changes take effect immediately.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {STOCK_MANAGEMENT_FEATURE_KEYS.map((feature) => {
            const enabled = license.features[feature];
            return (
              <label
                key={feature}
                className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleToggleFeature(feature)}
                  disabled={mutations.isPending}
                  className="h-4 w-4 text-teal-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{feature}</div>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ModuleLicensePage;
