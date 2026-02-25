"use client";

import { CheckCircle, Package, QrCode, Truck, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AllocationSummary,
  DispatchProgress,
  DispatchScan,
  JobCard,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

export default function DispatchPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [progress, setProgress] = useState<DispatchProgress | null>(null);
  const [history, setHistory] = useState<DispatchScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanQuantity, setScanQuantity] = useState(1);
  const [scanNotes, setScanNotes] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AllocationSummary | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobData, progressData, historyData] = await Promise.all([
        stockControlApiClient.jobCardById(jobId),
        stockControlApiClient.dispatchProgress(jobId),
        stockControlApiClient.dispatchHistory(jobId),
      ]);
      setJobCard(jobData);
      setProgress(progressData);
      setHistory(historyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispatch data");
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (scanInputRef.current && !showScanModal) {
      scanInputRef.current.focus();
    }
  }, [showScanModal]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    try {
      setIsScanning(true);
      const result = await stockControlApiClient.scanQrCode(scanInput.trim());

      if (result.type === "job_card") {
        if (result.id !== jobId) {
          setError(`Scanned QR belongs to job card ${result.id}, not the current one.`);
        } else {
          setError("This is a job card QR code. Please scan a stock item.");
        }
        setScanInput("");
        return;
      }

      const item = progress?.items.find((i) => i.stockItemId === result.id);
      if (item) {
        setSelectedItem(item);
        setScanQuantity(Math.min(1, item.allocatedQuantity - item.dispatchedQuantity));
        setShowScanModal(true);
      } else {
        setError("Scanned item is not allocated to this job card.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
      setScanInput("");
    }
  };

  const handleManualSelect = (item: AllocationSummary) => {
    setSelectedItem(item);
    setScanQuantity(Math.min(1, item.allocatedQuantity - item.dispatchedQuantity));
    setShowScanModal(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedItem) return;

    try {
      setIsScanning(true);
      await stockControlApiClient.scanDispatchItem(
        jobId,
        selectedItem.stockItemId,
        scanQuantity,
        scanNotes || undefined,
      );
      setShowScanModal(false);
      setSelectedItem(null);
      setScanQuantity(1);
      setScanNotes("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCompleteDispatch = async () => {
    if (!progress?.isComplete) {
      setError("Cannot complete dispatch - not all items have been dispatched.");
      return;
    }

    try {
      setIsCompleting(true);
      await stockControlApiClient.completeDispatch(jobId);
      router.push(`/stock-control/portal/job-cards/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete dispatch");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dispatch data...</p>
        </div>
      </div>
    );
  }

  if (!jobCard || !progress) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error || "Job card not found"}</p>
          <Link
            href="/stock-control/portal/job-cards"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Job Cards
          </Link>
        </div>
      </div>
    );
  }

  const remainingItems = progress.items.filter(
    (item) => item.dispatchedQuantity < item.allocatedQuantity,
  );
  const completedItems = progress.items.filter(
    (item) => item.dispatchedQuantity >= item.allocatedQuantity,
  );
  const progressPercentage =
    progress.totalAllocated > 0
      ? Math.round((progress.totalDispatched / progress.totalAllocated) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/stock-control/portal/job-cards/${jobId}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Dispatch: {jobCard.jobNumber}</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                Ready for Dispatch
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        {progress.isComplete && (
          <button
            onClick={handleCompleteDispatch}
            disabled={isCompleting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isCompleting ? "Completing..." : "Complete Dispatch"}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Scan Item</h2>
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Scan barcode or enter manually</span>
          </div>
        </div>
        <form onSubmit={handleScanSubmit} className="flex space-x-4">
          <input
            ref={scanInputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Scan barcode or enter stock item code..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-lg"
            autoFocus
          />
          <button
            type="submit"
            disabled={isScanning || !scanInput.trim()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-medium"
          >
            {isScanning ? "Scanning..." : "Scan"}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Dispatch Progress</h3>
            <span className="text-sm text-gray-500">
              {progress.totalDispatched} / {progress.totalAllocated} items dispatched
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${progress.isComplete ? "bg-green-500" : "bg-teal-500"}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-gray-500 text-right">{progressPercentage}% complete</p>
          </div>
        </div>

        {remainingItems.length > 0 && (
          <div className="px-4 py-4 sm:px-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2 text-orange-500" />
              Pending Items ({remainingItems.length})
            </h4>
            <div className="space-y-2">
              {remainingItems.map((item) => (
                <div
                  key={item.stockItemId}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100"
                  onClick={() => handleManualSelect(item)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.stockItem?.name}</p>
                    <p className="text-sm text-gray-500">SKU: {item.stockItem?.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {item.dispatchedQuantity} / {item.allocatedQuantity}
                    </p>
                    <p className="text-sm text-orange-600">
                      {item.allocatedQuantity - item.dispatchedQuantity} remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedItems.length > 0 && (
          <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Dispatched Items ({completedItems.length})
            </h4>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <div
                  key={item.stockItemId}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.stockItem?.name}</p>
                    <p className="text-sm text-gray-500">SKU: {item.stockItem?.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {item.dispatchedQuantity} / {item.allocatedQuantity}
                    </p>
                    <CheckCircle className="w-5 h-5 text-green-500 inline-block ml-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-gray-400" />
              Dispatch History
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Scanned By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((scan) => (
                <tr key={scan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">
                      {scan.stockItem?.name || `Item #${scan.stockItemId}`}
                    </p>
                    <p className="text-xs text-gray-500">{scan.stockItem?.sku}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    {scan.quantityDispatched}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.scannedByName || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateLongZA(new Date(scan.scannedAt))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {scan.dispatchNotes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showScanModal && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowScanModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Dispatch</h3>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{selectedItem.stockItem?.name}</p>
                <p className="text-sm text-gray-500">SKU: {selectedItem.stockItem?.sku}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Remaining to dispatch:{" "}
                  <span className="font-semibold">
                    {selectedItem.allocatedQuantity - selectedItem.dispatchedQuantity}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Dispatch
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.allocatedQuantity - selectedItem.dispatchedQuantity}
                    value={scanQuantity}
                    onChange={(e) => setScanQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={scanNotes}
                    onChange={(e) => setScanNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Any notes about this dispatch..."
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowScanModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDispatch}
                  disabled={isScanning}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300"
                >
                  {isScanning ? "Dispatching..." : "Confirm Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
