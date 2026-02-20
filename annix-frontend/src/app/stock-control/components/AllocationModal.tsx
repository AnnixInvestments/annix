"use client";

import { useState } from "react";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { PhotoCapture } from "./PhotoCapture";

interface AllocationFormData {
  stockItemId: number | null;
  quantity: string;
  notes: string;
  photo: File | null;
}

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AllocationFormData) => void;
  stockItems: StockItem[];
}

export function AllocationModal({ isOpen, onClose, onSave, stockItems }: AllocationModalProps) {
  const [form, setForm] = useState<AllocationFormData>({
    stockItemId: null,
    quantity: "1",
    notes: "",
    photo: null,
  });

  const selectedItem = stockItems.find((item) => item.id === form.stockItemId) ?? null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "stockItemId") {
      setForm((prev) => ({ ...prev, stockItemId: value ? Number(value) : null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoCapture = (file: File) => {
    setForm((prev) => ({ ...prev, photo: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const handleClose = () => {
    setForm({ stockItemId: null, quantity: "1", notes: "", photo: null });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Allocate Stock to Job</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
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
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Item</label>
                <select
                  name="stockItemId"
                  value={form.stockItemId ?? ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select an item...</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <div className="bg-teal-50 border border-teal-200 rounded-md p-3">
                  <p className="text-sm text-teal-800">
                    Current SOH: <span className="font-semibold">{selectedItem.quantity}</span>{" "}
                    {selectedItem.unitOfMeasure}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="1"
                  max={selectedItem?.quantity ?? undefined}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <PhotoCapture onCapture={handlePhotoCapture} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                Allocate
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
