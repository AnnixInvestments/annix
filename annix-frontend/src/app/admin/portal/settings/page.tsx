"use client";

import { useMemo } from "react";
import { useToast } from "@/app/components/Toast";
import { isTestEnvironment } from "@/app/lib/config/environment";
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
};

const CATEGORY_ORDER = ["customer", "supplier", "admin", "system"];

export default function SettingsPage() {
  const { showToast } = useToast();
  const flagsQuery = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();
  const isTestEnv = isTestEnvironment();

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
        {isTestEnv && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Test Environment
          </span>
        )}
      </div>

      {isTestEnv && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Test Environment Mode
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Feature flags restrict access for Customer and Supplier portals. Admins retain full
                access regardless of flag state.
              </p>
            </div>
          </div>
        </div>
      )}

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
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((category) => {
            const categoryFlags = groupedFlags[category];
            if (!categoryFlags || categoryFlags.length === 0) return null;

            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;

            return (
              <div
                key={category}
                className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900 dark:text-${config.color}-200`}
                    >
                      {config.title}
                    </span>
                    {isTestEnv && (category === "customer" || category === "supplier") && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Restricts portal access
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {config.description}
                  </p>
                </div>

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
              </div>
            );
          })}

          {flags.length === 0 && (
            <div className="bg-white dark:bg-slate-800 shadow rounded-lg px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No feature flags configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
