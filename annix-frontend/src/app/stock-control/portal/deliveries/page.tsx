"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { DeliveryNote, StockItem } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface DeliveryFormItem {
  stockItemId: number;
  quantityReceived: number;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    deliveryNumber: "",
    supplierName: "",
    receivedDate: "",
    notes: "",
    receivedBy: "",
  });
  const [formItems, setFormItems] = useState<DeliveryFormItem[]>([{ stockItemId: 0, quantityReceived: 1 }]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.deliveryNotes();
      setDeliveries(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load delivery notes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openCreateModal = async () => {
    await fetchStockItems();
    setCreateForm({
      deliveryNumber: "",
      supplierName: "",
      receivedDate: "",
      notes: "",
      receivedBy: "",
    });
    setFormItems([{ stockItemId: 0, quantityReceived: 1 }]);
    setShowModal(true);
  };

  const addFormItem = () => {
    setFormItems([...formItems, { stockItemId: 0, quantityReceived: 1 }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof DeliveryFormItem, value: number) => {
    setFormItems(formItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleCreate = async () => {
    const validItems = formItems.filter((item) => item.stockItemId > 0 && item.quantityReceived > 0);
    if (validItems.length === 0) return;

    try {
      setIsCreating(true);
      await stockControlApiClient.createDeliveryNote({
        ...createForm,
        receivedDate: createForm.receivedDate || undefined,
        notes: createForm.notes || undefined,
        receivedBy: createForm.receivedBy || undefined,
        items: validItems,
      });
      setShowModal(false);
      fetchDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create delivery note"));
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery notes...</p>
        </div>
      </div>
    );
  }

  if (error && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Notes</h1>
          <p className="mt-1 text-sm text-gray-600">Track incoming stock deliveries</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Delivery
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery notes</h3>
            <p className="mt-1 text-sm text-gray-500">Record a new delivery to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received By</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/deliveries/${delivery.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {delivery.deliveryNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.supplierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateZA(delivery.receivedDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.receivedBy || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{delivery.items?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Delivery Note</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Number</label>
                    <input
                      type="text"
                      value={createForm.deliveryNumber}
                      onChange={(e) => setCreateForm({ ...createForm, deliveryNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <input
                      type="text"
                      value={createForm.supplierName}
                      onChange={(e) => setCreateForm({ ...createForm, supplierName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Received Date</label>
                    <input
                      type="date"
                      value={createForm.receivedDate}
                      onChange={(e) => setCreateForm({ ...createForm, receivedDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Received By</label>
                    <input
                      type="text"
                      value={createForm.receivedBy}
                      onChange={(e) => setCreateForm({ ...createForm, receivedBy: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      onClick={addFormItem}
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formItems.map((formItem, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <select
                          value={formItem.stockItemId}
                          onChange={(e) => updateFormItem(index, "stockItemId", parseInt(e.target.value) || 0)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        >
                          <option value={0}>Select item...</option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={formItem.quantityReceived}
                          onChange={(e) => updateFormItem(index, "quantityReceived", parseInt(e.target.value) || 1)}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          placeholder="Qty"
                        />
                        {formItems.length > 1 && (
                          <button
                            onClick={() => removeFormItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !createForm.deliveryNumber || !createForm.supplierName}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Delivery Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
