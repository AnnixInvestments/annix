'use client';

import React from 'react';
import { useToast } from '@/app/components/Toast';
import { useFeatureFlags, useToggleFeatureFlag } from '@/app/lib/query/hooks';

export default function SettingsPage() {
  const { showToast } = useToast();
  const flagsQuery = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();

  const flags = flagsQuery.data?.flags ?? [];

  const handleToggle = (flagKey: string, currentEnabled: boolean) => {
    toggleMutation.mutate(
      { flagKey, enabled: !currentEnabled },
      {
        onSuccess: (updated) => {
          showToast(
            `${flagKey} ${updated.enabled ? 'enabled' : 'disabled'}`,
            'success',
          );
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to update flag';
          showToast(message, 'error');
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

      <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Flags</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enable or disable portal modules. Changes take effect immediately.
          </p>
        </div>

        {flagsQuery.isLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading feature flags...</p>
          </div>
        ) : flagsQuery.error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-red-600">{flagsQuery.error.message}</p>
            <button
              onClick={() => flagsQuery.refetch()}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {flags.map((flag) => {
              const isUpdating = toggleMutation.isPending && toggleMutation.variables?.flagKey === flag.flagKey;
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
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
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
                      flag.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={flag.enabled}
                    aria-label={`Toggle ${flag.flagKey}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        flag.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            {flags.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No feature flags configured
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
