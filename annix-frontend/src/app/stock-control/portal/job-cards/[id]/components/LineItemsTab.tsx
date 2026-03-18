"use client";

import { Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { JobCard, JobCardAttachment } from "@/app/lib/api/stockControlApi";
import { useAddLineItem, useDeleteLineItem, useReExtractLineItems } from "@/app/lib/query/hooks";
import { isValidLineItem } from "../lib/helpers";

interface LineItemsTabProps {
  jobCard: JobCard;
  attachments: JobCardAttachment[];
  canManageLineItems: boolean;
  onRefresh: () => void;
}

interface AddLineFormData {
  itemCode: string;
  itemDescription: string;
  itemNo: string;
  quantity: string;
  jtNo: string;
  m2: string;
}

const EMPTY_FORM: AddLineFormData = {
  itemCode: "",
  itemDescription: "",
  itemNo: "",
  quantity: "",
  jtNo: "",
  m2: "",
};

export function LineItemsTab(props: LineItemsTabProps) {
  const { jobCard, attachments, canManageLineItems, onRefresh } = props;
  const reExtract = useReExtractLineItems();
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-teal-100 text-teal-800 hover:bg-teal-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </button>
        </div>
        {showAddForm && renderAddForm()}
      </div>
    );
  }

  const handleReExtract = () => {
    setReExtractResult(null);
    reExtract.mutate(jobCard.id, {
      onSuccess: (result) => {
        setReExtractResult(
          `Re-extracted: ${result.replaced} items replaced with ${result.newCount} items`,
        );
        onRefresh();
      },
      onError: (err) => {
        setReExtractResult(`Error: ${err instanceof Error ? err.message : "Re-extraction failed"}`);
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
      <div className="px-4 py-3 bg-teal-50 border-b border-teal-200">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-2">
          <input
            type="text"
            value={addForm.itemCode}
            onChange={(e) => setAddForm({ ...addForm, itemCode: e.target.value })}
            placeholder="Item Code"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="text"
            value={addForm.itemDescription}
            onChange={(e) => setAddForm({ ...addForm, itemDescription: e.target.value })}
            placeholder="Description"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500 sm:col-span-2"
          />
          <input
            type="text"
            value={addForm.itemNo}
            onChange={(e) => setAddForm({ ...addForm, itemNo: e.target.value })}
            placeholder="Item No"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="text"
            value={addForm.quantity}
            onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
            placeholder="Qty"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
          />
          <input
            type="text"
            value={addForm.m2}
            onChange={(e) => setAddForm({ ...addForm, m2: e.target.value })}
            placeholder="m²"
            className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddLineItem}
            disabled={addLineItem.isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
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
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-teal-100 text-teal-800 hover:bg-teal-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line
            </button>
          )}
          {attachments.some(
            (a) =>
              a.extractionStatus === "analysed" &&
              ((a.extractedData as { totalExternalM2?: number })
                ? (a.extractedData as { totalExternalM2?: number }).totalExternalM2 || 0
                : 0) > 0,
          ) && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-500">From drawings:</span>
              <span className="font-semibold text-teal-700">
                Ext:{" "}
                {attachments
                  .reduce(
                    (sum, a) =>
                      sum +
                      ((a.extractedData as { totalExternalM2?: number })
                        ? (a.extractedData as { totalExternalM2?: number }).totalExternalM2 || 0
                        : 0),
                    0,
                  )
                  .toFixed(2)}{" "}
                m²
              </span>
              <span className="font-semibold text-blue-700">
                Int:{" "}
                {attachments
                  .reduce(
                    (sum, a) =>
                      sum +
                      ((a.extractedData as { totalInternalM2?: number })
                        ? (a.extractedData as { totalInternalM2?: number }).totalInternalM2 || 0
                        : 0),
                    0,
                  )
                  .toFixed(2)}{" "}
                m²
              </span>
            </div>
          )}
        </div>
      </div>
      {showAddForm && renderAddForm()}
      <div className="hidden md:block">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Code
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item No
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Qty
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                m²
              </th>
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

                itemCounter++;
                rows.push(
                  <tr key={li.id} className="hover:bg-gray-50 group">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {itemCounter}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900 break-all">
                      {li.itemCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-words">
                      {li.itemDescription || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-all">
                      {li.itemNo || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {li.quantity || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {li.m2 ? Number(li.m2).toFixed(2) : "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {li.jtNo || "-"}
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
                        colSpan={canManageLineItems ? 7 : 6}
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

            itemCounter++;
            elements.push(
              <div key={li.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">#{itemCounter}</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {li.itemCode || "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    {li.quantity && (
                      <span className="font-semibold text-gray-900">Qty: {li.quantity}</span>
                    )}
                    {li.m2 && <span className="text-gray-600">{Number(li.m2).toFixed(2)} m²</span>}
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
