"use client";

import { Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type { JobCard, JobCardAttachment } from "@/app/lib/api/stockControlApi";
import { useAddLineItem, useDeleteLineItem, useReExtractLineItems } from "@/app/lib/query/hooks";
import { isValidLineItem } from "../lib/helpers";

const RE_EXTRACT_FALLBACK_MS = 60000;

function workTypeFromNotes(notes: string | null | undefined): string {
  if (!notes) return "—";
  const upper = notes.toUpperCase();
  const lines = upper.split("\n").map((l) => l.trim());
  const hasRubber = lines.some((l) => /^INT\s*:/.test(l) && /R\/L|RUBBER|SHORE|LINING/.test(l));
  const hasPaint = lines.some((l) => /^EXT\s*:/.test(l) && /PAINT|BLAST|PRIMER|COAT/.test(l));
  if (hasRubber && hasPaint) return "Rubber & Paint";
  if (hasRubber) return "Rubber";
  if (hasPaint) return "Paint";
  return "—";
}

interface LineItemsTabProps {
  jobCard: JobCard;
  attachments: JobCardAttachment[];
  canManageLineItems: boolean;
  onRefresh: () => void;
  // Column visibility driven by the job's coating profile: a paint-only job shows only
  // Paint m², a lining-only job shows only Lining m², a job with both shows both.
  showLiningColumn?: boolean;
  showPaintColumn?: boolean;
}

interface AddLineFormData {
  itemCode: string;
  itemDescription: string;
  itemNo: string;
  quantity: string;
  jtNo: string;
  liningM2: string;
  m2: string;
}

const EMPTY_FORM: AddLineFormData = {
  itemCode: "",
  itemDescription: "",
  itemNo: "",
  quantity: "",
  jtNo: "",
  liningM2: "",
  m2: "",
};

export function LineItemsTab(props: LineItemsTabProps) {
  const {
    jobCard,
    attachments,
    canManageLineItems,
    onRefresh,
    showLiningColumn = true,
    showPaintColumn = true,
  } = props;
  const reExtract = useReExtractLineItems();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const deleteLineItem = useDeleteLineItem();
  const addLineItem = useAddLineItem();
  const [reExtractResult, setReExtractResult] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddLineFormData>(EMPTY_FORM);

  if (!jobCard.lineItems || jobCard.lineItems.length === 0) {
    if (!canManageLineItems) return null;

    return (
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--sc-primary-100,#d6d6e9)] text-[var(--sc-primary-active,#1c1c48)] hover:bg-[var(--sc-primary-200,#adadcf)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </button>
        </div>
        {showAddForm && renderAddForm()}
      </div>
    );
  }

  const handleReExtract = async () => {
    setReExtractResult(null);
    const stats = await metricsApi
      .extractionStats("job-card", "re-extract-with-drawings")
      .catch(() => null);
    const learnedMs = stats == null ? null : stats.averageMs;
    const estimatedDurationMs =
      learnedMs == null || learnedMs <= 0 ? RE_EXTRACT_FALLBACK_MS : learnedMs;
    showExtraction({
      brand: "stock-control",
      label: "Nix is re-extracting line items and drawing m²…",
      estimatedDurationMs,
      backgroundSafe: true,
    });
    reExtract.mutate(jobCard.id, {
      onSuccess: (result) => {
        setReExtractResult(
          `Re-extracted: ${result.replaced} items replaced with ${result.newCount} items`,
        );
        onRefresh();
      },
      onError: (err) => {
        setReExtractResult(`Error: ${extractErrorMessage(err, "Re-extraction failed")}`);
      },
      onSettled: () => {
        hideExtraction();
      },
    });
  };

  const handleDelete = (lineItemId: number) => {
    setDeletingId(lineItemId);
    deleteLineItem.mutate(
      { jobCardId: jobCard.id, lineItemId },
      {
        onSuccess: () => {
          setDeletingId(null);
          onRefresh();
        },
        onError: () => {
          setDeletingId(null);
        },
      },
    );
  };

  const handleAddLineItem = () => {
    const data: Record<string, string | number> = {};
    if (addForm.itemCode.trim()) data.itemCode = addForm.itemCode.trim();
    if (addForm.itemDescription.trim()) data.itemDescription = addForm.itemDescription.trim();
    if (addForm.itemNo.trim()) data.itemNo = addForm.itemNo.trim();
    if (addForm.quantity.trim()) data.quantity = Number(addForm.quantity);
    if (addForm.jtNo.trim()) data.jtNo = addForm.jtNo.trim();
    if (addForm.liningM2.trim()) data.liningM2 = Number(addForm.liningM2);
    if (addForm.m2.trim()) data.m2 = Number(addForm.m2);

    addLineItem.mutate(
      { jobCardId: jobCard.id, data },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setAddForm(EMPTY_FORM);
          onRefresh();
        },
      },
    );
  };

  function renderAddForm() {
    return (
      <div className="px-4 py-3 bg-[var(--sc-primary-50,#eeeef6)] border-b border-[var(--sc-primary-200,#adadcf)]">
        <div className="grid grid-cols-2 sm:grid-cols-8 gap-2 mb-2">
          <input
            type="text"
            value={addForm.itemCode}
            onChange={(e) => setAddForm({ ...addForm, itemCode: e.target.value })}
            placeholder="Item Code"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
          <input
            type="text"
            value={addForm.itemDescription}
            onChange={(e) => setAddForm({ ...addForm, itemDescription: e.target.value })}
            placeholder="Description"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)] sm:col-span-2"
          />
          <input
            type="text"
            value={addForm.itemNo}
            onChange={(e) => setAddForm({ ...addForm, itemNo: e.target.value })}
            placeholder="Item No"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
          <input
            type="text"
            value={addForm.quantity}
            onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
            placeholder="Qty"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
          <input
            type="text"
            value={addForm.jtNo}
            onChange={(e) => setAddForm({ ...addForm, jtNo: e.target.value })}
            placeholder="JT No (scan/paste)"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
          <input
            type="text"
            value={addForm.liningM2}
            onChange={(e) => setAddForm({ ...addForm, liningM2: e.target.value })}
            placeholder="Lining m²"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
          <input
            type="text"
            value={addForm.m2}
            onChange={(e) => setAddForm({ ...addForm, m2: e.target.value })}
            placeholder="Paint m²"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-[var(--sc-primary,#323288)] focus:border-[var(--sc-primary,#323288)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddLineItem}
            disabled={addLineItem.isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--sc-primary,#323288)] rounded hover:bg-[var(--sc-primary-hover,#252560)] disabled:opacity-50"
          >
            {addLineItem.isPending ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setAddForm(EMPTY_FORM);
            }}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
          <span className="text-sm text-gray-500">
            {jobCard.lineItems.filter(isValidLineItem).length} items
          </span>
          {jobCard.sourceFilePath && (
            <button
              type="button"
              onClick={handleReExtract}
              disabled={reExtract.isPending}
              className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
            >
              {reExtract.isPending ? "Re-extracting..." : "Re-extract"}
            </button>
          )}
          {reExtractResult && (
            <span
              className={`text-xs ${reExtractResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
            >
              {reExtractResult}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canManageLineItems && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--sc-primary-100,#d6d6e9)] text-[var(--sc-primary-active,#1c1c48)] hover:bg-[var(--sc-primary-200,#adadcf)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line
            </button>
          )}
          {attachments.some((a) => {
            const extData = a.extractedData as { totalExternalM2?: number };
            const rawTotalExternalM2 = extData ? extData.totalExternalM2 : null;
            return a.extractionStatus === "analysed" && (rawTotalExternalM2 || 0) > 0;
          }) && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-500">From drawings:</span>
              <span className="font-semibold text-[var(--sc-primary-hover,#252560)]">
                Ext:{" "}
                {attachments
                  .reduce((sum, a) => {
                    const extData = a.extractedData as { totalExternalM2?: number };
                    const rawExternalValue = extData ? extData.totalExternalM2 : null;
                    return sum + (rawExternalValue || 0);
                  }, 0)
                  .toFixed(2)}{" "}
                m²
              </span>
              <span className="font-semibold text-blue-700">
                Int:{" "}
                {attachments
                  .reduce((sum, a) => {
                    const intData = a.extractedData as { totalInternalM2?: number };
                    const rawInternalValue = intData ? intData.totalInternalM2 : null;
                    return sum + (rawInternalValue || 0);
                  }, 0)
                  .toFixed(2)}{" "}
                m²
              </span>
            </div>
          )}
        </div>
      </div>
      {showAddForm && renderAddForm()}
      {(() => {
        const validItems = jobCard.lineItems.filter(isValidLineItem);
        const missingM2 = validItems.filter((li) => {
          const rawCode = li.itemCode;
          const code = (rawCode || "").trim().toUpperCase();
          const isAreaItem = code === "PAINT" || /^R\d/.test(code) || /^R\/L/.test(code);
          const rawM2 = li.m2;
          const rawLiningM2 = li.liningM2;
          const hasM2 = (Number(rawM2) || 0) > 0 || (Number(rawLiningM2) || 0) > 0;
          return isAreaItem && !hasM2;
        });
        if (missingM2.length === 0) return null;
        return (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
            <span className="font-semibold">
              {missingM2.length} item{missingM2.length === 1 ? "" : "s"} missing m²
            </span>{" "}
            — coating and lining quantities for this job card will be understated until the m² is
            captured. Use Re-extract, or edit the item and enter the m² from the drawing or job card
            (you can also add e.g. &quot;@ 12.5m²&quot; to the Sage item description).
          </div>
        );
      })()}
      <div className="hidden md:block">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item No
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Qty
              </th>
              {showLiningColumn && (
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Lining m²
                </th>
              )}
              {showPaintColumn && (
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Paint m²
                </th>
              )}
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                JT No
              </th>
              {canManageLineItems && (
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10" />
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(() => {
              const validItems = jobCard.lineItems.filter(isValidLineItem);
              const rows: React.ReactNode[] = [];
              let itemCounter = 0;

              validItems.forEach((li, idx) => {
                const isLastInNoteGroup =
                  li.notes &&
                  (idx === validItems.length - 1 || validItems[idx + 1].notes !== li.notes);
                const itemNo = li.itemNo;
                const itemDescription = li.itemDescription;
                const quantity = li.quantity;
                const jtNo = li.jtNo;

                itemCounter++;
                rows.push(
                  <tr key={li.id} className="hover:bg-gray-50 group">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {itemCounter}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {workTypeFromNotes(li.notes)}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900 break-all">
                      {itemNo || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-words">
                      {itemDescription || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {quantity || "-"}
                    </td>
                    {showLiningColumn && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-[var(--sc-primary-hover,#252560)]">
                        {li.liningM2 ? Number(li.liningM2).toFixed(2) : "-"}
                      </td>
                    )}
                    {showPaintColumn && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {li.m2 ? Number(li.m2).toFixed(2) : "-"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {jtNo || "-"}
                    </td>
                    {canManageLineItems && (
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(li.id)}
                          disabled={deletingId === li.id}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity disabled:opacity-50"
                          title="Delete line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>,
                );

                if (isLastInNoteGroup && li.notes) {
                  rows.push(
                    <tr key={`note-${li.id}`} className="bg-amber-50">
                      <td className="px-3 py-1.5" />
                      <td
                        colSpan={
                          5 +
                          (showLiningColumn ? 1 : 0) +
                          (showPaintColumn ? 1 : 0) +
                          (canManageLineItems ? 1 : 0)
                        }
                        className="px-3 py-1.5 text-sm italic text-amber-800 whitespace-pre-wrap"
                      >
                        <span className="font-semibold not-italic text-amber-900 mr-1">
                          Source Notes:
                        </span>
                        {li.notes}
                      </td>
                    </tr>,
                  );
                }
              });

              return rows;
            })()}
          </tbody>
        </table>
      </div>
      <div className="md:hidden divide-y divide-gray-200">
        {(() => {
          const validItems = jobCard.lineItems.filter(isValidLineItem);
          const elements: React.ReactNode[] = [];
          let itemCounter = 0;

          validItems.forEach((li, idx) => {
            const isLastInNoteGroup =
              li.notes && (idx === validItems.length - 1 || validItems[idx + 1].notes !== li.notes);
            const itemCode = li.itemCode;

            itemCounter++;
            elements.push(
              <div key={li.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">#{itemCounter}</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {itemCode || "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    {li.quantity && (
                      <span className="font-semibold text-gray-900">Qty: {li.quantity}</span>
                    )}
                    {showLiningColumn && li.liningM2 ? (
                      <span className="text-[var(--sc-primary-hover,#252560)]">
                        Lining {Number(li.liningM2).toFixed(2)} m²
                      </span>
                    ) : null}
                    {showPaintColumn && li.m2 ? (
                      <span className="text-gray-600">Paint {Number(li.m2).toFixed(2)} m²</span>
                    ) : null}
                    {canManageLineItems && (
                      <button
                        type="button"
                        onClick={() => handleDelete(li.id)}
                        disabled={deletingId === li.id}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete line item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {li.itemDescription && (
                  <p className="text-sm text-gray-700 mb-1">{li.itemDescription}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {li.itemNo && <span>Item: {li.itemNo}</span>}
                  {li.jtNo && <span>JT: {li.jtNo}</span>}
                </div>
              </div>,
            );

            if (isLastInNoteGroup && li.notes) {
              elements.push(
                <div key={`note-${li.id}`} className="px-4 py-2 bg-amber-50">
                  <p className="text-sm italic text-amber-800 whitespace-pre-wrap">
                    <span className="font-semibold not-italic text-amber-900 mr-1">
                      Source Notes:
                    </span>
                    {li.notes}
                  </p>
                </div>,
              );
            }
          });

          return elements;
        })()}
      </div>
    </div>
  );
}
