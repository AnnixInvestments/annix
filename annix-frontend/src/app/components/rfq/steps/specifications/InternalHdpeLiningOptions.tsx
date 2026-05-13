import { memo } from "react";

interface InternalHdpeLiningOptionsProps {
  materialGrade: string | null | undefined;
  pressureRating: string | null | undefined;
  sdr: string | null | undefined;
  pipeType: string | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const MATERIAL_GRADES = ["PE63", "PE80", "PE100", "PE100-RC"] as const;
const PRESSURE_RATINGS = [
  "PN 2.5",
  "PN 4",
  "PN 6",
  "PN 8",
  "PN 10",
  "PN 12.5",
  "PN 16",
  "PN 20",
  "PN 25",
] as const;
const SDR_VALUES = [
  "SDR 41",
  "SDR 26",
  "SDR 17",
  "SDR 13.6",
  "SDR 11",
  "SDR 9",
  "SDR 7.4",
] as const;
const PIPE_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["Solid Wall HDPE Pipe", "Solid Wall"],
  ["Corrugated HDPE Pipe", "Corrugated"],
  ["Slitted HDPE Pipe", "Slitted"],
  ["Sleeve HDPE for Steel Lining", "Sleeve for Steel"],
];

const InternalHdpeLiningOptionsInner = (props: InternalHdpeLiningOptionsProps) => {
  const rawMaterialGrade = props.materialGrade;
  const rawPressureRating = props.pressureRating;
  const rawSdr = props.sdr;
  const rawPipeType = props.pipeType;
  const summaryVisible = !!rawMaterialGrade && !!rawPressureRating && !!rawSdr && !!rawPipeType;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        Internal HDPE Lining Specifications
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Material Grade</label>
          <select
            value={rawMaterialGrade || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalHdpeMaterialGrade: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {MATERIAL_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Pressure Rating</label>
          <select
            value={rawPressureRating || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalHdpePressureRating: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {PRESSURE_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">SDR</label>
          <select
            value={rawSdr || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalHdpeSdr: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {SDR_VALUES.map((sdr) => (
              <option key={sdr} value={sdr}>
                {sdr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Pipe Type</label>
          <select
            value={rawPipeType || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalHdpePipeType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {PIPE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {summaryVisible && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
            <div className="text-xs text-amber-800">
              <span className="font-medium">{rawMaterialGrade}</span> • {rawPressureRating} •{" "}
              {rawSdr} • {rawPipeType}
            </div>
            <button
              type="button"
              onClick={() =>
                props.onUpdateGlobalSpecs({
                  ...props.globalSpecs,
                  internalLiningConfirmed: true,
                })
              }
              className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const InternalHdpeLiningOptions = memo(InternalHdpeLiningOptionsInner);
