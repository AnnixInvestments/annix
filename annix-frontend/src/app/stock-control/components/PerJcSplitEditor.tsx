"use client";

import { RotateCcw } from "lucide-react";
import type { CpoBatchChildJobCard } from "@/app/lib/api/stockControlApi";

export interface SplitLine {
  jobCardId: number;
  quantity: number;
}

interface PerJcSplitEditorProps {
  totalQuantity: number;
  jobCards: CpoBatchChildJobCard[];
  splits: SplitLine[];
  onChange: (splits: SplitLine[]) => void;
}

export function PerJcSplitEditor(props: PerJcSplitEditorProps) {
  const { totalQuantity, jobCards, splits, onChange } = props;

  const splitMap = new Map(splits.map((s) => [s.jobCardId, s.quantity]));
  const splitSum = splits.reduce((sum, s) => sum + s.quantity, 0);
  const remainder = Math.round((totalQuantity - splitSum) * 100) / 100;
  const isBalanced = Math.abs(remainder) < 0.01;

  const updateSplit = (jobCardId: number, quantity: number) => {
    const clamped = Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
    const next = jobCards.map((jc) => {
      const existing = splitMap.get(jc.id);
      const fallback = existing === undefined ? 0 : existing;
      return {
        jobCardId: jc.id,
        quantity: jc.id === jobCardId ? clamped : fallback,
      };
    });
    onChange(next);
  };

  const applyProRataByM2 = () => {
    const totalM2 = jobCards.reduce((sum, jc) => sum + jc.extM2 + jc.intM2, 0);
    if (totalM2 <= 0) {
      const evenShare = Math.round((totalQuantity / jobCards.length) * 100) / 100;
      const next = jobCards.map((jc, idx) => ({
        jobCardId: jc.id,
        quantity:
          idx === jobCards.length - 1
            ? Math.round((totalQuantity - evenShare * (jobCards.length - 1)) * 100) / 100
            : evenShare,
      }));
      onChange(next);
      return;
    }

    const raw = jobCards.map((jc) => ({
      jobCardId: jc.id,
      rawShare: ((jc.extM2 + jc.intM2) / totalM2) * totalQuantity,
    }));
    const rounded = raw.map((r) => ({
      jobCardId: r.jobCardId,
      quantity: Math.round(r.rawShare * 100) / 100,
    }));
    const roundedSum = rounded.reduce((sum, r) => sum + r.quantity, 0);
    const drift = Math.round((totalQuantity - roundedSum) * 100) / 100;
    if (Math.abs(drift) > 0.01 && rounded.length > 0) {
      rounded[rounded.length - 1].quantity =
        Math.round((rounded[rounded.length - 1].quantity + drift) * 100) / 100;
    }
    onChange(rounded);
  };

  return (
    <div className="border rounded-lg bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          Split <strong>{totalQuantity}</strong> across {jobCards.length} JCs
        </span>
        <button
          type="button"
          onClick={applyProRataByM2}
          className="flex items-center gap-1 text-blue-600 hover:underline"
          title="Auto-distribute by m²"
        >
          <RotateCcw className="h-3 w-3" />
          Pro-rata by m²
        </button>
      </div>

      <div className="space-y-1">
        {jobCards.map((jc) => {
          const existing = splitMap.get(jc.id);
          const value = existing === undefined ? 0 : existing;
          const label = jc.jcNumber || jc.jobNumber;
          return (
            <div
              key={jc.id}
              className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border"
            >
              <span className="flex-1 truncate">
                {label}
                <span className="text-gray-500 ml-1">({(jc.extM2 + jc.intM2).toFixed(1)}m²)</span>
              </span>
              <input
                type="number"
                value={value}
                onChange={(e) => updateSplit(jc.id, Number(e.target.value))}
                step="0.01"
                min="0"
                className="w-20 px-2 py-1 border rounded text-right font-mono text-xs"
              />
            </div>
          );
        })}
      </div>

      <div
        className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
          isBalanced
            ? "bg-green-100 text-green-800"
            : remainder > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        <span>
          Sum: <strong className="font-mono">{splitSum.toFixed(2)}</strong>
        </span>
        <span>
          {isBalanced
            ? "Balanced"
            : remainder > 0
              ? `${remainder.toFixed(2)} unallocated`
              : `Over by ${Math.abs(remainder).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
