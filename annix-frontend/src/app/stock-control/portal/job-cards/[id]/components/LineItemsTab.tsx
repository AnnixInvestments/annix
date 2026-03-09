"use client";

import type React from "react";
import type { JobCard, JobCardAttachment } from "@/app/lib/api/stockControlApi";
import { isValidLineItem } from "../lib/helpers";

interface LineItemsTabProps {
  jobCard: JobCard;
  attachments: JobCardAttachment[];
}

export function LineItemsTab({ jobCard, attachments }: LineItemsTabProps) {
  if (!jobCard.lineItems || jobCard.lineItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
          <span className="text-sm text-gray-500">
            {jobCard.lineItems.filter(isValidLineItem).length} items
          </span>
        </div>
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
                  <tr key={li.id} className="hover:bg-gray-50">
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
                  </tr>,
                );

                if (isLastInNoteGroup && li.notes) {
                  rows.push(
                    <tr key={`note-${li.id}`} className="bg-amber-50">
                      <td className="px-3 py-1.5" />
                      <td
                        colSpan={6}
                        className="px-3 py-1.5 text-sm italic text-amber-800 whitespace-pre-wrap"
                      >
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
                  <p className="text-sm italic text-amber-800 whitespace-pre-wrap">{li.notes}</p>
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
