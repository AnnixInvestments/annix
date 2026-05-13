import { memo } from "react";

interface SteelPipesConfirmedSummaryProps {
  workingPressureBar: number | null | undefined;
  workingTemperatureC: number | null | undefined;
  hasSteelSpec: boolean;
  hasFlangeStandard: boolean;
  steelSpecName: string | null | undefined;
  flangeStandardCode: string | null | undefined;
  onEdit: () => void;
}

const SteelPipesConfirmedSummaryInner = (props: SteelPipesConfirmedSummaryProps) => {
  const rawSteelSpecName = props.steelSpecName;
  const rawFlangeStandardCode = props.flangeStandardCode;
  const steelSpecLabel = rawSteelSpecName || "Steel Spec";
  const flangeStandardLabel = rawFlangeStandardCode || "Flange";

  return (
    <div className="bg-green-100 border border-green-400 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-green-800">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Steel Pipe Specifications Confirmed</span>
          <span className="mx-2">•</span>
          <span>
            {props.workingPressureBar} bar @ {props.workingTemperatureC}°C
          </span>
          {props.hasSteelSpec && (
            <>
              <span className="mx-2">•</span>
              <span>{steelSpecLabel}</span>
            </>
          )}
          {props.hasFlangeStandard && (
            <>
              <span className="mx-2">•</span>
              <span>{flangeStandardLabel}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={props.onEdit}
          className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export const SteelPipesConfirmedSummary = memo(SteelPipesConfirmedSummaryInner);
