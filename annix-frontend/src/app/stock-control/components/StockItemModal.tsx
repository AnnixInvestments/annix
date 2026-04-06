"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { useModalAccessibility } from "../lib/useModalAccessibility";
import { isNonNegativeNumber } from "../lib/validation";

interface StockItemFormData {
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: string;
  quantity: string;
  minStockLevel: string;
  location: string;
}

interface StockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StockItemFormData) => void;
  item?: StockItem;
}

const emptyForm: StockItemFormData = {
  sku: "",
  name: "",
  description: "",
  category: "",
  unitOfMeasure: "each",
  costPerUnit: "0",
  quantity: "0",
  minStockLevel: "0",
  location: "",
};

export function StockItemModal(props: StockItemModalProps) {
  const { isOpen, onClose, onSave, item } = props;
  const [form, setForm] = useState<StockItemFormData>(emptyForm);

  useEffect(() => {
    if (item) {
      setForm({
        sku: item.sku,
        name: item.name,
        description: item.description ?? "",
        category: item.category ?? "",
        unitOfMeasure: item.unitOfMeasure,
        costPerUnit: String(item.costPerUnit),
        quantity: String(item.quantity),
        minStockLevel: String(item.minStockLevel),
        location: item.location ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [item, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.sku.trim()) {
      newErrors.sku = "SKU is required";
    }
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!isNonNegativeNumber(form.quantity)) {
      newErrors.quantity = "Must be a non-negative number";
    }
    if (!isNonNegativeNumber(form.costPerUnit)) {
      newErrors.costPerUnit = "Must be a non-negative number";
    }
    if (!isNonNegativeNumber(form.minStockLevel)) {
      newErrors.minStockLevel = "Must be a non-negative number";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    setFieldErrors({});
    onSave(form);
  };

  const modalFocusRef = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-item-modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 id="stock-item-modal-title" className="text-lg font-semibold text-gray-900">
              {item ? "Edit Stock Item" : "New Stock Item"}
            </h2>
            <button
              ref={modalFocusRef as React.RefObject<HTMLButtonElement>}
              aria-label="Close"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${fieldErrors.sku ? "border-red-500" : "border-gray-300"}`}
                  />
                  {fieldErrors.sku && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.sku}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${fieldErrors.name ? "border-red-500" : "border-gray-300"}`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measure
                  </label>
                  <select
                    name="unitOfMeasure"
                    value={form.unitOfMeasure}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="each">Each</option>
                    <option value="kg">Kilogram</option>
                    <option value="m">Metre</option>
                    <option value="l">Litre</option>
                    <option value="box">Box</option>
                    <option value="roll">Roll</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost per Unit
                  </label>
                  <input
                    type="number"
                    name="costPerUnit"
                    value={form.costPerUnit}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${fieldErrors.costPerUnit ? "border-red-500" : "border-gray-300"}`}
                  />
                  {fieldErrors.costPerUnit && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.costPerUnit}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${fieldErrors.quantity ? "border-red-500" : "border-gray-300"}`}
                  />
                  {fieldErrors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={form.minStockLevel}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${fieldErrors.minStockLevel ? "border-red-500" : "border-gray-300"}`}
                  />
                  {fieldErrors.minStockLevel && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.minStockLevel}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                {item ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
