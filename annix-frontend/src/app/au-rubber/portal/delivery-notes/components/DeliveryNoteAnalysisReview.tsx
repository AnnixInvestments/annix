"use client";

import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { DateInput } from "@/app/components/ui/DateInput";
import type {
  AnalyzedDeliveryNoteCompany,
  AnalyzedDeliveryNoteLineItem,
  AnalyzedDeliveryNoteResult,
} from "@/app/lib/api/auRubberApi";

type ReviewedDeliveryNoteData = AnalyzedDeliveryNoteResult["data"];

interface DeliveryNoteAnalysisReviewProps {
  data: ReviewedDeliveryNoteData;
  onChange: (updated: ReviewedDeliveryNoteData) => void;
}

const EMPTY_LINE_ITEM: AnalyzedDeliveryNoteLineItem = {
  description: "",
  productCode: null,
  compoundCode: null,
  quantity: null,
  unitOfMeasure: null,
  rollNumber: null,
  batchNumber: null,
  thicknessMm: null,
  widthMm: null,
  lengthM: null,
  weightKg: null,
  color: null,
  hardnessShoreA: null,
};

const FIELD_CLASS =
  "mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm p-2";

const numberOrNull = (value: string): number | null => {
  if (value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const textOrNull = (value: string): string | null => (value === "" ? null : value);

export function DeliveryNoteAnalysisReview(props: DeliveryNoteAnalysisReviewProps) {
  const { data, onChange } = props;
  const rawDocumentType = data.documentType;
  const rawDeliveryNoteNumber = data.deliveryNoteNumber;
  const rawDeliveryDate = data.deliveryDate;
  const rawPurchaseOrderNumber = data.purchaseOrderNumber;
  const rawCustomerReference = data.customerReference;
  const rawNotes = data.notes;
  const fromCompany = data.fromCompany;
  const toCompany = data.toCompany;
  const lineItems = data.lineItems;

  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editedLine, setEditedLine] = useState<AnalyzedDeliveryNoteLineItem | null>(null);

  const updateField = <K extends keyof ReviewedDeliveryNoteData>(
    key: K,
    value: ReviewedDeliveryNoteData[K],
  ) => {
    onChange({ ...data, [key]: value });
  };

  const updateCompany = (
    which: "fromCompany" | "toCompany",
    key: keyof AnalyzedDeliveryNoteCompany,
    value: string,
  ) => {
    const current = data[which];
    onChange({ ...data, [which]: { ...current, [key]: textOrNull(value) } });
  };

  const handleStartEdit = (index: number) => {
    setEditingLineIndex(index);
    setEditedLine({ ...lineItems[index] });
  };

  const handleCancelEdit = () => {
    setEditingLineIndex(null);
    setEditedLine(null);
  };

  const handleSaveEdit = () => {
    if (editingLineIndex !== null && editedLine) {
      const newLines = lineItems.map((line, i) => (i === editingLineIndex ? editedLine : line));
      onChange({ ...data, lineItems: newLines });
      setEditingLineIndex(null);
      setEditedLine(null);
    }
  };

  const handleRemoveLine = (index: number) => {
    const newLines = lineItems.filter((_, i) => i !== index);
    onChange({ ...data, lineItems: newLines });
    if (editingLineIndex === index) {
      handleCancelEdit();
    }
  };

  const handleAddLine = () => {
    const newLines = [...lineItems, { ...EMPTY_LINE_ITEM }];
    onChange({ ...data, lineItems: newLines });
    setEditingLineIndex(newLines.length - 1);
    setEditedLine({ ...EMPTY_LINE_ITEM });
  };

  const companyFields = (
    which: "fromCompany" | "toCompany",
    company: AnalyzedDeliveryNoteCompany,
  ) => {
    const companyName = company.name;
    const companyAddress = company.address;
    const companyVatNumber = company.vatNumber;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Company Name</label>
          <input
            type="text"
            value={companyName || ""}
            onChange={(e) => updateCompany(which, "name", e.target.value)}
            placeholder="Company name"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">VAT Number</label>
          <input
            type="text"
            value={companyVatNumber || ""}
            onChange={(e) => updateCompany(which, "vatNumber", e.target.value)}
            placeholder="VAT number"
            className={FIELD_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Address</label>
          <input
            type="text"
            value={companyAddress || ""}
            onChange={(e) => updateCompany(which, "address", e.target.value)}
            placeholder="Address"
            className={FIELD_CLASS}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
        These values were read by AI and may contain mistakes. Review and correct every field —
        especially the document type and roll numbers / weights — before creating the delivery note.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateField("documentType", "SUPPLIER_DELIVERY")}
            className={`px-4 py-3 rounded-lg border text-sm font-medium ${
              rawDocumentType === "SUPPLIER_DELIVERY"
                ? "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-500"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Supplier Delivery
            <span className="block text-xs font-normal mt-0.5">Stock received from a supplier</span>
          </button>
          <button
            type="button"
            onClick={() => updateField("documentType", "CUSTOMER_DELIVERY")}
            className={`px-4 py-3 rounded-lg border text-sm font-medium ${
              rawDocumentType === "CUSTOMER_DELIVERY"
                ? "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Customer Delivery
            <span className="block text-xs font-normal mt-0.5">Stock dispatched to a customer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">DN Number</label>
          <input
            type="text"
            value={rawDeliveryNoteNumber || ""}
            onChange={(e) => updateField("deliveryNoteNumber", textOrNull(e.target.value))}
            placeholder="Delivery note number"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <DateInput
            value={rawDeliveryDate}
            onChange={(value) => updateField("deliveryDate", value === "" ? null : value)}
            ariaLabel="Delivery date"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">PO Number</label>
          <input
            type="text"
            value={rawPurchaseOrderNumber || ""}
            onChange={(e) => updateField("purchaseOrderNumber", textOrNull(e.target.value))}
            placeholder="Purchase order number"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference</label>
          <input
            type="text"
            value={rawCustomerReference || ""}
            onChange={(e) => updateField("customerReference", textOrNull(e.target.value))}
            placeholder="Customer reference"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">From</h3>
        {companyFields("fromCompany", fromCompany)}
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">To</h3>
        {companyFields("toCompany", toCompany)}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Line Items ({lineItems.length})</h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 hover:text-yellow-900"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Roll #
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch #
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Weight (kg)
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItems.map((line, index) => {
                const lineDescription = line.description;
                const lineRollNumber = line.rollNumber;
                const lineBatchNumber = line.batchNumber;
                const lineQuantity = line.quantity;
                const lineWeightKg = line.weightKg;
                const editDescription = editedLine ? editedLine.description : "";
                const editRollNumber = editedLine ? editedLine.rollNumber : null;
                const editBatchNumber = editedLine ? editedLine.batchNumber : null;
                const editQuantity = editedLine ? editedLine.quantity : null;
                const editWeightKg = editedLine ? editedLine.weightKg : null;
                return (
                  <tr key={index}>
                    {editingLineIndex === index && editedLine ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) =>
                              setEditedLine({ ...editedLine, description: e.target.value })
                            }
                            className="w-44 text-sm rounded border border-gray-300 p-1"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editRollNumber || ""}
                            onChange={(e) =>
                              setEditedLine({
                                ...editedLine,
                                rollNumber: textOrNull(e.target.value),
                              })
                            }
                            className="w-24 text-sm rounded border border-gray-300 p-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editBatchNumber || ""}
                            onChange={(e) =>
                              setEditedLine({
                                ...editedLine,
                                batchNumber: textOrNull(e.target.value),
                              })
                            }
                            className="w-24 text-sm rounded border border-gray-300 p-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editQuantity ?? ""}
                            onChange={(e) =>
                              setEditedLine({
                                ...editedLine,
                                quantity: numberOrNull(e.target.value),
                              })
                            }
                            className="w-16 text-sm rounded border border-gray-300 p-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editWeightKg ?? ""}
                            onChange={(e) =>
                              setEditedLine({
                                ...editedLine,
                                weightKg: numberOrNull(e.target.value),
                              })
                            }
                            className="w-20 text-sm rounded border border-gray-300 p-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 text-sm text-gray-900">
                          {lineDescription || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500">{lineRollNumber || "-"}</td>
                        <td className="px-2 py-2 text-sm text-gray-500">
                          {lineBatchNumber || "-"}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500">{lineQuantity ?? "-"}</td>
                        <td className="px-2 py-2 text-sm text-gray-500">{lineWeightKg ?? "-"}</td>
                        <td className="px-2 py-2">
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(index)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                    No line items — use &quot;Add Line&quot; to enter one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Tip: edit a line to correct its description, roll number, batch number, quantity and
          weight. Roll-level fields like thickness, width, length, colour and hardness keep their
          extracted values.
        </p>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={rawNotes || ""}
          onChange={(e) => updateField("notes", textOrNull(e.target.value))}
          rows={2}
          placeholder="Any additional notes"
          className={FIELD_CLASS}
        />
      </div>
    </div>
  );
}
