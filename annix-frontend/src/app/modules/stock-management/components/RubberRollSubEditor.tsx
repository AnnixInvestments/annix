"use client";

export interface RubberRollIssueDetails {
  weightKgIssued: number;
  issuedWidthMm: number | null;
  issuedLengthM: number | null;
  issuedThicknessMm: number | null;
  expectsOffcutReturn: boolean;
}

interface RubberRollSubEditorProps {
  value: RubberRollIssueDetails;
  onChange: (value: RubberRollIssueDetails) => void;
  productName?: string | null;
}

const ASSUMED_DENSITY_KG_PER_M3 = 1000;

function computeWeightFromDimensions(
  widthMm: number | null,
  lengthM: number | null,
  thicknessMm: number | null,
): number | null {
  if (widthMm == null || lengthM == null || thicknessMm == null) {
    return null;
  }
  if (widthMm <= 0 || lengthM <= 0 || thicknessMm <= 0) {
    return null;
  }
  const widthM = widthMm / 1000;
  const thicknessM = thicknessMm / 1000;
  return Math.round(widthM * lengthM * thicknessM * ASSUMED_DENSITY_KG_PER_M3 * 100) / 100;
}

export function RubberRollSubEditor(props: RubberRollSubEditorProps) {
  const value = props.value;
  const onChangeProp = props.onChange;
  const productNameProp = props.productName;
  const titleSuffix = productNameProp == null ? "" : ` for ${productNameProp}`;

  const computedWeight = computeWeightFromDimensions(
    value.issuedWidthMm,
    value.issuedLengthM,
    value.issuedThicknessMm,
  );

  const handleField = (key: keyof RubberRollIssueDetails, raw: string) => {
    if (key === "expectsOffcutReturn") {
      return;
    }
    const parsed = raw === "" ? null : Number(raw);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      return;
    }
    onChangeProp({ ...value, [key]: parsed == null ? 0 : parsed });
  };

  const handleDimension = (
    key: "issuedWidthMm" | "issuedLengthM" | "issuedThicknessMm",
    raw: string,
  ) => {
    const parsed = raw === "" ? null : Number(raw);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      return;
    }
    onChangeProp({ ...value, [key]: parsed });
  };

  const applyComputedWeight = () => {
    if (computedWeight == null) {
      return;
    }
    onChangeProp({ ...value, weightKgIssued: computedWeight });
  };

  const currentWeight = value.weightKgIssued;
  const weightInputValue = currentWeight === 0 ? "" : currentWeight;
  const computedWeightDiffersFromCurrent =
    computedWeight != null && computedWeight !== currentWeight;

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-3">
      <div className="text-xs font-medium text-gray-700">
        Rubber roll issue details{titleSuffix}
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
          Weight issued (kg)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={weightInputValue}
            onChange={(e) => handleField("weightKgIssued", e.target.value)}
            step="0.01"
            min="0"
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
          {computedWeightDiffersFromCurrent ? (
            <button
              type="button"
              onClick={applyComputedWeight}
              className="text-xs text-teal-700 hover:underline font-medium whitespace-nowrap"
              title={`Use computed weight ${computedWeight} kg from dimensions × density`}
            >
              Use {computedWeight}kg
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
            Width (mm)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={value.issuedWidthMm == null ? "" : value.issuedWidthMm}
            onChange={(e) => handleDimension("issuedWidthMm", e.target.value)}
            step="1"
            min="0"
            placeholder="optional"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
            Length (m)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={value.issuedLengthM == null ? "" : value.issuedLengthM}
            onChange={(e) => handleDimension("issuedLengthM", e.target.value)}
            step="0.01"
            min="0"
            placeholder="optional"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
            Thick (mm)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={value.issuedThicknessMm == null ? "" : value.issuedThicknessMm}
            onChange={(e) => handleDimension("issuedThicknessMm", e.target.value)}
            step="0.1"
            min="0"
            placeholder="optional"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value.expectsOffcutReturn}
          onChange={(e) => onChangeProp({ ...value, expectsOffcutReturn: e.target.checked })}
          className="h-4 w-4 text-teal-600"
        />
        <span className="text-gray-700">
          Expect offcut return (creates a follow-up reminder for the storeman)
        </span>
      </label>
    </div>
  );
}
