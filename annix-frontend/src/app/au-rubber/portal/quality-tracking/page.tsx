"use client";

import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CompoundQualitySummaryDto,
  type QualityAlertDto,
  type QualityStatus,
  type TrendDirection,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "compoundCode" | "batchCount" | "lastBatchDate" | "status";

export default function QualityTrackingPage() {
  const { showToast } = useToast();
  const [summaries, setSummaries] = useState<CompoundQualitySummaryDto[]>([]);
  const [alerts, setAlerts] = useState<QualityAlertDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<QualityStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("lastBatchDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, alertData] = await Promise.all([
        auRubberApiClient.qualityTrackingSummary(),
        auRubberApiClient.qualityAlerts(),
      ]);
      setSummaries(Array.isArray(summaryData) ? summaryData : []);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await auRubberApiClient.acknowledgeQualityAlert(alertId, "admin");
      showToast("Alert acknowledged", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to acknowledge alert", "error");
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortSummaries = (items: CompoundQualitySummaryDto[]): CompoundQualitySummaryDto[] => {
    return [...items].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "compoundCode") {
        return direction * a.compoundCode.localeCompare(b.compoundCode);
      }
      if (sortColumn === "batchCount") {
        return direction * (a.batchCount - b.batchCount);
      }
      if (sortColumn === "lastBatchDate") {
        const dateA = a.lastBatchDate || "";
        const dateB = b.lastBatchDate || "";
        return direction * dateA.localeCompare(dateB);
      }
      if (sortColumn === "status") {
        const statusOrder: Record<QualityStatus, number> = { critical: 0, warning: 1, normal: 2 };
        return direction * (statusOrder[a.status] - statusOrder[b.status]);
      }
      return 0;
    });
  };

  const filteredSummaries = sortSummaries(
    summaries.filter((summary) => {
      const matchesSearch =
        searchQuery === "" ||
        summary.compoundCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "" || summary.status === filterStatus;
      return matchesSearch && matchesStatus;
    }),
  );

  const paginatedSummaries = filteredSummaries.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus]);

  const trendIcon = (trend: TrendDirection) => {
    if (trend === "up") return <ArrowUp className="w-3 h-3 text-green-500 inline" />;
    if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-500 inline" />;
    return <ArrowRight className="w-3 h-3 text-gray-400 inline" />;
  };

  const statusBadge = (status: QualityStatus) => {
    const colors: Record<QualityStatus, string> = {
      normal: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      critical: "bg-red-100 text-red-800",
    };
    const icons: Record<QualityStatus, React.ReactNode> = {
      normal: <CheckCircle className="w-3 h-3 mr-1" />,
      warning: <AlertTriangle className="w-3 h-3 mr-1" />,
      critical: <XCircle className="w-3 h-3 mr-1" />,
    };
    const labels: Record<QualityStatus, string> = {
      normal: "Normal",
      warning: "Warning",
      critical: "Critical",
    };
    return (
      <span
        className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  const formatMetric = (value: number | null | undefined, decimals = 1): string => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(decimals);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.acknowledgedAt);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Quality Tracking" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compound Quality Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor quality metrics and trends for rubber compounds
          </p>
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-medium text-red-800">
              {activeAlerts.length} Active Quality Alert{activeAlerts.length !== 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-2">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white rounded-md p-3 border border-red-100"
              >
                <div>
                  <span className="font-medium text-gray-900">{alert.compoundCode}</span>
                  <span className="mx-2 text-gray-400">-</span>
                  <span className="text-sm text-gray-600">{alert.title}</span>
                  <span className="ml-2 text-xs text-gray-400">(Batch: {alert.batchNumber})</span>
                </div>
                <button
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Acknowledge
                </button>
              </div>
            ))}
            {activeAlerts.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                +{activeAlerts.length - 5} more alerts
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Compound code"
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as QualityStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading quality data..." />
        ) : filteredSummaries.length === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No quality data found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery || filterStatus
                  ? "Try adjusting your filters"
                  : "Quality metrics will appear after CoCs are approved"}
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("compoundCode")}
                >
                  Compound
                  <SortIcon active={sortColumn === "compoundCode"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("batchCount")}
                >
                  Batches
                  <SortIcon active={sortColumn === "batchCount"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("lastBatchDate")}
                >
                  Last Batch
                  <SortIcon active={sortColumn === "lastBatchDate"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Shore A
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  TC90
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tensile
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSummaries.map((summary) => (
                <tr key={summary.compoundCode} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/quality-tracking/${encodeURIComponent(summary.compoundCode)}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {summary.compoundCode}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.batchCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.lastBatchDate
                      ? new Date(summary.lastBatchDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.shoreA ? (
                      <>
                        {formatMetric(summary.shoreA.latestValue, 1)}{" "}
                        {trendIcon(summary.shoreA.trend)}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.tc90 ? (
                      <>
                        {formatMetric(summary.tc90.latestValue, 2)} {trendIcon(summary.tc90.trend)}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.tensile ? (
                      <>
                        {formatMetric(summary.tensile.latestValue, 1)}{" "}
                        {trendIcon(summary.tensile.trend)}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(summary.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/au-rubber/portal/quality-tracking/${encodeURIComponent(summary.compoundCode)}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSummaries.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="compounds"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
