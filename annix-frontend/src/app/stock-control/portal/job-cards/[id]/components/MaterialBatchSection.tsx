"use client";

import { useMemo } from "react";
import type { IssuanceBatchRecord } from "@/app/lib/api/stockControlApi";

const PAINT_PATTERN =
  /paint|primer|coat|epoxy|polyurethane|topcoat|finish|hardtop|penguard|barrier/i;
const RUBBER_PATTERN = /rubber|lining|liner|ebonite|neoprene|butyl|natural|shore/i;
const SOLUTION_PATTERN = /solution|adhesive|cement|chemosil|chemlok|glue|bonding/i;

interface MaterialBatchSectionProps {
  batchRecords: IssuanceBatchRecord[];
  hasRubber: boolean;
  hasPaint: boolean;
}

interface GroupedProduct {
  productName: string;
  parts: {
    role: string | null;
    batchNumber: string;
    rollNumber: string | null;
    quantity: number;
  }[];
}

function groupByProduct(records: IssuanceBatchRecord[]): GroupedProduct[] {
  const grouped = records.reduce<Record<string, GroupedProduct>>((acc, rec) => {
    const item = rec.stockItem;
    const groupKey = item?.componentGroup || item?.name || "Unknown";
    const existing = acc[groupKey] || { productName: groupKey, parts: [] };
    return {
      ...acc,
      [groupKey]: {
        ...existing,
        parts: [
          ...existing.parts,
          {
            role: item?.componentRole || null,
            batchNumber: rec.batchNumber,
            rollNumber: item?.rollNumber || null,
            quantity: rec.quantity,
          },
        ],
      },
    };
  }, {});
  return Object.values(grouped);
}

function deduplicateParts(parts: GroupedProduct["parts"]): GroupedProduct["parts"] {
  return parts.reduce<GroupedProduct["parts"]>((acc, part) => {
    const exists = acc.some((p) => p.batchNumber === part.batchNumber && p.role === part.role);
    return exists ? acc : [...acc, part];
  }, []);
}

export function MaterialBatchSection(props: MaterialBatchSectionProps) {
  const { batchRecords, hasRubber, hasPaint } = props;

  const rubberRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const name = r.stockItem?.name || "";
        return RUBBER_PATTERN.test(name) || SOLUTION_PATTERN.test(name);
      }),
    [batchRecords],
  );

  const paintRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const name = r.stockItem?.name || "";
        return (
          PAINT_PATTERN.test(name) && !RUBBER_PATTERN.test(name) && !SOLUTION_PATTERN.test(name)
        );
      }),
    [batchRecords],
  );

  const rubberProducts = useMemo(() => groupByProduct(rubberRecords), [rubberRecords]);
  const paintProducts = useMemo(() => groupByProduct(paintRecords), [paintRecords]);

  const showRubber = hasRubber;
  const showPaint = hasPaint;

  if (!showRubber && !showPaint) {
    return null;
  }

  if (rubberRecords.length === 0 && paintRecords.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Issued Material Batch Numbers</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Batch and roll numbers from stock issued to this job card
        </p>
      </div>

      <div className="px-5 py-4">
        <div className={showRubber && showPaint ? "grid grid-cols-2 gap-8" : ""}>
          {showRubber && rubberRecords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Rubber
              </h4>
              <div className="space-y-3">
                {rubberProducts.map((product) => (
                  <div key={product.productName} className="text-sm">
                    <div className="font-medium text-gray-900">{product.productName}</div>
                    <div className="mt-1 space-y-0.5">
                      {deduplicateParts(product.parts).map((part, idx) => (
                        <div
                          key={`${part.batchNumber}-${idx}`}
                          className="flex items-center gap-2 text-gray-600 text-xs"
                        >
                          {part.rollNumber && (
                            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-medium">
                              Roll: {part.rollNumber}
                            </span>
                          )}
                          <span>Batch: {part.batchNumber}</span>
                          {part.role && <span className="text-gray-400">({part.role})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPaint && paintRecords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Paint
              </h4>
              <div className="space-y-3">
                {paintProducts.map((product) => (
                  <div key={product.productName} className="text-sm">
                    <div className="font-medium text-gray-900">{product.productName}</div>
                    <div className="mt-1 space-y-0.5">
                      {deduplicateParts(product.parts).map((part, idx) => (
                        <div
                          key={`${part.batchNumber}-${idx}`}
                          className="flex items-center gap-2 text-gray-600 text-xs"
                        >
                          <span>Batch: {part.batchNumber}</span>
                          {part.role && <span className="text-gray-400">({part.role})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {((showRubber && rubberRecords.length === 0) ||
          (showPaint && paintRecords.length === 0)) && (
          <div className="mt-2 text-xs text-gray-400">
            {showRubber && rubberRecords.length === 0 && showPaint && paintRecords.length === 0
              ? "No material batch records from stock issuances yet."
              : showRubber && rubberRecords.length === 0
                ? "No rubber batch records from stock issuances yet."
                : "No paint batch records from stock issuances yet."}
          </div>
        )}
      </div>
    </div>
  );
}
