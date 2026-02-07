"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RatingBreakdown, SlaConfig } from "@/app/lib/api/messagingApi";
import {
  useAdminResponseMetrics,
  useAdminSlaConfig,
  useUpdateSlaConfig,
} from "@/app/lib/query/hooks";

type RatingKey = keyof RatingBreakdown;

const ratingLabels: Record<RatingKey, string> = {
  excellent: "Excellent",
  good: "Good",
  acceptable: "Acceptable",
  poor: "Poor",
  critical: "Critical",
};

const ratingColors: Record<RatingKey, string> = {
  excellent: "bg-emerald-500",
  good: "bg-green-500",
  acceptable: "bg-yellow-500",
  poor: "bg-orange-500",
  critical: "bg-red-500",
};

const ratingBgColors: Record<RatingKey, string> = {
  excellent: "bg-emerald-100 dark:bg-emerald-900/30",
  good: "bg-green-100 dark:bg-green-900/30",
  acceptable: "bg-yellow-100 dark:bg-yellow-900/30",
  poor: "bg-orange-100 dark:bg-orange-900/30",
  critical: "bg-red-100 dark:bg-red-900/30",
};

const ratingTextColors: Record<RatingKey, string> = {
  excellent: "text-emerald-700 dark:text-emerald-400",
  good: "text-green-700 dark:text-green-400",
  acceptable: "text-yellow-700 dark:text-yellow-400",
  poor: "text-orange-700 dark:text-orange-400",
  critical: "text-red-700 dark:text-red-400",
};

const ratingOrder: RatingKey[] = ["excellent", "good", "acceptable", "poor", "critical"];

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else if (minutes < 1440) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.round((minutes / 1440) * 10) / 10;
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
}

export default function ResponseMetricsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const metricsQuery = useAdminResponseMetrics();
  const slaQuery = useAdminSlaConfig();
  const updateSlaMutation = useUpdateSlaConfig();

  const metrics = metricsQuery.data ?? null;
  const slaConfig = slaQuery.data ?? null;

  const [isEditingSla, setIsEditingSla] = useState(false);
  const [editedSla, setEditedSla] = useState<SlaConfig | null>(null);

  const isLoading = metricsQuery.isLoading || slaQuery.isLoading;

  const handleEditSla = () => {
    setEditedSla(slaConfig ? { ...slaConfig } : null);
    setIsEditingSla(true);
  };

  const handleCancelEdit = () => {
    setIsEditingSla(false);
    setEditedSla(null);
  };

  const handleSaveSla = () => {
    if (!editedSla) return;

    updateSlaMutation.mutate(editedSla, {
      onSuccess: () => {
        setIsEditingSla(false);
        setEditedSla(null);
        showToast("SLA configuration updated", "success");
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to update SLA configuration";
        showToast(message, "error");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRatings = metrics
    ? ratingOrder.reduce((sum, key) => sum + metrics.ratingBreakdown[key], 0)
    : 0;

  const pendingResponses = metrics
    ? metrics.totalMessagesRequiringResponse - metrics.totalResponses
    : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/portal/messages")}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Response Metrics</h1>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average Response Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatDuration(metrics.averageResponseTimeMinutes)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">SLA Compliance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.slaCompliancePercent.toFixed(1)}%
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    metrics.slaCompliancePercent >= 80
                      ? "bg-green-100 dark:bg-green-900/30"
                      : metrics.slaCompliancePercent >= 60
                        ? "bg-yellow-100 dark:bg-yellow-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${
                      metrics.slaCompliancePercent >= 80
                        ? "text-green-600 dark:text-green-400"
                        : metrics.slaCompliancePercent >= 60
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Responses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.totalResponses.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Responses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pendingResponses.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    pendingResponses === 0
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${
                      pendingResponses === 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Rating Breakdown
              </h2>
              <div className="space-y-4">
                {ratingOrder.map((rating) => {
                  const count = metrics.ratingBreakdown[rating];
                  const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  return (
                    <div key={rating}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${ratingTextColors[rating]}`}>
                          {ratingLabels[rating]}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${ratingColors[rating]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalRatings > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {ratingOrder.map((rating) => {
                    const count = metrics.ratingBreakdown[rating];
                    if (count === 0) return null;
                    return (
                      <span
                        key={rating}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${ratingBgColors[rating]} ${ratingTextColors[rating]}`}
                      >
                        {ratingLabels[rating]}: {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  SLA Configuration
                </h2>
                {!isEditingSla && (
                  <button
                    onClick={handleEditSla}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {slaConfig && !isEditingSla && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Response Time SLA
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {slaConfig.responseTimeHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      Excellent
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      &lt; {slaConfig.excellentThresholdHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-green-600 dark:text-green-400">Good</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {slaConfig.excellentThresholdHours} - {slaConfig.goodThresholdHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">Acceptable</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {slaConfig.goodThresholdHours} - {slaConfig.acceptableThresholdHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-orange-600 dark:text-orange-400">Poor</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {slaConfig.acceptableThresholdHours} - {slaConfig.poorThresholdHours} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-red-600 dark:text-red-400">Critical</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      &gt; {slaConfig.poorThresholdHours} hours
                    </span>
                  </div>
                </div>
              )}

              {isEditingSla && editedSla && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Response Time SLA (hours)
                    </label>
                    <input
                      type="number"
                      value={editedSla.responseTimeHours}
                      onChange={(e) =>
                        setEditedSla({
                          ...editedSla,
                          responseTimeHours: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                        Excellent (&lt; hours)
                      </label>
                      <input
                        type="number"
                        value={editedSla.excellentThresholdHours}
                        onChange={(e) =>
                          setEditedSla({
                            ...editedSla,
                            excellentThresholdHours: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                        Good (up to hours)
                      </label>
                      <input
                        type="number"
                        value={editedSla.goodThresholdHours}
                        onChange={(e) =>
                          setEditedSla({
                            ...editedSla,
                            goodThresholdHours: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                        Acceptable (up to hours)
                      </label>
                      <input
                        type="number"
                        value={editedSla.acceptableThresholdHours}
                        onChange={(e) =>
                          setEditedSla({
                            ...editedSla,
                            acceptableThresholdHours: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                        Poor (up to hours)
                      </label>
                      <input
                        type="number"
                        value={editedSla.poorThresholdHours}
                        onChange={(e) =>
                          setEditedSla({
                            ...editedSla,
                            poorThresholdHours: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={1}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      disabled={updateSlaMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSla}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={updateSlaMutation.isPending}
                    >
                      {updateSlaMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
