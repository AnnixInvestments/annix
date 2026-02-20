"use client";

import { useState } from "react";
import type { StockItem } from "@/app/lib/api/stockControlApi";

interface DeliveryLineItem {
  stockItemId: number | null;
  quantity: string;
}

interface DeliveryNoteFormData {
  deliveryNumber: string;
  supplierName: string;
  receivedBy: string;
  notes: string;
  items: DeliveryLineItem[];
}

interface DeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DeliveryNoteFormData) => void;
  stockItems: StockItem[];
}

const emptyLineItem: DeliveryLineItem = { stockItemId: null, quantity: "1" };

export function DeliveryNoteModal({ isOpen, onClose, onSave, stockItems }: DeliveryNoteModalProps) {
  const [form, setForm] = useState<DeliveryNoteFormData>({
    deliveryNumber: "",
    supplierName: "",
    receivedBy: "",
    notes: "",
    items: [{ ...emptyLineItem }],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLineItemChange = (index: number, field: keyof DeliveryLineItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "stockItemId" ? (value ? Number(value) : null) : value }
          : item,
      ),
    }));
  };

  const addLineItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyLineItem }] }));
  };

  const removeLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const handleClose = () => {
    setForm({
      deliveryNumber: "",
      supplierName: "",
      receivedBy: "",
      notes: "",
      items: [{ ...emptyLineItem }],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">New Delivery Note</h2>
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
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Number
                  </label>
                  <input
                    type="text"
                    name="deliveryNumber"
                    value={form.deliveryNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    name="supplierName"
                    value={form.supplierName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                <input
                  type="text"
                  name="receivedBy"
                  value={form.receivedBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {form.items.map((lineItem, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-md p-3">
                      <div className="flex-1">
                        <select
                          value={lineItem.stockItemId ?? ""}
                          onChange={(e) =>
                            handleLineItemChange(index, "stockItemId", e.target.value)
                          }
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        >
                          <option value="">Select stock item...</option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          value={lineItem.quantity}
                          onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                          min="1"
                          required
                          placeholder="Qty"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                      </div>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                Create Delivery Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
