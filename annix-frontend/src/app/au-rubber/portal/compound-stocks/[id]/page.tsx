"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RubberCompoundMovementDto,
  type RubberCompoundStockDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { TableLoadingState } from "../../../components/TableComponents";

export default function CompoundStockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const stockId = Number(params.id);

  const [stock, setStock] = useState<RubberCompoundStockDto | null>(null);
  const [movements, setMovements] = useState<RubberCompoundMovementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [receiveQty, setReceiveQty] = useState("");
  const [receiveBatch, setReceiveBatch] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [editMinLevel, setEditMinLevel] = useState("");
  const [editReorderPoint, setEditReorderPoint] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [stockData, movementsData] = await Promise.all([
        auRubberApiClient.compoundStockById(stockId),
        auRubberApiClient.compoundMovements({ compoundStockId: stockId }),
      ]);
      setStock(stockData);
      setMovements(Array.isArray(movementsData) ? movementsData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stockId]);

  const handleReceive = async () => {
    if (!receiveQty) {
      showToast("Please enter quantity", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await auRubberApiClient.receiveCompound({
        compoundStockId: stockId,
        quantityKg: Number(receiveQty),
        batchNumber: receiveBatch || undefined,
        notes: receiveNotes || undefined,
      });
      showToast("Compound received", "success");
      setShowReceiveModal(false);
      setReceiveQty("");
      setReceiveBatch("");
      setReceiveNotes("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to receive", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustQty) {
      showToast("Please enter new quantity", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await auRubberApiClient.adjustCompound({
        compoundStockId: stockId,
        quantityKg: Number(adjustQty),
        notes: adjustNotes || undefined,
      });
      showToast("Stock adjusted", "success");
      setShowAdjustModal(false);
      setAdjustQty("");
      setAdjustNotes("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to adjust", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    try {
      setIsSubmitting(true);
      await auRubberApiClient.updateCompoundStock(stockId, {
        minStockLevelKg: editMinLevel ? Number(editMinLevel) : undefined,
        reorderPointKg: editReorderPoint ? Number(editReorderPoint) : undefined,
        location: editLocation || undefined,
      });
      showToast("Stock updated", "success");
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (stock) {
      setEditMinLevel(stock.minStockLevelKg.toString());
      setEditReorderPoint(stock.reorderPointKg.toString());
      setEditLocation(stock.location || "");
      setShowEditModal(true);
    }
  };

  const openAdjustModal = () => {
    if (stock) {
      setAdjustQty(stock.quantityKg.toString());
      setShowAdjustModal(true);
    }
  };

  const movementTypeColor = (type: string) => {
    if (type === "IN") return "bg-green-100 text-green-800";
    if (type === "OUT") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  if (isLoading) {
    return <TableLoadingState message="Loading compound stock..." />;
  }

  if (error || !stock) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            {error ? "Error Loading Data" : "Stock Not Found"}
          </div>
          <p className="text-gray-600">
            {error?.message || "The requested compound stock was not found."}
          </p>
          <button
            onClick={() => router.push("/au-rubber/portal/compound-stocks")}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Compound Inventory", href: "/au-rubber/portal/compound-stocks" },
          { label: stock.compoundName || "Stock Details" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{stock.compoundName}</h1>
          {stock.compoundCode && (
            <p className="mt-1 text-sm text-gray-600">Code: {stock.compoundCode}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowReceiveModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Receive
          </button>
          <button
            onClick={openAdjustModal}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Adjust
          </button>
          <button
            onClick={openEditModal}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`bg-white shadow rounded-lg p-4 ${stock.isLowStock ? "border-2 border-red-500" : ""}`}
        >
          <p className="text-sm font-medium text-gray-500">Current Stock</p>
          <p
            className={`text-2xl font-bold ${stock.isLowStock ? "text-red-600" : "text-gray-900"}`}
          >
            {stock.quantityKg.toFixed(2)} kg
          </p>
          {stock.isLowStock && <p className="text-xs text-red-600 mt-1">Below reorder point</p>}
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Reorder Point</p>
          <p className="text-2xl font-bold text-gray-900">{stock.reorderPointKg.toFixed(2)} kg</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Min Stock Level</p>
          <p className="text-2xl font-bold text-gray-900">{stock.minStockLevelKg.toFixed(2)} kg</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Location</p>
          <p className="text-2xl font-bold text-gray-900">{stock.location || "-"}</p>
          {stock.batchNumber && (
            <p className="text-xs text-gray-500 mt-1">Batch: {stock.batchNumber}</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Movement History</h2>
        </div>
        {movements.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">No movements recorded yet</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateZA(movement.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movementTypeColor(movement.movementType)}`}
                    >
                      {movement.movementType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.movementType === "OUT" ? "-" : "+"}
                    {movement.quantityKg.toFixed(2)} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.referenceType}
                    {movement.batchNumber && <span className="ml-2">({movement.batchNumber})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{movement.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowReceiveModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Compound</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                  <input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={receiveBatch}
                    onChange={(e) => setReceiveBatch(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={isSubmitting || !receiveQty}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Receiving..." : "Receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowAdjustModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adjust Stock</h3>
              <p className="text-sm text-gray-600 mb-4">
                Current stock: {stock.quantityKg.toFixed(2)} kg. Enter the new total quantity.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="e.g., Stock take correction"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={isSubmitting || !adjustQty}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Adjusting..." : "Adjust"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Stock Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Stock Level (kg)
                  </label>
                  <input
                    type="number"
                    value={editMinLevel}
                    onChange={(e) => setEditMinLevel(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reorder Point (kg)
                  </label>
                  <input
                    type="number"
                    value={editReorderPoint}
                    onChange={(e) => setEditReorderPoint(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
