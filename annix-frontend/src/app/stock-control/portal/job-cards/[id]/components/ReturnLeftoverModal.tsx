"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { StockAllocation } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ReturnLeftoverModalProps {
  jobId: number;
  allocation: StockAllocation;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReturnLeftoverModal(props: ReturnLeftoverModalProps) {
  const jobId = props.jobId;
  const allocation = props.allocation;
  const onClose = props.onClose;
  const onSuccess = props.onSuccess;

  const [litresReturned, setLitresReturned] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const productName = allocation.stockItem?.name || "Unknown Product";
  const totalLitres = allocation.totalLitres || 0;
  const costPerUnit = allocation.stockItem?.costPerUnit || 0;
  const packSizeLitres = allocation.stockItem?.packSizeLitres || null;

  const costPerLitre = packSizeLitres ? costPerUnit / packSizeLitres : costPerUnit;
  const costReduction = litresReturned * costPerLitre;

  const formattedCostReduction = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(costReduction)
    .replace("ZAR", "R");

  const canSubmit = litresReturned >= 1 && litresReturned <= totalLitres && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await stockControlApiClient.returnLeftovers(jobId, allocation.id, {
        litresReturned,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to return leftover stock. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Return Leftover Paint</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">{productName}</p>
              <p className="text-sm text-gray-500">Total allocated: {totalLitres} litres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Litres Returned
              </label>
              <input
                type="number"
                min={1}
                max={totalLitres}
                step={1}
                value={litresReturned || ""}
                onChange={(e) => setLitresReturned(Math.floor(Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter litres to return"
              />
              {litresReturned > totalLitres && (
                <p className="mt-1 text-sm text-red-600">
                  Cannot exceed total allocated ({totalLitres} litres)
                </p>
              )}
            </div>

            {litresReturned > 0 && litresReturned <= totalLitres && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <p className="text-sm text-teal-800">
                  Estimated cost reduction:{" "}
                  <span className="font-semibold">{formattedCostReduction}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                placeholder="Add any notes about the return..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? "Returning..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
