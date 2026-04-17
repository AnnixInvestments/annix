"use client";

import { isArray, keys } from "es-toolkit/compat";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  CoatingAnalysis,
  QcBatchAssignment,
  QcDefelskoBatchRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface BatchField {
  fieldKey: string;
  category: string;
  label: string;
}

interface BatchAssignmentSectionProps {
  jobCardId: number;
  coatingAnalysis: CoatingAnalysis | null;
  lineItems: Array<{
    id: number;
    itemCode: string;
    description: string;
    quantity: number;
  }>;
  onAssignmentSaved: () => void;
}

interface AddFormState {
  fieldKey: string;
  batchNumber: string;
  selectedItemIds: Set<number>;
  notApplicable: boolean;
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
    const rawNotes = coatingAnalysis ? coatingAnalysis.rawNotes : null;
    const notesUpper = rawNotes ? rawNotes.toUpperCase() : "";
    const bandingIdx = notesUpper.indexOf("BANDING");
    const preBanding = bandingIdx >= 0 ? notesUpper.substring(0, bandingIdx) : notesUpper;
    const postBanding = bandingIdx >= 0 ? notesUpper.substring(bandingIdx) : "";

    coats.forEach((coat, idx) => {
      const rawProduct = coat.product;
      const productUpper = rawProduct ? rawProduct.toUpperCase() : "";
      const inBandingOnly =
        postBanding.length > 0 &&
        productUpper.length > 0 &&
        postBanding.includes(productUpper) &&
        !preBanding.includes(productUpper);
      if (inBandingOnly) return;
      const product = rawProduct || `Coat ${idx + 1}`;
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

export function BatchAssignmentSection(props: BatchAssignmentSectionProps) {
  const jobCardId = props.jobCardId;
  const coatingAnalysis = props.coatingAnalysis;
  const lineItems = props.lineItems;
  const onAssignmentSaved = props.onAssignmentSaved;

  const [assignments, setAssignments] = useState<QcBatchAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [defelskoBatches, setDefelskoBatches] = useState<QcDefelskoBatchRecord[]>([]);
  const [applyingAll, setApplyingAll] = useState(false);
  const [appliedAll, setAppliedAll] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pdfPreview = usePdfPreview();

  const fields = useMemo(() => buildMeasurementFields(coatingAnalysis), [coatingAnalysis]);

  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await stockControlApiClient.batchAssignmentsForJobCard(jobCardId);
      setAssignments(isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch assignments");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  const fetchDefelskoBatches = useCallback(async () => {
    try {
      const result = await stockControlApiClient.defelskoBatchesForJobCard(jobCardId);
      setDefelskoBatches(isArray(result) ? result : []);
    } catch {
      setDefelskoBatches([]);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchAssignments();
    fetchDefelskoBatches();
  }, [fetchAssignments, fetchDefelskoBatches]);

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

  const defelskoBatchMap = useMemo(() => {
    const map: Record<string, string> = {};
    defelskoBatches.forEach((db) => {
      const bn = db.batchNumber;
      if (bn && !db.notApplicable) {
        map[db.fieldKey] = bn;
      }
    });
    return map;
  }, [defelskoBatches]);

  const hasDefelskoBatches = keys(defelskoBatchMap).length > 0;

  const allFieldsAssigned = useMemo(() => {
    if (fields.length === 0) return false;
    return fields.every((f) => {
      const rawIds = assignedItemIdsByField[f.fieldKey];
      const assignedIds = rawIds || new Set<number>();
      return lineItems.every((li) => assignedIds.has(li.id));
    });
  }, [fields, assignedItemIdsByField, lineItems]);

  useEffect(() => {
    if (allFieldsAssigned && !isLoading) {
      setCollapsed(true);
    }
  }, [allFieldsAssigned, isLoading]);

  const handleApplyDefelskoBatches = async () => {
    setApplyingAll(true);
    setError(null);
    try {
      const promises = fields
        .filter((f) => defelskoBatchMap[f.fieldKey])
        .map((f) => {
          const batchNumber = defelskoBatchMap[f.fieldKey];
          const rawAssigned = assignedItemIdsByField[f.fieldKey];
          const assignedIds = rawAssigned || new Set<number>();
          const unassignedIds = lineItems
            .filter((li) => !assignedIds.has(li.id))
            .map((li) => li.id);
          if (unassignedIds.length === 0) return null;
          return stockControlApiClient.saveBatchAssignment(jobCardId, {
            fieldKey: f.fieldKey,
            category: f.category,
            label: f.label,
            batchNumber,
            lineItemIds: unassignedIds,
            notApplicable: false,
          });
        })
        .filter((p) => p !== null);
      await Promise.all(promises);
      await fetchAssignments();
      onAssignmentSaved();
      setAppliedAll(true);
      setCollapsed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply batch numbers");
    } finally {
      setApplyingAll(false);
    }
  };

  const handleOpenAddForm = (fieldKey: string) => {
    const rawAssignedForForm = assignedItemIdsByField[fieldKey];
    const assignedIds = rawAssignedForForm || new Set();
    setAddForm({
      fieldKey,
      batchNumber: "",
      selectedItemIds: new Set(
        lineItems.filter((li) => !assignedIds.has(li.id)).map((li) => li.id),
      ),
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

    try {
      setIsSaving(true);
      setError(null);
      await stockControlApiClient.saveBatchAssignment(jobCardId, {
        fieldKey: addForm.fieldKey,
        category: field.category,
        label: field.label,
        batchNumber: addForm.batchNumber.trim(),
        lineItemIds: Array.from(addForm.selectedItemIds),
        notApplicable: addForm.notApplicable,
      });
      setAddForm(null);
      await fetchAssignments();
      onAssignmentSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch assignment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (assignmentId: number) => {
    try {
      setDeletingId(assignmentId);
      setError(null);
      await stockControlApiClient.removeBatchAssignment(jobCardId, assignmentId);
      await fetchAssignments();
      onAssignmentSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove batch assignment");
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewPdf = async (uploadId: number) => {
    try {
      const result = await stockControlApiClient.positectorUploadDownloadUrl(uploadId);
      pdfPreview.open(result.url, "PosiTector Report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    }
  };

  const itemDescriptionMap = useMemo(() => {
    const map: Record<number, string> = {};
    lineItems.forEach((li) => {
      const itemCode = li.itemCode;
      const code = itemCode || "";
      const description = li.description;
      const desc = description || "";
      const label = code ? `${code} - ${desc}` : desc;
      map[li.id] = label || `Item #${li.id}`;
    });
    return map;
  }, [lineItems]);

  if (fields.length === 0) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-gray-600"
        >
          <svg
            className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Item-Level Batch Assignments
        </button>
        <div className="flex items-center gap-3">
          {hasDefelskoBatches && !allFieldsAssigned && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={appliedAll || applyingAll}
                onChange={handleApplyDefelskoBatches}
                disabled={applyingAll || appliedAll}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
              />
              <span className="text-[10px] text-gray-600">
                {applyingAll ? "Applying..." : "Apply Defelsko batches to all items"}
              </span>
            </label>
          )}
          {allFieldsAssigned && (
            <span className="text-[10px] text-green-600 font-medium">All assigned</span>
          )}
        </div>
      </div>

      {!collapsed && error && (
        <div className="mx-4 mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="px-4 py-3 space-y-4">
          {fields.map((field) => {
            const rawFieldGroups = assignmentsByField[field.fieldKey];
            const fieldGroups = rawFieldGroups || {};
            const batchKeys = keys(fieldGroups);
            const rawAssignedIds = assignedItemIdsByField[field.fieldKey];
            const assignedIds = rawAssignedIds || new Set<number>();
            const unassignedCount = lineItems.filter((li) => !assignedIds.has(li.id)).length;
            const isFormOpenForField = addForm !== null && addForm.fieldKey === field.fieldKey;

            return (
              <div key={field.fieldKey} className="rounded border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-800">{field.label}</h4>
                  <div className="flex items-center gap-2">
                    {unassignedCount > 0 && (
                      <span className="text-[10px] text-amber-600">
                        {unassignedCount} unassigned
                      </span>
                    )}
                    {unassignedCount === 0 && lineItems.length > 0 && (
                      <span className="text-[10px] text-green-600">All assigned</span>
                    )}
                    {!isFormOpenForField && unassignedCount > 0 && (
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
                      const uploadId = firstAssignment ? firstAssignment.positectorUploadId : null;
                      const isNA = firstAssignment ? firstAssignment.notApplicable : false;

                      return (
                        <div key={batchNum} className="rounded bg-white border border-gray-200 p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-800">
                                {isNA ? "N/A" : batchNum}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {groupAssignments.length} item
                                {groupAssignments.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {uploadId && (
                                <button
                                  onClick={() => handleViewPdf(uploadId)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800"
                                >
                                  View PDF
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(firstAssignment.id)}
                                disabled={deletingId === firstAssignment.id}
                                className="text-[10px] text-red-600 hover:text-red-800 disabled:text-gray-400"
                              >
                                {deletingId === firstAssignment.id ? "..." : "Remove"}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {groupAssignments.map((a) => {
                              const rawDesc = itemDescriptionMap[a.lineItemId];
                              const desc = rawDesc || `Item #${a.lineItemId}`;
                              return (
                                <span
                                  key={a.id}
                                  className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700"
                                >
                                  {desc}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {batchKeys.length === 0 && !isFormOpenForField && (
                  <p className="text-[10px] text-gray-400 italic">No batches assigned yet</p>
                )}

                {isFormOpenForField && addForm && (
                  <div className="rounded bg-white border border-teal-200 p-3 mt-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addForm.notApplicable}
                            onChange={(e) =>
                              setAddForm({
                                ...addForm,
                                notApplicable: e.target.checked,
                                batchNumber: e.target.checked ? "N/A" : "",
                              })
                            }
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                          />
                          <span className="text-xs text-gray-700">N/A</span>
                        </label>
                      </div>

                      {!addForm.notApplicable && (
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={addForm.batchNumber}
                            onChange={(e) =>
                              setAddForm({
                                ...addForm,
                                batchNumber: e.target.value,
                              })
                            }
                            placeholder="e.g. B241"
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">
                          Assign to Items
                        </label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {lineItems.map((li) => {
                            const isAssigned = assignedIds.has(li.id);
                            const isSelected = addForm.selectedItemIds.has(li.id);
                            const rawItemDesc = itemDescriptionMap[li.id];
                            const desc = rawItemDesc || `Item #${li.id}`;

                            if (isAssigned) return null;

                            return (
                              <label
                                key={li.id}
                                className="flex items-center gap-2 rounded p-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItem(li.id)}
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                />
                                <span className="text-xs text-gray-800">{desc}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">
                                  Qty: {li.quantity}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="rounded bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancelForm}
                          disabled={isSaving}
                          className="rounded bg-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
