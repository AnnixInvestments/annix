"use client";

import { useEffect, useMemo, useRef } from "react";

export interface ProRataJobCard {
  id: number;
  jcNumber: string | null;
  jobNumber: string;
  totalAreaM2: number;
}

export interface ProRataSplit {
  jobCardId: number;
  litres: number;
}

interface PaintProRataSplitEditorProps {
  totalLitres: number;
  jobCards: ProRataJobCard[];
  splits: ProRataSplit[];
  onChange: (splits: ProRataSplit[]) => void;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeProRataByM2(
  totalLitres: number,
  jobCards: ProRataJobCard[],
): ProRataSplit[] {
  if (jobCards.length === 0) {
    return [];
  }
  const totalArea = jobCards.reduce((sum, jc) => sum + jc.totalAreaM2, 0);
  if (totalArea <= 0) {
    const evenShare = round2(totalLitres / jobCards.length);
    return jobCards.map((jc, index) => {
      const isLast = index === jobCards.length - 1;
      const litres = isLast ? round2(totalLitres - evenShare * (jobCards.length - 1)) : evenShare;
      return { jobCardId: jc.id, litres };
    });
  }
  const rawShares = jobCards.map((jc) => ({
    jobCardId: jc.id,
    litres: round2((jc.totalAreaM2 / totalArea) * totalLitres),
  }));
  const roundedSum = rawShares.reduce((sum, r) => sum + r.litres, 0);
  const drift = round2(totalLitres - roundedSum);
  if (Math.abs(drift) > 0.01 && rawShares.length > 0) {
    const lastIdx = rawShares.length - 1;
    rawShares[lastIdx] = {
      jobCardId: rawShares[lastIdx].jobCardId,
      litres: round2(rawShares[lastIdx].litres + drift),
    };
  }
  return rawShares;
}

export function PaintProRataSplitEditor(props: PaintProRataSplitEditorProps) {
  const totalLitres = props.totalLitres;
  const jobCards = props.jobCards;
  const splits = props.splits;
  const onChangeProp = props.onChange;

  const splitMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const split of splits) {
      map.set(split.jobCardId, split.litres);
    }
    return map;
  }, [splits]);

  const splitSum = useMemo(() => {
    return round2(splits.reduce((sum, s) => sum + s.litres, 0));
  }, [splits]);

  const remainder = round2(totalLitres - splitSum);
  const isBalanced = Math.abs(remainder) < 0.01;

  const autoApplied = useRef(false);
  useEffect(() => {
    if (autoApplied.current) return;
    if (jobCards.length === 0) return;
    if (splits.length > 0) return;
    autoApplied.current = true;
    const next = computeProRataByM2(totalLitres, jobCards);
    onChangeProp(next);
  }, [jobCards, splits, totalLitres, onChangeProp]);

  const updateSplit = (jobCardId: number, raw: number) => {
    const safeRaw = Number.isFinite(raw) && raw >= 0 ? raw : 0;
    const next = jobCards.map((jc) => {
      const existing = splitMap.get(jc.id);
      const fallback = existing == null ? 0 : existing;
      return {
        jobCardId: jc.id,
        litres: jc.id === jobCardId ? safeRaw : fallback,
      };
    });
    onChangeProp(next);
  };

  const applyProRata = () => {
    const next = computeProRataByM2(totalLitres, jobCards);
    onChangeProp(next);
  };

  if (jobCards.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
        No job cards on this CPO to split across
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-600">
          Split <strong>{totalLitres}L</strong> across {jobCards.length} job{" "}
          {jobCards.length === 1 ? "card" : "cards"}
        </span>
        <button
          type="button"
          onClick={applyProRata}
          className="text-teal-700 hover:underline font-medium"
        >
          Auto pro-rata by m²
        </button>
      </div>

      <div className="space-y-1">
        {jobCards.map((jc) => {
          const existing = splitMap.get(jc.id);
          const value = existing == null ? 0 : existing;
          const labelRaw = jc.jcNumber == null ? jc.jobNumber : jc.jcNumber;
          return (
            <div
              key={jc.id}
              className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1.5 border border-gray-200"
            >
              <span className="flex-1 truncate">
                {labelRaw}
                <span className="text-gray-500 ml-1">({jc.totalAreaM2.toFixed(1)}m²)</span>
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => updateSplit(jc.id, Number(e.target.value))}
                step="0.01"
                min="0"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-right font-mono text-xs"
              />
              <span className="text-gray-400 text-xs">L</span>
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
          Sum: <strong className="font-mono">{splitSum.toFixed(2)}L</strong>
        </span>
        <span>
          {isBalanced
            ? "Balanced"
            : remainder > 0
              ? `${remainder.toFixed(2)}L unallocated`
              : `Over by ${Math.abs(remainder).toFixed(2)}L`}
        </span>
      </div>
    </div>
  );
}
