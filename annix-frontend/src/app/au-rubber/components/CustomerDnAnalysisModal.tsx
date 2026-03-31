"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import type {
  AnalyzeCustomerDnsResult,
  CustomerDnGroup,
  CustomerDnLineItem,
  CustomerDnOverride,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";

const STOCK_CATEGORY_OPTIONS = ["Rubber Rolls", "Pump Parts", "Wear Liners", "Spare Parts"];

interface CustomerDnAnalysisModalProps {
  analysis: AnalyzeCustomerDnsResult;
  files: File[];
  customers: RubberCompanyDto[];
  onClose: () => void;
  onConfirm: (overrides: CustomerDnOverride[]) => Promise<void>;
  isCreating: boolean;
}

function hasPartItems(lineItems: CustomerDnLineItem[]): boolean {
  return lineItems.some((item) => item.itemCategory === "PART");
}

function allPartItems(lineItems: CustomerDnLineItem[]): boolean {
  return lineItems.length > 0 && lineItems.every((item) => item.itemCategory === "PART");
}

export function CustomerDnAnalysisModal(props: CustomerDnAnalysisModalProps) {
  const { analysis, files, customers, onClose, onConfirm, isCreating } = props;
  const [overrides, setOverrides] = useState<CustomerDnOverride[]>(
    analysis.groups.map((group) => ({
      deliveryNoteNumber: group.deliveryNoteNumber,
      customerId: group.customerId || null,
      customerReference: group.customerReference || null,
      deliveryDate: group.deliveryDate || null,
      stockCategory: allPartItems(group.allLineItems) ? "Pump Parts" : null,
      lineItems: group.allLineItems.map((item) => ({ ...item })),
    })),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  const toggleGroup = (index: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGroups(newExpanded);
  };

  const updateOverride = (index: number, field: keyof CustomerDnOverride, value: unknown) => {
    setOverrides((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value === "" ? null : value } : o)),
    );
  };

  const updateLineItem = (
    groupIndex: number,
    itemIndex: number,
    field: keyof CustomerDnLineItem,
    value: unknown,
  ) => {
    setOverrides((prev) =>
      prev.map((o, gi) => {
        if (gi !== groupIndex) return o;
        const items = [...(o.lineItems || [])];
        items[itemIndex] = { ...items[itemIndex], [field]: value === "" ? null : value };
        return { ...o, lineItems: items };
      }),
    );
  };

  const addLineItem = (groupIndex: number, category: string) => {
    setOverrides((prev) =>
      prev.map((o, gi) => {
        if (gi !== groupIndex) return o;
        const items = [...(o.lineItems || [])];
        const lastItem = items[items.length - 1];
        const isPart = category === "PART";
        const newItem: CustomerDnLineItem = {
          lineNumber: items.length + 1,
          compoundType: lastItem?.compoundType || null,
          thicknessMm: isPart ? null : lastItem?.thicknessMm || null,
          widthMm: isPart ? null : lastItem?.widthMm || null,
          lengthM: isPart ? null : lastItem?.lengthM || null,
          quantity: 1,
          rollWeightKg: null,
          rollNumber: null,
          cocBatchNumbers: null,
          itemCategory: category,
          description: null,
        };
        return { ...o, lineItems: [...items, newItem] };
      }),
    );
  };

  const removeLineItem = (groupIndex: number, itemIndex: number) => {
    setOverrides((prev) =>
      prev.map((o, gi) => {
        if (gi !== groupIndex) return o;
        const items = (o.lineItems || []).filter((_, idx) => idx !== itemIndex);
        return { ...o, lineItems: items };
      }),
    );
  };

  const validGroups = analysis.groups.filter(
    (group, index) => overrides[index]?.customerId || group.customerName,
  );

  const handleConfirm = async () => {
    await onConfirm(overrides);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Customer Delivery Note Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">
                {analysis.groups.length} delivery note{analysis.groups.length !== 1 ? "s" : ""}{" "}
                detected from {files.length} file{files.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          {analysis.unmatchedCustomerNames.length > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center">
                <UserPlus className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  New customers will be created: {analysis.unmatchedCustomerNames.join(", ")}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {analysis.groups.map((group, groupIndex) => (
                <GroupCard
                  key={groupIndex}
                  group={group}
                  groupIndex={groupIndex}
                  override={overrides[groupIndex]}
                  customers={customers}
                  sourceFiles={files}
                  isExpanded={expandedGroups.has(groupIndex)}
                  onToggle={() => toggleGroup(groupIndex)}
                  onUpdateOverride={(field, value) => updateOverride(groupIndex, field, value)}
                  onUpdateLineItem={(itemIndex, field, value) =>
                    updateLineItem(groupIndex, itemIndex, field, value)
                  }
                  onAddLineItem={(category) => addLineItem(groupIndex, category)}
                  onRemoveLineItem={(itemIndex) => removeLineItem(groupIndex, itemIndex)}
                  isExisting={
                    Array.isArray(analysis.existingDnNumbers) &&
                    analysis.existingDnNumbers.includes(group.deliveryNoteNumber)
                  }
                />
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              {validGroups.length} of {analysis.groups.length} ready to create
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isCreating || validGroups.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
              >
                {isCreating ? (
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
                    <Check className="h-4 w-4 mr-1" />
                    Create {validGroups.length} Delivery Note
                    {validGroups.length !== 1 ? "s" : ""}
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

const inputClass =
  "block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs border px-1.5 py-1";

interface GroupCardProps {
  group: CustomerDnGroup;
  groupIndex: number;
  override: CustomerDnOverride;
  customers: RubberCompanyDto[];
  sourceFiles: File[];
  isExpanded: boolean;
  isExisting: boolean;
  onToggle: () => void;
  onUpdateOverride: (field: keyof CustomerDnOverride, value: unknown) => void;
  onUpdateLineItem: (itemIndex: number, field: keyof CustomerDnLineItem, value: unknown) => void;
  onAddLineItem: (category: string) => void;
  onRemoveLineItem: (itemIndex: number) => void;
}

function GroupCard(props: GroupCardProps) {
  const group = props.group;
  const override = props.override;
  const customers = props.customers;
  const sourceFiles = props.sourceFiles;
  const isExpanded = props.isExpanded;
  const isExisting = props.isExisting;
  const onToggle = props.onToggle;
  const onUpdateOverride = props.onUpdateOverride;
  const onUpdateLineItem = props.onUpdateLineItem;
  const onAddLineItem = props.onAddLineItem;
  const onRemoveLineItem = props.onRemoveLineItem;
  const isValid = !!override.customerId || !!group.customerName;
  const willCreateNewCustomer = !override.customerId && !!group.customerName;
  const lineItems = override.lineItems || group.allLineItems;
  const [customCategory, setCustomCategory] = useState("");

  const partItems = lineItems.filter((item) => item.itemCategory === "PART");
  const rollItems = lineItems.filter((item) => item.itemCategory !== "PART");
  const hasParts = partItems.length > 0;
  const hasRolls = rollItems.length > 0;

  return (
    <div
      className={`border rounded-lg ${!isValid ? "border-yellow-300 bg-yellow-50" : willCreateNewCustomer ? "border-blue-200 bg-blue-50/30" : "border-gray-200"}`}
    >
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400 mr-2" />
          )}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <span className="font-medium text-gray-900">
                {override.deliveryNoteNumber || group.deliveryNoteNumber}
              </span>
            </div>
            {override.customerReference && (
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                PO: {override.customerReference}
              </span>
            )}
            {group.files.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {group.files.length} pages
              </span>
            )}
            <span className="text-sm text-gray-500">
              {lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}
            </span>
            {hasParts && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full inline-flex items-center">
                <Package className="h-3 w-3 mr-1" />
                {partItems.length} part{partItems.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isValid ? (
            <span className="inline-flex items-center text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Needs customer
            </span>
          ) : willCreateNewCustomer ? (
            <span className="inline-flex items-center text-blue-600 text-sm">
              <UserPlus className="h-4 w-4 mr-1" />
              New customer
            </span>
          ) : isExisting ? (
            <span className="inline-flex items-center text-amber-600 text-sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Will overwrite
            </span>
          ) : (
            <span className="inline-flex items-center text-green-600 text-sm">
              <Check className="h-4 w-4 mr-1" />
              Ready
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {hasParts && (
            <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-start">
                <Package className="h-4 w-4 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-purple-800 font-medium">
                    Parts detected (not rubber rolls)
                  </p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    These items appear to be fabricated parts or components. Assign a stock category
                    below so they are tracked separately from rubber rolls.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={`grid ${hasParts ? "grid-cols-3" : "grid-cols-2"} gap-4 mb-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DN Number</label>
              <input
                type="text"
                value={override.deliveryNoteNumber || ""}
                onChange={(e) => onUpdateOverride("deliveryNoteNumber", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={override.customerId || ""}
                onChange={(e) =>
                  onUpdateOverride("customerId", e.target.value ? Number(e.target.value) : null)
                }
                className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 ${
                  !override.customerId && !group.customerName
                    ? "border-yellow-300"
                    : willCreateNewCustomer
                      ? "border-blue-300"
                      : "border-gray-300"
                }`}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {group.customerName && !override.customerId && (
                <p className="mt-1 text-xs text-blue-600">
                  Will create new customer: &quot;{group.customerName}&quot;
                </p>
              )}
            </div>
            {hasParts && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Category
                </label>
                <div className="flex space-x-2">
                  <select
                    value={override.stockCategory || ""}
                    onChange={(e) => onUpdateOverride("stockCategory", e.target.value)}
                    className="block w-full rounded-md border-purple-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                  >
                    <option value="">Select category</option>
                    {STOCK_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {override.stockCategory &&
                      !STOCK_CATEGORY_OPTIONS.includes(override.stockCategory) && (
                        <option value={override.stockCategory}>{override.stockCategory}</option>
                      )}
                  </select>
                </div>
                <div className="mt-1 flex items-center space-x-1">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Or type custom category..."
                    className="block w-full rounded border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs border px-1.5 py-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customCategory.trim()) {
                        onUpdateOverride("stockCategory", customCategory.trim());
                        setCustomCategory("");
                      }
                    }}
                  />
                  {customCategory.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateOverride("stockCategory", customCategory.trim());
                        setCustomCategory("");
                      }}
                      className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1 hover:bg-purple-100 whitespace-nowrap"
                    >
                      Set
                    </button>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO / Customer Reference
              </label>
              <input
                type="text"
                value={override.customerReference || ""}
                onChange={(e) => onUpdateOverride("customerReference", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="e.g., PL7776/PO6719"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
              <input
                type="date"
                value={override.deliveryDate || ""}
                onChange={(e) => onUpdateOverride("deliveryDate", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {hasParts && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-purple-700 inline-flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  Parts / Components
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddLineItem("PART");
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Part
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase">
                        Part Code
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase">
                        Description
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase">
                        Compound
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase">
                        Qty
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase">
                        Weight (kg)
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 uppercase w-8" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lineItems.map((item, itemIndex) => {
                      if (item.itemCategory !== "PART") return null;
                      return (
                        <tr key={itemIndex} className="hover:bg-purple-50/30">
                          <td className="px-2 py-1.5 w-36">
                            <input
                              type="text"
                              value={item.rollNumber || ""}
                              onChange={(e) =>
                                onUpdateLineItem(itemIndex, "rollNumber", e.target.value)
                              }
                              className={inputClass}
                              placeholder="e.g., CPL-4E-AUA60B"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) =>
                                onUpdateLineItem(itemIndex, "description", e.target.value)
                              }
                              className={inputClass}
                              placeholder="e.g., Cover Plate Liner 4E 60"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-28">
                            <input
                              type="text"
                              value={item.compoundType || ""}
                              onChange={(e) =>
                                onUpdateLineItem(itemIndex, "compoundType", e.target.value)
                              }
                              className={inputClass}
                              placeholder="AUA60B"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                onUpdateLineItem(
                                  itemIndex,
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
                              value={item.rollWeightKg || ""}
                              onChange={(e) =>
                                onUpdateLineItem(
                                  itemIndex,
                                  "rollWeightKg",
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveLineItem(itemIndex);
                              }}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(hasRolls || !hasParts) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {hasParts ? "Rubber Rolls" : "Line Items"}
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddLineItem("ROLL");
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                >
                  <Plus className="h-3 w-3 mr-1" />
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
                        Thick
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Width
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Length
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Weight (kg)
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lineItems.map((item, itemIndex) => {
                      if (item.itemCategory === "PART") return null;
                      return (
                        <tr key={itemIndex} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.rollNumber || ""}
                              onChange={(e) =>
                                onUpdateLineItem(itemIndex, "rollNumber", e.target.value)
                              }
                              className={inputClass}
                              placeholder="e.g., 187-41524"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.compoundType || ""}
                              onChange={(e) =>
                                onUpdateLineItem(itemIndex, "compoundType", e.target.value)
                              }
                              className={inputClass}
                              placeholder="SC38"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input
                              type="number"
                              value={item.thicknessMm || ""}
                              onChange={(e) =>
                                onUpdateLineItem(
                                  itemIndex,
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
                                onUpdateLineItem(
                                  itemIndex,
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
                                onUpdateLineItem(
                                  itemIndex,
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
                                onUpdateLineItem(
                                  itemIndex,
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
                              value={item.rollWeightKg || ""}
                              onChange={(e) =>
                                onUpdateLineItem(
                                  itemIndex,
                                  "rollWeightKg",
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveLineItem(itemIndex);
                              }}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Source Files</h4>
            <div className="flex flex-wrap gap-2">
              {group.files.map((f, fIndex) => (
                <button
                  type="button"
                  key={fIndex}
                  className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-teal-700 text-xs hover:bg-teal-50 hover:text-teal-900 transition-colors cursor-pointer"
                  onClick={() => {
                    const sourceFile = sourceFiles[f.fileIndex];
                    if (sourceFile) {
                      const url = URL.createObjectURL(sourceFile);
                      window.open(url, "_blank");
                    }
                  }}
                  title="Click to view uploaded document"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {f.filename}
                  {f.pageNumber && (
                    <span className="ml-1 text-gray-500">(Page {f.pageNumber})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
