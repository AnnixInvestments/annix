"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

const ITEMS_PER_PAGE = 20;

export default function InventoryPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [modalForm, setModalForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unitOfMeasure: "each",
    costPerUnit: 0,
    quantity: 0,
    minStockLevel: 0,
    location: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {
        page: String(currentPage + 1),
        limit: String(ITEMS_PER_PAGE),
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const [result, cats] = await Promise.all([
        stockControlApiClient.stockItems(params),
        stockControlApiClient.categories(),
      ]);
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotal(result.total ?? 0);
      setCategories(Array.isArray(cats) ? cats : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load inventory"));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(0);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setModalForm({
      sku: "",
      name: "",
      description: "",
      category: "",
      unitOfMeasure: "each",
      costPerUnit: 0,
      quantity: 0,
      minStockLevel: 0,
      location: "",
    });
    setShowModal(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setModalForm({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      unitOfMeasure: item.unitOfMeasure,
      costPerUnit: item.costPerUnit,
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      location: item.location || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await stockControlApiClient.updateStockItem(editingItem.id, modalForm);
      } else {
        await stockControlApiClient.createStockItem(modalForm);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to save item"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await stockControlApiClient.deleteStockItem(id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete item"));
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">Manage stock items and quantities</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/stock-control/portal/inventory/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">Add a stock item to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SOH</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={item.quantity <= item.minStockLevel ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/inventory/${item.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {item.quantity}
                    {item.quantity <= item.minStockLevel && (
                      <svg className="w-4 h-4 text-amber-500 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.minStockLevel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatZAR(item.costPerUnit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-teal-600 hover:text-teal-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)} of {total} items
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? "Edit Stock Item" : "Add Stock Item"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={modalForm.sku}
                      onChange={(e) => setModalForm({ ...modalForm, sku: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={modalForm.name}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                    <input
                      type="text"
                      value={modalForm.unitOfMeasure}
                      onChange={(e) => setModalForm({ ...modalForm, unitOfMeasure: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalForm.costPerUnit}
                      onChange={(e) => setModalForm({ ...modalForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      value={modalForm.quantity}
                      onChange={(e) => setModalForm({ ...modalForm, quantity: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                    <input
                      type="number"
                      value={modalForm.minStockLevel}
                      onChange={(e) => setModalForm({ ...modalForm, minStockLevel: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={modalForm.location}
                    onChange={(e) => setModalForm({ ...modalForm, location: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
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
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
