"use client";

import type { ReactNode } from "react";
import { WeldSummaryCard } from "../shared";

interface WeldBreakdownLine {
  label: string;
  count: number;
  lengthMm: number;
  lengthM: number;
}

interface WeldSummarySectionProps {
  totalWelds: number;
  totalTackWeldEnds: number;
  breakdownLines: WeldBreakdownLine[];
  totalLinearM: number;
  totalVolumeCm3?: number;
  weldLegSizeMm?: number;
  quantity: number;
  children?: ReactNode;
}

export function WeldSummarySection(props: WeldSummarySectionProps) {
  const {
    totalWelds,
    totalTackWeldEnds,
    breakdownLines,
    totalLinearM,
    totalVolumeCm3,
    weldLegSizeMm,
    quantity,
    children,
  } = props;

  if (totalWelds === 0 && totalTackWeldEnds === 0) return null;

  return (
    <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded text-center border border-purple-200 dark:border-purple-700">
      <p className="text-xs text-purple-800 dark:text-purple-300 font-medium">Welds</p>
      <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalWelds}</p>
      <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
        {breakdownLines
          .filter((line) => line.count > 0)
          .map((line) => (
            <p key={line.label}>
              {line.count} {line.label} = {line.lengthM.toFixed(2)} l/m
            </p>
          ))}
        {totalTackWeldEnds > 0 && <p>{totalTackWeldEnds} tack weld ends × 8 × 20mm</p>}
        <p className="font-semibold mt-1">
          Total: {totalLinearM.toFixed(2)} l/m
          {quantity > 1 && ` × ${quantity} = ${(totalLinearM * quantity).toFixed(2)} l/m`}
        </p>
      </div>
      {totalVolumeCm3 !== undefined && (
        <WeldSummaryCard totalVolumeCm3={totalVolumeCm3}>
          {weldLegSizeMm !== undefined && <p>Leg size: {weldLegSizeMm.toFixed(1)}mm</p>}
        </WeldSummaryCard>
      )}
      {children}
    </div>
  );
}
