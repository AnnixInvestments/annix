"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Settings,
  Table,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CompoundQualityDetailDto,
  type MetricStats,
  type QualityAlertDto,
  type QualityConfigDto,
  type TrendDirection,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../../components/Breadcrumb";

type ViewMode = "table" | "chart";

interface MetricCardProps {
  label: string;
  stats: MetricStats | null;
  unit?: string;
  decimals?: number;
}

function MetricCard({ label, stats, unit = "", decimals = 2 }: MetricCardProps) {
  if (!stats) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{label}</h4>
        <p className="text-2xl font-bold text-gray-400">-</p>
      </div>
    );
  }

  const trendIcon = (trend: TrendDirection) => {
    if (trend === "up") return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <ArrowRight className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-500">{label}</h4>
        {trendIcon(stats.trend)}
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {stats.latestValue.toFixed(decimals)}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="font-medium">Mean:</span> {stats.mean.toFixed(decimals)}
        </div>
        <div>
          <span className="font-medium">Std Dev:</span> {stats.stdDev.toFixed(decimals)}
        </div>
        <div>
          <span className="font-medium">Min:</span> {stats.min.toFixed(decimals)}
        </div>
        <div>
          <span className="font-medium">Max:</span> {stats.max.toFixed(decimals)}
        </div>
      </div>
    </div>
  );
}

export default function QualityTrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<CompoundQualityDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<QualityConfigDto>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const compoundCode = decodeURIComponent(params.compoundCode as string);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.qualityTrackingDetail(compoundCode);
      setDetail(data);
      setConfigForm(data.config);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (compoundCode) {
      fetchData();
    }
  }, [compoundCode]);

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await auRubberApiClient.acknowledgeQualityAlert(alertId, "admin");
      showToast("Alert acknowledged", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to acknowledge alert", "error");
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      await auRubberApiClient.updateQualityConfig(compoundCode, configForm);
      showToast("Configuration saved", "success");
      setShowConfigModal(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save configuration", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const trendIcon = (trend: TrendDirection) => {
    if (trend === "up") return <ArrowUp className="w-3 h-3 text-green-500 inline" />;
    if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-500 inline" />;
    return <ArrowRight className="w-3 h-3 text-gray-400 inline" />;
  };

  const alertSeverityBadge = (alert: QualityAlertDto) => {
    const colors = {
      WARNING: "bg-yellow-100 text-yellow-800",
      CRITICAL: "bg-red-100 text-red-800",
    };
    const icons = {
      WARNING: <AlertTriangle className="w-3 h-3 mr-1" />,
      CRITICAL: <XCircle className="w-3 h-3 mr-1" />,
    };
    return (
      <span
        className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${colors[alert.severity]}`}
      >
        {icons[alert.severity]}
        {alert.severityLabel}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Compound not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const activeAlerts = detail.alerts.filter((a) => !a.acknowledgedAt);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Quality Tracking", href: "/au-rubber/portal/quality-tracking" },
          { label: compoundCode },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{compoundCode}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Quality metrics based on {detail.batchCount} batch
            {detail.batchCount !== 1 ? "es" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configure Thresholds
        </button>
      </div>

      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-medium text-red-800">
              {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white rounded-md p-3 border border-red-100"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {alertSeverityBadge(alert)}
                    <span className="font-medium text-gray-900">{alert.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Batch: {alert.batchNumber} | Value: {alert.metricValue.toFixed(2)} | Mean:{" "}
                    {alert.meanValue.toFixed(2)} | Threshold: {alert.thresholdValue.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <MetricCard label="Shore A" stats={detail.stats.shoreA} decimals={1} />
        <MetricCard label="Specific Gravity" stats={detail.stats.specificGravity} decimals={3} />
        <MetricCard label="Rebound" stats={detail.stats.rebound} unit="%" decimals={1} />
        <MetricCard
          label="Tear Strength"
          stats={detail.stats.tearStrength}
          unit="kN/m"
          decimals={1}
        />
        <MetricCard label="Tensile" stats={detail.stats.tensile} unit="MPa" decimals={1} />
        <MetricCard label="Elongation" stats={detail.stats.elongation} unit="%" decimals={0} />
        <MetricCard label="TC90" stats={detail.stats.tc90} unit="min" decimals={2} />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Batch History</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md ${viewMode === "table" ? "bg-yellow-100 text-yellow-800" : "text-gray-500 hover:bg-gray-100"}`}
              title="Table View"
            >
              <Table className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`p-2 rounded-md ${viewMode === "chart" ? "bg-yellow-100 text-yellow-800" : "text-gray-500 hover:bg-gray-100"}`}
              title="Chart View"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shore A
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SG
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rebound
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tear
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tensile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Elong
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TC90
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detail.batches.map((batch) => (
                <tr key={batch.batchId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.batchNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.shoreA?.toFixed(1) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.specificGravity?.toFixed(3) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.rebound?.toFixed(1) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.tearStrength?.toFixed(1) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.tensile?.toFixed(1) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.elongation?.toFixed(0) ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.tc90?.toFixed(2) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6">
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Chart view would display line graphs for each metric over time.</p>
              <p className="text-sm mt-2">
                Consider integrating Recharts or a similar charting library for visualization.
              </p>
            </div>
          </div>
        )}
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowConfigModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Configure Quality Thresholds
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Customize alerting thresholds for {compoundCode}. Leave blank to use defaults.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Window Size (batches)
                  </label>
                  <input
                    type="number"
                    value={configForm.windowSize ?? 10}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, windowSize: Number(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Shore A Drift (points)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.shoreADriftThreshold ?? 3}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          shoreADriftThreshold: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Specific Gravity Drift
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={configForm.specificGravityDriftThreshold ?? 0.02}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          specificGravityDriftThreshold: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tensile Drop (%)
                    </label>
                    <input
                      type="number"
                      value={configForm.tensileStrengthDropPercent ?? 10}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          tensileStrengthDropPercent: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tear Strength Drop (%)
                    </label>
                    <input
                      type="number"
                      value={configForm.tearStrengthDropPercent ?? 15}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          tearStrengthDropPercent: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Elongation Drop (%)
                    </label>
                    <input
                      type="number"
                      value={configForm.elongationDropPercent ?? 15}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          elongationDropPercent: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      TC90 CV Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={configForm.tc90CvThreshold ?? 15}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          tc90CvThreshold: Number(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSavingConfig ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
