"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  CpoChildJcLineItems,
  QcBatchAssignment,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface CpoBatchAssignmentSectionProps {
  cpoId: number;
}

interface GroupedBatch {
  jobCardId: number;
  fieldKey: string;
  label: string;
  batchNumber: string;
  itemCount: number;
  notApplicable: boolean;
}

interface BatchField {
  fieldKey: string;
  category: string;
  label: string;
}

interface CpoLineItem {
  id: number;
  jobCardId: number;
  jcNumber: string;
  itemNo: string | null;
  itemCode: string;
  description: string;
  quantity: number;
}

interface AddFormState {
  fieldKey: string;
  batchNumber: string;
  selectedItemIds: Set<number>;
  quantityOverrides: Record<number, number>;
  notApplicable: boolean;
}

const FIELD_KEY_ORDER: Record<string, number> = {
  paint_blast_profile: 1,
  paint_dft_primer: 2,
  paint_dft_intermediate: 3,
  paint_dft_final: 4,
  rubber_blast_profile: 5,
  rubber_shore_hardness: 6,
};

function fieldKeySort(a: string, b: string): number {
  const orderA = FIELD_KEY_ORDER[a] || 99;
  const orderB = FIELD_KEY_ORDER[b] || 99;
  return orderA - orderB;
}

function buildMeasurementFields(coatingAnalysis: CoatingAnalysis | null): BatchField[] {
  const fields: BatchField[] = [];
  const rawCoats = coatingAnalysis ? coatingAnalysis.coats : null;
  const coats = rawCoats || [];
  const hasExternalCoats = coats.length > 0;
  const hasLining = coatingAnalysis ? coatingAnalysis.hasInternalLining : false;

  if (hasExternalCoats) {
    fields.push({
      fieldKey: "paint_blast_profile",
      category: "paint",
      label: "Blast Profile (Paint)",
    });
    coats.forEach((coat, idx) => {
      const rawProduct = coat.product;
      const product = rawProduct || `Coat ${idx + 1}`;
      const isBanding = product.toUpperCase().includes("BANDING");
      if (isBanding) return;
      fields.push({
        fieldKey: `paint_dft_${idx}`,
        category: "paint",
        label: `DFT - ${product}`,
      });
    });
  }

  if (hasLining) {
    fields.push({
      fieldKey: "rubber_blast_profile",
      category: "rubber",
      label: "Blast Profile (Rubber)",
    });
    fields.push({
      fieldKey: "rubber_shore_hardness",
      category: "rubber",
      label: "Shore Hardness",
    });
  }

  return fields;
}

function mergeFieldsFromChildJcs(childJcs: CpoChildJcLineItems[]): BatchField[] {
  const seen = new Set<string>();
  const result: BatchField[] = [];

  childJcs.forEach((jc) => {
    const coating = jc.coatingAnalysis;
    const fields = buildMeasurementFields(coating);
    fields.forEach((f) => {
      if (!seen.has(f.fieldKey)) {
        seen.add(f.fieldKey);
        result.push(f);
      }
    });
  });

  return result;
}

