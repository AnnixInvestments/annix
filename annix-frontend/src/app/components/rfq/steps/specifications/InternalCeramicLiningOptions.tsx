import { memo } from "react";

interface InternalCeramicLiningOptionsProps {
  ceramicType: string | null | undefined;
  ceramicShape: string | null | undefined;
  ceramicThickness: number | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const CERAMIC_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["92% Alumina Ceramic Tiles", "92% Alumina"],
  ["95% Alumina Ceramic Tiles", "95% Alumina"],
  ["96% Alumina Ceramic Tiles", "96% Alumina"],
  ["99% Alumina Ceramic Tiles", "99% Alumina"],
  ["Silicon Carbide Tiles", "Silicon Carbide"],
  ["Zirconia Tiles", "Zirconia"],
  ["Silicon Nitride Tiles", "Silicon Nitride"],
  ["Rubber Embedded Ceramic Tiles", "Rubber Embedded"],
];

const TILE_SHAPES: ReadonlyArray<readonly [string, string]> = [
  ["Square Tile", "Square"],
  ["Hexagon Tiles", "Hexagon"],
  ["Triangular Tiles", "Triangular"],
  ["Flat Liners", "Flat Liners"],
  ["Pipe Sleeves", "Pipe Sleeves"],
  ["Special Moulded Tiles", "Special Moulded"],
];

const THICKNESSES_MM = [6, 10, 15, 20, 25, 30, 40, 50] as const;

const InternalCeramicLiningOptionsInner = (props: InternalCeramicLiningOptionsProps) => {
  const rawType = props.ceramicType;
  const rawShape = props.ceramicShape;
  const rawThickness = props.ceramicThickness;
  const typeValue = rawType || "";
  const shapeValue = rawShape || "";
  const thicknessValue = rawThickness || "";
  const summaryVisible = !!rawType && !!rawShape && !!rawThickness;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        Internal Ceramic Lining Specifications
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Ceramic Type</label>
          <select
            value={typeValue}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalCeramicType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {CERAMIC_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Tile Shape</label>
          <select
            value={shapeValue}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalCeramicShape: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {TILE_SHAPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
          <select
            value={thicknessValue}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalCeramicThickness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {THICKNESSES_MM.map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {summaryVisible && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
            <div className="text-xs text-amber-800">
              <span className="font-medium">{rawType}</span> • {rawShape} • {rawThickness}mm
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

export const InternalCeramicLiningOptions = memo(InternalCeramicLiningOptionsInner);
