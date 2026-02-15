"use client";

import React, { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { PRODUCTS_AND_SERVICES, PROJECT_TYPES } from "@/app/lib/config/productsServices";
import { useFeatureFlags, useToggleFeatureFlag } from "@/app/lib/query/hooks";

type CategoryConfig = {
  title: string;
  description: string;
  color: string;
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  customer: {
    title: "Customer Portal",
    description: "Feature flags controlling customer portal access",
    color: "blue",
  },
  supplier: {
    title: "Supplier Portal",
    description: "Feature flags controlling supplier portal access",
    color: "purple",
  },
  admin: {
    title: "Admin Portal",
    description: "Feature flags controlling admin portal features",
    color: "orange",
  },
  system: {
    title: "System Features",
    description: "Global system feature toggles",
    color: "gray",
  },
  registration: {
    title: "Registration",
    description: "Registration and verification settings",
    color: "green",
  },
  rfq: {
    title: "RFQ Options",
    description: "Available project types and products/services for RFQ creation",
    color: "teal",
  },
};

const CATEGORY_ORDER = ["customer", "supplier", "admin", "system", "registration", "rfq"];

const RFQ_PRODUCT_FLAG_MAP = PRODUCTS_AND_SERVICES.reduce<
  Record<string, { label: string; icon: React.ReactNode }>
>((acc, product) => {
  acc[product.flagKey] = { label: product.label, icon: product.icon };
  return acc;
}, {});

const RFQ_TYPE_FLAG_MAP = PROJECT_TYPES.reduce<Record<string, { label: string }>>((acc, type) => {
  acc[type.flagKey] = { label: type.label };
  return acc;
}, {});

function RfqFlagGrid({
  categoryFlags,
  onToggle,
  toggleMutation,
}: {
  categoryFlags: Array<{ flagKey: string; enabled: boolean; description?: string | null }>;
  onToggle: (flagKey: string, currentEnabled: boolean) => void;
  toggleMutation: { isPending: boolean; variables?: { flagKey: string } };
}) {
  const typeFlags = categoryFlags.filter((f) => f.flagKey.startsWith("RFQ_TYPE_"));
  const productFlags = categoryFlags.filter((f) => f.flagKey.startsWith("RFQ_PRODUCT_"));

  return (
    <div className="p-6 space-y-6">
      {typeFlags.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
            Project Types
          </label>
          <div className="grid grid-cols-4 gap-2">
            {typeFlags.map((flag) => {
              const meta = RFQ_TYPE_FLAG_MAP[flag.flagKey];
              const isUpdating =
                toggleMutation.isPending && toggleMutation.variables?.flagKey === flag.flagKey;

              return (
                <button
                  key={flag.flagKey}
                  type="button"
                  onClick={() => onToggle(flag.flagKey, flag.enabled)}
                  disabled={isUpdating}
                  className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-colors text-sm h-10 ${
                    flag.enabled
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 cursor-pointer"
                      : "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 cursor-pointer opacity-60"
                  } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                      flag.enabled
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300 dark:border-slate-500"
                    }`}
                  >
                    {flag.enabled && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                  <span
                    className={`font-medium ${
                      flag.enabled
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {meta?.label || flag.flagKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {productFlags.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
            Products & Services
          </label>
          <div className="grid grid-cols-4 gap-2">
            {productFlags.map((flag) => {
              const meta = RFQ_PRODUCT_FLAG_MAP[flag.flagKey];
              const isUpdating =
                toggleMutation.isPending && toggleMutation.variables?.flagKey === flag.flagKey;

              return (
                <button
                  key={flag.flagKey}
                  type="button"
                  onClick={() => onToggle(flag.flagKey, flag.enabled)}
                  disabled={isUpdating}
                  className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-all text-xs h-10 ${
                    flag.enabled
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 cursor-pointer"
                      : "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 cursor-pointer opacity-60"
                  } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                      flag.enabled
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300 dark:border-slate-500"
                    }`}
                  >
                    {flag.enabled && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={flag.enabled ? "" : "grayscale"}>{meta?.icon}</span>
                  <span
                    className={`font-medium ${
                      flag.enabled
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {meta?.label || flag.flagKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const flagsQuery = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();
  const [activeTab, setActiveTab] = useState<string>("customer");

  const flags = flagsQuery.data?.flags ?? [];

  const groupedFlags = useMemo(() => {
    const groups: Record<string, typeof flags> = {};
    flags.forEach((flag) => {
      const category = flag.category || "system";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(flag);
    });
    return groups;
  }, [flags]);

  const handleToggle = (flagKey: string, currentEnabled: boolean) => {
    toggleMutation.mutate(
      { flagKey, enabled: !currentEnabled },
      {
        onSuccess: (updated) => {
          showToast(`${flagKey} ${updated.enabled ? "enabled" : "disabled"}`, "success");
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Failed to update flag";
          showToast(message, "error");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage portal feature flags and configuration
          </p>
        </div>
      </div>

      {flagsQuery.isLoading ? (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading feature flags...</p>
        </div>
      ) : flagsQuery.error ? (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg px-6 py-12 text-center">
          <p className="text-sm text-red-600">{flagsQuery.error.message}</p>
          <button
            onClick={() => flagsQuery.refetch()}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      ) : flags.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No feature flags configured
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {CATEGORY_ORDER.map((category) => {
                const categoryFlags = groupedFlags[category];
                if (!categoryFlags || categoryFlags.length === 0) return null;

                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;
                const isActive = activeTab === category;

                return (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {config.title}
                    <span
                      className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        isActive
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                      }`}
                    >
                      {categoryFlags.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {(() => {
            const categoryFlags = groupedFlags[activeTab];
            if (!categoryFlags || categoryFlags.length === 0) return null;

            const config = CATEGORY_CONFIG[activeTab] || CATEGORY_CONFIG.system;

            return (
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
                  </div>
                </div>

                {activeTab === "rfq" ? (
                  <RfqFlagGrid
                    categoryFlags={categoryFlags}
                    onToggle={handleToggle}
                    toggleMutation={toggleMutation}
                  />
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-slate-700">
                    {categoryFlags.map((flag) => {
                      const isUpdating =
                        toggleMutation.isPending &&
                        toggleMutation.variables?.flagKey === flag.flagKey;
                      return (
                        <div
                          key={flag.flagKey}
                          className="px-6 py-4 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                {flag.flagKey}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  flag.enabled
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300"
                                }`}
                              >
                                {flag.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                            {flag.description && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {flag.description}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleToggle(flag.flagKey, flag.enabled)}
                            disabled={isUpdating}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              flag.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
                            } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                            role="switch"
                            aria-checked={flag.enabled}
                            aria-label={`Toggle ${flag.flagKey}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                flag.enabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
