"use client";

import { useState } from "react";
import type {
  AnalyzedDeliveryNoteData,
  AnalyzedDeliveryNoteLineItem,
} from "@/app/lib/api/stockControlApi";

interface DeliveryNoteConfirmationModalProps {
  analyzedData: AnalyzedDeliveryNoteData;
  onClose: () => void;
  onConfirmAndAddToStock: (editedData: AnalyzedDeliveryNoteData) => void;
  onSaveForReview: (editedData: AnalyzedDeliveryNoteData) => void;
  isSubmitting: boolean;
}

const inputClass =
  "block w-full rounded border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-xs border px-1.5 py-1";

function isRubberItem(item: AnalyzedDeliveryNoteLineItem): boolean {
  return !!(
    item.rollNumber ||
    item.compoundCode ||
    item.thicknessMm ||
    item.widthMm ||
    item.lengthM
  );
}

function hasRubberItems(items: AnalyzedDeliveryNoteLineItem[]): boolean {
  return items.some(isRubberItem);
}

function hasGeneralItems(items: AnalyzedDeliveryNoteLineItem[]): boolean {
  return items.some((item) => !isRubberItem(item));
}

export function DeliveryNoteConfirmationModal(props: DeliveryNoteConfirmationModalProps) {
  const { analyzedData, onClose, onConfirmAndAddToStock, onSaveForReview, isSubmitting } = props;

  const [header, setHeader] = useState({
    deliveryNoteNumber: analyzedData.deliveryNoteNumber || "",
    deliveryDate: analyzedData.deliveryDate || "",
    supplierName: analyzedData.fromCompany.name || "",
    purchaseOrderNumber: analyzedData.purchaseOrderNumber || "",
    customerReference: analyzedData.customerReference || "",
  });

  const [lineItems, setLineItems] = useState<AnalyzedDeliveryNoteLineItem[]>(
    analyzedData.lineItems.map((item) => ({ ...item })),
  );

  const updateHeader = (field: keyof typeof header, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (
    index: number,
    field: keyof AnalyzedDeliveryNoteLineItem,
    value: unknown,
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value === "" ? null : value } : item,
      ),
    );
  };

  const addRubberRow = () => {
    const lastRubber = [...lineItems].reverse().find(isRubberItem);
    const newItem: AnalyzedDeliveryNoteLineItem = {
      description: "",
      productCode: null,
      compoundCode: lastRubber?.compoundCode || null,
      quantity: 1,
      unitOfMeasure: null,
      rollNumber: null,
      batchNumber: null,
      thicknessMm: lastRubber?.thicknessMm || null,
      widthMm: lastRubber?.widthMm || null,
      lengthM: lastRubber?.lengthM || null,
      weightKg: null,
      color: null,
      hardnessShoreA: null,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const addGeneralRow = () => {
    const newItem: AnalyzedDeliveryNoteLineItem = {
      description: "",
      productCode: null,
      compoundCode: null,
      quantity: 1,
      unitOfMeasure: "each",
      rollNumber: null,
      batchNumber: null,
      thicknessMm: null,
      widthMm: null,
      lengthM: null,
      weightKg: null,
      color: null,
      hardnessShoreA: null,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const removeRow = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const buildEditedData = (): AnalyzedDeliveryNoteData => ({
    ...analyzedData,
    deliveryNoteNumber: header.deliveryNoteNumber || null,
    deliveryDate: header.deliveryDate || null,
    purchaseOrderNumber: header.purchaseOrderNumber || null,
    customerReference: header.customerReference || null,
    fromCompany: {
      ...analyzedData.fromCompany,
      name: header.supplierName || null,
    },
    lineItems,
  });

  const rubberItems = lineItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isRubberItem(item));

  const generalItems = lineItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isRubberItem(item));

  const showRubberSection = hasRubberItems(analyzedData.lineItems) || rubberItems.length > 0;
  const showGeneralSection = hasGeneralItems(analyzedData.lineItems) || generalItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Delivery Note</h3>
              <p className="mt-1 text-sm text-gray-500">
                Review and edit the extracted data before saving
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DN Number</label>
                <input
                  type="text"
                  value={header.deliveryNoteNumber}
                  onChange={(e) => updateHeader("deliveryNoteNumber", e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={header.supplierName}
                  onChange={(e) => updateHeader("supplierName", e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={header.deliveryDate}
                  onChange={(e) => updateHeader("deliveryDate", e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input
                  type="text"
                  value={header.purchaseOrderNumber}
                  onChange={(e) => updateHeader("purchaseOrderNumber", e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={header.customerReference}
                  onChange={(e) => updateHeader("customerReference", e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2"
                />
              </div>
            </div>

            {showRubberSection && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Rubber Items</h4>
                  <button
                    type="button"
                    onClick={addRubberRow}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100"
                  >
                    <svg
                      className="h-3 w-3 mr-1"
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
                    Add Row
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Roll #
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Compound
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Thick (mm)
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Width (mm)
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Length (m)
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Weight (kg)
                        </th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rubberItems.map(({ item, index }) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.rollNumber || ""}
                              onChange={(e) => updateLineItem(index, "rollNumber", e.target.value)}
                              className={inputClass}
                              placeholder="e.g., 187-41524"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.compoundCode || ""}
                              onChange={(e) =>
                                updateLineItem(index, "compoundCode", e.target.value)
                              }
                              className={inputClass}
                              placeholder="SC38"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="number"
                              value={item.thicknessMm || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "thicknessMm",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              step="any"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="number"
                              value={item.widthMm || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "widthMm",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              step="any"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="number"
                              value={item.lengthM || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "lengthM",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              step="any"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "quantity",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              min="1"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="number"
                              value={item.weightKg || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "weightKg",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              step="any"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Remove row"
                            >
                              <svg
                                className="h-3.5 w-3.5"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showGeneralSection && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    {showRubberSection ? "General / Paint Items" : "Line Items"}
                  </h4>
                  <button
                    type="button"
                    onClick={addGeneralRow}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100"
                  >
                    <svg
                      className="h-3 w-3 mr-1"
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
                    Add Row
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Product Code
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Unit
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Weight (kg)
                        </th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {generalItems.map(({ item, index }) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) => updateLineItem(index, "description", e.target.value)}
                              className={inputClass}
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-32">
                            <input
                              type="text"
                              value={item.productCode || ""}
                              onChange={(e) => updateLineItem(index, "productCode", e.target.value)}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "quantity",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              min="1"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="text"
                              value={item.unitOfMeasure || ""}
                              onChange={(e) =>
                                updateLineItem(index, "unitOfMeasure", e.target.value)
                              }
                              className={inputClass}
                              placeholder="each"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <input
                              type="number"
                              value={item.weightKg || ""}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "weightKg",
                                  e.target.value ? Number(e.target.value) : null,
                                )
                              }
                              className={inputClass}
                              step="any"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Remove row"
                            >
                              <svg
                                className="h-3.5 w-3.5"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!showRubberSection && !showGeneralSection && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No line items detected.{" "}
                <button
                  type="button"
                  onClick={addGeneralRow}
                  className="text-teal-600 hover:underline"
                >
                  Add a row
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSaveForReview(buildEditedData())}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 disabled:opacity-50 inline-flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Save for Later Review
                  </>
                )}
              </button>
              <button
                onClick={() => onConfirmAndAddToStock(buildEditedData())}
                disabled={isSubmitting || lineItems.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Confirm & Add to Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