export function CpoBatchAssignmentSection(props: CpoBatchAssignmentSectionProps) {
  const cpoId = props.cpoId;

  const [assignments, setAssignments] = useState<QcBatchAssignment[]>([]);
  const [childJcs, setChildJcs] = useState<CpoChildJcLineItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [assignmentsData, childJcData] = await Promise.all([
        stockControlApiClient.batchAssignmentsForCpo(cpoId),
        stockControlApiClient.childJcLineItemsForCpo(cpoId),
      ]);
      setAssignments(assignmentsData);
      setChildJcs(childJcData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load batch assignments";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [cpoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fields = useMemo(() => mergeFieldsFromChildJcs(childJcs), [childJcs]);

  const allLineItems = useMemo<CpoLineItem[]>(() => {
    return childJcs.flatMap((jc) => {
      const jcNumber = jc.jcNumber;
      return jc.lineItems.map((li) => ({
        id: li.id,
        jobCardId: li.jobCardId,
        jcNumber,
        itemNo: li.itemNo || null,
        itemCode: li.itemCode,
        description: li.description,
        quantity: li.quantity,
      }));
    });
  }, [childJcs]);

  const assignedItemIdsByField = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    assignments.forEach((a) => {
      const fk = a.fieldKey;
      if (!map[fk]) {
        map[fk] = new Set();
      }
      map[fk].add(a.lineItemId);
    });
    return map;
  }, [assignments]);

  const assignmentsByField = useMemo(() => {
    const grouped: Record<string, Record<string, QcBatchAssignment[]>> = {};
    assignments.forEach((a) => {
      const fk = a.fieldKey;
      const bn = a.batchNumber;
      if (!grouped[fk]) {
        grouped[fk] = {};
      }
      if (!grouped[fk][bn]) {
        grouped[fk][bn] = [];
      }
      grouped[fk][bn].push(a);
    });
    return grouped;
  }, [assignments]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedBatch>();

    assignments.forEach((a) => {
      const key = `${a.jobCardId}-${a.fieldKey}-${a.batchNumber}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, itemCount: existing.itemCount + 1 });
      } else {
        map.set(key, {
          jobCardId: a.jobCardId,
          fieldKey: a.fieldKey,
          label: a.label,
          batchNumber: a.batchNumber,
          itemCount: 1,
          notApplicable: a.notApplicable,
        });
      }
    });

    const result = [...map.values()];
    result.sort((a, b) => {
      if (a.jobCardId !== b.jobCardId) return a.jobCardId - b.jobCardId;
      const fieldSort = fieldKeySort(a.fieldKey, b.fieldKey);
      if (fieldSort !== 0) return fieldSort;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

    return result;
  }, [assignments]);

  const jobCardIds = useMemo(() => {
    const ids = [...new Set(grouped.map((g) => g.jobCardId))];
    ids.sort((a, b) => a - b);
    return ids;
  }, [grouped]);

  const handleOpenAddForm = (fieldKey: string) => {
    const assignedIds = assignedItemIdsByField[fieldKey] || new Set();
    const unassigned = allLineItems.filter((li) => !assignedIds.has(li.id));
    setAddForm({
      fieldKey,
      batchNumber: "",
      selectedItemIds: new Set(),
      quantityOverrides: {},
      notApplicable: false,
    });
  };

  const handleCancelForm = () => {
    setAddForm(null);
  };

  const handleToggleItem = (itemId: number) => {
    if (!addForm) return;
    const next = new Set(addForm.selectedItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setAddForm({ ...addForm, selectedItemIds: next });
  };

  const handleSave = async () => {
    if (!addForm) return;
    if (!addForm.notApplicable && !addForm.batchNumber.trim()) {
      setError("Please enter a batch number");
      return;
    }
    if (addForm.selectedItemIds.size === 0) {
      setError("Please select at least one item");
      return;
    }

    const field = fields.find((f) => f.fieldKey === addForm.fieldKey);
    if (!field) return;

    const selectedItems = allLineItems.filter((li) => addForm.selectedItemIds.has(li.id));
    const itemsByJc = new Map<number, number[]>();
    selectedItems.forEach((li) => {
      const existing = itemsByJc.get(li.jobCardId) || [];
      itemsByJc.set(li.jobCardId, [...existing, li.id]);
    });

    try {
      setIsSaving(true);
      setError(null);

      const savePromises = [...itemsByJc.entries()].map(([jobCardId, lineItemIds]) =>
        stockControlApiClient.saveBatchAssignment(jobCardId, {
          fieldKey: addForm.fieldKey,
          category: field.category,
          label: field.label,
          batchNumber: addForm.batchNumber.trim(),
          lineItemIds,
          notApplicable: addForm.notApplicable,
        }),
      );

      await Promise.all(savePromises);
      setAddForm(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch assignment");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <div className="flex items-center justify-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error && fields.length === 0 && grouped.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (fields.length === 0 && grouped.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
        <p className="text-sm text-gray-500">
          No measurement types detected. Coating analysis may not be complete for child job cards.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field) => {
          const rawFieldGroups = assignmentsByField[field.fieldKey];
          const fieldGroups = rawFieldGroups || {};
          const batchKeys = Object.keys(fieldGroups);
          const rawAssignedIds = assignedItemIdsByField[field.fieldKey];
          const assignedIds = rawAssignedIds || new Set<number>();
          const unassignedItems = allLineItems.filter((li) => !assignedIds.has(li.id));
          const isFormOpenForField = addForm !== null && addForm.fieldKey === field.fieldKey;

          return (
            <div key={field.fieldKey} className="rounded border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-800">{field.label}</h4>
                <div className="flex items-center gap-2">
                  {unassignedItems.length > 0 && (
                    <span className="text-[10px] text-amber-600">
                      {unassignedItems.length} unassigned
                    </span>
                  )}
                  {unassignedItems.length === 0 && allLineItems.length > 0 && (
                    <span className="text-[10px] text-green-600">All assigned</span>
                  )}
                  {!isFormOpenForField && unassignedItems.length > 0 && (
                    <button
                      onClick={() => handleOpenAddForm(field.fieldKey)}
                      disabled={addForm !== null}
                      className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      + Add Batch
                    </button>
                  )}
                </div>
              </div>

              {batchKeys.length > 0 && (
                <div className="space-y-2 mb-2">
                  {batchKeys.map((batchNum) => {
                    const groupAssignments = fieldGroups[batchNum];
                    const firstAssignment = groupAssignments[0];
                    const isNA = firstAssignment ? firstAssignment.notApplicable : false;

                    const jcGroups = new Map<number, QcBatchAssignment[]>();
                    groupAssignments.forEach((a) => {
                      const existing = jcGroups.get(a.jobCardId) || [];
                      jcGroups.set(a.jobCardId, [...existing, a]);
                    });

                    return (
                      <div key={batchNum} className="rounded bg-white border border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-800">
                              {isNA ? "N/A" : batchNum}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {groupAssignments.length} item
                              {groupAssignments.length !== 1 ? "s" : ""} across {jcGroups.size} JC
                              {jcGroups.size !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        {[...jcGroups.entries()].map(([jcId, jcAssignments]) => (
                          <div key={jcId} className="mt-1">
                            <span className="text-[10px] font-medium text-gray-500">
                              JC-{jcId}:
                            </span>
                            <span className="text-[10px] text-gray-600 ml-1">
                              {jcAssignments.length} item
                              {jcAssignments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {batchKeys.length === 0 && !isFormOpenForField && (
                <p className="text-[10px] text-gray-400 italic">No batches assigned yet</p>
              )}

              {isFormOpenForField && addForm && (
                <CpoAddBatchForm
                  addForm={addForm}
                  allLineItems={allLineItems}
                  assignedIds={assignedIds}
                  childJcs={childJcs}
                  isSaving={isSaving}
                  onToggleItem={handleToggleItem}
                  onBatchNumberChange={(val) => setAddForm({ ...addForm, batchNumber: val })}
                  onQuantityChange={(itemId, val) => {
                    const num = parseFloat(val);
                    setAddForm({
                      ...addForm,
                      quantityOverrides: {
                        ...addForm.quantityOverrides,
                        [itemId]: Number.isNaN(num) ? 0 : num,
                      },
                    });
                  }}
                  onNotApplicableChange={(checked) =>
                    setAddForm({
                      ...addForm,
                      notApplicable: checked,
                      batchNumber: checked ? "N/A" : "",
                    })
                  }
                  onSave={handleSave}
                  onCancel={handleCancelForm}
                />
              )}
            </div>
          );
        })}
      </div>

      {grouped.length > 0 && fields.length === 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-600">JC</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Measurement Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Batch #</th>
                <th className="px-4 py-2 text-center font-medium text-gray-600">Items</th>
                <th className="px-4 py-2 text-center font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobCardIds.map((jcId) => {
                const jcRows = grouped.filter((g) => g.jobCardId === jcId);
                return jcRows.map((row, idx) => {
                  const rowKey = `${row.jobCardId}-${row.fieldKey}-${row.batchNumber}`;
                  const naClass = row.notApplicable ? "text-gray-400 italic" : "";
                  const statusLabel = row.notApplicable ? "N/A" : "Assigned";
                  const statusColor = row.notApplicable
                    ? "bg-gray-100 text-gray-500"
                    : "bg-green-100 text-green-700";
                  return (
                    <tr key={rowKey} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{idx === 0 ? `JC-${jcId}` : ""}</td>
                      <td className={`px-4 py-2 ${naClass}`}>{row.label}</td>
                      <td className={`px-4 py-2 font-mono ${naClass}`}>{row.batchNumber}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{row.itemCount}</td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CpoAddBatchFormProps {
  addForm: AddFormState;
  allLineItems: CpoLineItem[];
  assignedIds: Set<number>;
  childJcs: CpoChildJcLineItems[];
  isSaving: boolean;
  onToggleItem: (itemId: number) => void;
  onBatchNumberChange: (value: string) => void;
  onQuantityChange: (itemId: number, value: string) => void;
  onNotApplicableChange: (checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

function CpoAddBatchForm(props: CpoAddBatchFormProps) {
  const addForm = props.addForm;
  const allLineItems = props.allLineItems;
  const assignedIds = props.assignedIds;
  const childJcs = props.childJcs;
  const isSaving = props.isSaving;

  const unassignedByJc = useMemo(() => {
    const map = new Map<number, CpoLineItem[]>();
    allLineItems.forEach((li) => {
      if (assignedIds.has(li.id)) return;
      const existing = map.get(li.jobCardId) || [];
      map.set(li.jobCardId, [...existing, li]);
    });
    return map;
  }, [allLineItems, assignedIds]);

  return (
    <div className="rounded bg-white border border-teal-200 p-3 mt-2">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.notApplicable}
              onChange={(e) => props.onNotApplicableChange(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
            />
            <span className="text-xs text-gray-700">N/A</span>
          </label>
        </div>

        {!addForm.notApplicable && (
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Batch Number</label>
            <input
              type="text"
              value={addForm.batchNumber}
              onChange={(e) => props.onBatchNumberChange(e.target.value)}
              placeholder="e.g. B241"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">
            Assign to Items (grouped by JC)
          </label>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {childJcs.map((jc) => {
              const jcItems = unassignedByJc.get(jc.jobCardId) || [];
              if (jcItems.length === 0) return null;

              const jcLabel = jc.jtDnNumber ? `${jc.jcNumber} (${jc.jtDnNumber})` : jc.jcNumber;

              return (
                <div key={jc.jobCardId}>
                  <div className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                    {jcLabel}
                  </div>
                  <div className="space-y-1 pl-2">
                    {jcItems.map((li) => {
                      const isSelected = addForm.selectedItemIds.has(li.id);
                      const code = li.itemCode || "";
                      const desc = li.description || "";
                      const itemLabel = code ? `${code} - ${desc}` : desc || `Item #${li.id}`;

                      return (
                        <label
                          key={li.id}
                          className="flex items-center gap-2 rounded p-1.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => props.onToggleItem(li.id)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                          />
                          {li.itemNo && (
                            <span className="text-[10px] font-mono text-gray-500 shrink-0">
                              {li.itemNo}
                            </span>
                          )}
                          <span className="text-xs text-gray-800 truncate">{itemLabel}</span>
                          <input
                            type="number"
                            value={props.addForm.quantityOverrides[li.id] ?? li.quantity}
                            min={0}
                            step="any"
                            onChange={(e) => props.onQuantityChange(li.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto w-16 text-right text-[10px] rounded border border-gray-300 px-1 py-0.5"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={props.onSave}
            disabled={isSaving}
            className="rounded bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={props.onCancel}
            disabled={isSaving}
            className="rounded bg-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
