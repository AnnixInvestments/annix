"use client";

import { useFifoCompanyValuation } from "../hooks/useFifoValuation";

export interface FifoValuationCardProps {
  title?: string;
  className?: string;
}

export function FifoValuationCard(props: FifoValuationCardProps) {
  const valuation = useFifoCompanyValuation();
  const title = props.title ?? "Stock Valuation (FIFO)";

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${props.className ?? ""}`}
    >
      <div className="text-xs font-semibold text-gray-500 uppercase">{title}</div>
      {valuation.isLoading && <div className="mt-2 text-sm text-gray-400">Loading…</div>}
      {valuation.error && (
        <div className="mt-2 text-sm text-red-600">{valuation.error.message}</div>
      )}
      {!valuation.isLoading && !valuation.error && valuation.totalValueR !== null && (
        <>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            R {valuation.totalValueR.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {valuation.activeBatchCount} active batches
            {valuation.legacyValueR !== null && valuation.legacyValueR > 0 && (
              <>
                {" · "}
                <span className="text-amber-700">
                  R {valuation.legacyValueR.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}{" "}
                  on legacy batch
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FifoValuationCard;
