"use client";

import {
  checkSuitabilityFromCache,
  useAllMaterialLimits,
  useSuitableMaterials,
} from "@/app/lib/query/hooks";

type ColorScheme = "blue" | "purple" | "green";

const buttonColorClasses: Record<ColorScheme, string> = {
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  green: "bg-green-100 text-green-700 hover:bg-green-200",
};

interface SteelSpec {
  id: number;
  steelSpecName: string;
}

interface MaterialSuitabilityWarningProps {
  color: ColorScheme;
  steelSpecName: string;
  effectivePressure: number | undefined;
  effectiveTemperature: number | undefined;
  allSteelSpecs: SteelSpec[];
  onSelectSpec: (spec: SteelSpec) => void;
  className?: string;
}

export function MaterialSuitabilityWarning({
  color,
  steelSpecName,
  effectivePressure,
  effectiveTemperature,
  allSteelSpecs,
  onSelectSpec,
  className = "",
}: MaterialSuitabilityWarningProps) {
  const { data: allLimits } = useAllMaterialLimits();
  const { data: suitableSpecPatterns } = useSuitableMaterials(
    effectiveTemperature,
    effectivePressure,
  );

  if (!steelSpecName || (!effectivePressure && !effectiveTemperature)) {
    return null;
  }

  if (!allLimits) {
    return null;
  }

  const suitability = checkSuitabilityFromCache(
    allLimits,
    steelSpecName,
    effectiveTemperature,
    effectivePressure,
  );

  if (suitability.isSuitable && suitability.warnings.length === 0) {
    return null;
  }

  const recommendedSpecs =
    (suitableSpecPatterns ?? []).length > 0
      ? allSteelSpecs.filter((s) =>
          suitableSpecPatterns!.some((pattern) => s.steelSpecName?.includes(pattern)),
        )
      : [];

  const buttonColors = buttonColorClasses[color];

  return (
    <div
      className={`mt-2 p-2 rounded border ${!suitability.isSuitable ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-300"} ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-sm ${!suitability.isSuitable ? "text-red-600" : "text-amber-600"}`}>
          ⚠
        </span>
        <div className="text-xs flex-1">
          {!suitability.isSuitable && (
            <p className="font-semibold text-red-700 mb-1">
              Steel spec not suitable - must be changed:
            </p>
          )}
          {suitability.warnings.map((warning, idx) => (
            <p key={idx} className={!suitability.isSuitable ? "text-red-800" : "text-amber-800"}>
              {warning}
            </p>
          ))}
          {suitability.recommendation && (
            <p className="mt-1 text-gray-700 italic">{suitability.recommendation}</p>
          )}
          {!suitability.isSuitable && recommendedSpecs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-gray-600">Suitable specs:</span>
              {recommendedSpecs.slice(0, 3).map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => onSelectSpec(spec)}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${buttonColors}`}
                >
                  {spec.steelSpecName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
