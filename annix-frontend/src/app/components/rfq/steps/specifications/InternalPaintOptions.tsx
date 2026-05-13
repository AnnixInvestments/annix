import { memo } from "react";

interface InternalPaintOptionsProps {
  primerType: string | null | undefined;
  primerMicrons: number | null | undefined;
  intermediateType: string | null | undefined;
  intermediateMicrons: number | null | undefined;
  topcoatType: string | null | undefined;
  topcoatMicrons: number | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const PRIMER_TYPES = [
  "Epoxy Primer",
  "Phenolic Epoxy",
  "Novolac Epoxy",
  "Coal Tar Epoxy",
  "Polyurethane Primer",
  "Zinc Phosphate Epoxy",
] as const;

const PRIMER_LABELS: Record<(typeof PRIMER_TYPES)[number], string> = {
  "Epoxy Primer": "Epoxy Primer",
  "Phenolic Epoxy": "Phenolic Epoxy",
  "Novolac Epoxy": "Novolac Epoxy",
  "Coal Tar Epoxy": "Coal Tar Epoxy",
  "Polyurethane Primer": "PU Primer",
  "Zinc Phosphate Epoxy": "Zinc Phosphate",
};

const INTERMEDIATE_TYPES = [
  "High Build Epoxy",
  "Glass Flake Epoxy",
  "Phenolic Epoxy",
  "Novolac Epoxy",
] as const;

const TOPCOAT_TYPES = ["Epoxy Topcoat", "Phenolic Epoxy", "Novolac Epoxy", "Polyurethane"] as const;

const InternalPaintOptionsInner = (props: InternalPaintOptionsProps) => {
  const rawPrimerType = props.primerType;
  const rawPrimerMicrons = props.primerMicrons;
  const rawIntermediateType = props.intermediateType;
  const rawIntermediateMicrons = props.intermediateMicrons;
  const rawTopcoatType = props.topcoatType;
  const rawTopcoatMicrons = props.topcoatMicrons;
  const summaryVisible = !!rawPrimerType && !!rawPrimerMicrons;
  const primerMicronsNum = rawPrimerMicrons || 0;
  const intermediateMicronsNum = rawIntermediateMicrons || 0;
  const topcoatMicronsNum = rawTopcoatMicrons || 0;
  const totalDft = primerMicronsNum + intermediateMicronsNum + topcoatMicronsNum;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Paint Specifications</h4>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
          <select
            value={rawPrimerType || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalPrimerType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {PRIMER_TYPES.map((value) => (
              <option key={value} value={value}>
                {PRIMER_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
          <input
            type="number"
            value={rawPrimerMicrons || ""}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalPrimerMicrons: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="50-75"
            min="0"
            max="500"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate</label>
          <select
            value={rawIntermediateType || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalIntermediateType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">None</option>
            {INTERMEDIATE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {rawIntermediateType && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Intermediate (μm)
            </label>
            <input
              type="number"
              value={rawIntermediateMicrons || ""}
              onChange={(e) =>
                props.onUpdateGlobalSpecs({
                  ...props.globalSpecs,
                  internalIntermediateMicrons: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="125-200"
              min="0"
              max="500"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat</label>
          <select
            value={rawTopcoatType || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalTopcoatType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">None</option>
            {TOPCOAT_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {rawTopcoatType && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
            <input
              type="number"
              value={rawTopcoatMicrons || ""}
              onChange={(e) =>
                props.onUpdateGlobalSpecs({
                  ...props.globalSpecs,
                  internalTopcoatMicrons: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="50-75"
              min="0"
              max="500"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
          </div>
        )}
      </div>

      {summaryVisible && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-amber-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Review:</span>
                <span>
                  {rawPrimerType} ({rawPrimerMicrons}μm)
                </span>
                {rawIntermediateType && rawIntermediateMicrons && (
                  <span>
                    • {rawIntermediateType} ({rawIntermediateMicrons}μm)
                  </span>
                )}
                {rawTopcoatType && rawTopcoatMicrons && (
                  <span>
                    • {rawTopcoatType} ({rawTopcoatMicrons}μm)
                  </span>
                )}
                <span className="font-semibold ml-1">= {totalDft}μm DFT</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  props.onUpdateGlobalSpecs({
                    ...props.globalSpecs,
                    internalLiningConfirmed: true,
                  })
                }
                className="px-3 py-1 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InternalPaintOptions = memo(InternalPaintOptionsInner);
