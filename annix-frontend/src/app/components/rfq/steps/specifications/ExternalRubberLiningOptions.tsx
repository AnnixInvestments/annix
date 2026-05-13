import { memo } from "react";

interface ExternalRubberLiningOptionsProps {
  rubberType: string | null | undefined;
  rubberThickness: number | null | undefined;
  rubberColour: string | null | undefined;
  rubberHardness: number | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const RUBBER_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["Natural Rubber", "Natural"],
  ["Bromobutyl Rubber", "Bromobutyl"],
  ["Nitrile Rubber (NBR)", "Nitrile (NBR)"],
  ["Neoprene (CR)", "Neoprene (CR)"],
  ["EPDM", "EPDM"],
  ["Chlorobutyl", "Chlorobutyl"],
  ["Hypalon (CSM)", "Hypalon (CSM)"],
  ["Viton (FKM)", "Viton (FKM)"],
  ["Silicone Rubber", "Silicone"],
];

const THICKNESSES_MM = [3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
const COLOURS: ReadonlyArray<readonly [string, string]> = [
  ["Black", "Black"],
  ["Red", "Red"],
  ["Natural (Tan)", "Natural"],
  ["Grey", "Grey"],
  ["Green", "Green"],
  ["Blue", "Blue"],
  ["White", "White"],
];
const HARDNESSES = [40, 50, 60, 70] as const;

const ExternalRubberLiningOptionsInner = (props: ExternalRubberLiningOptionsProps) => {
  const rawType = props.rubberType;
  const rawThickness = props.rubberThickness;
  const rawColour = props.rubberColour;
  const rawHardness = props.rubberHardness;
  const summaryVisible = !!rawType && !!rawThickness && !!rawColour && !!rawHardness;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        External Rubber Lining Specifications
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Rubber Type</label>
          <select
            value={rawType || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                externalRubberType: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {RUBBER_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
          <select
            value={rawThickness || ""}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                externalRubberThickness: e.target.value ? Number(e.target.value) : null,
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

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
          <select
            value={rawColour || ""}
            onChange={(e) => {
              const v = e.target.value;
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                externalRubberColour: v || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {COLOURS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
          <select
            value={rawHardness || ""}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                externalRubberHardness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {HARDNESSES.map((shore) => (
              <option key={shore} value={shore}>
                {shore} Shore A
              </option>
            ))}
          </select>
        </div>
      </div>

      {summaryVisible && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
            <div className="text-xs text-amber-800">
              <span className="font-medium">{rawType}</span> • {rawThickness}mm • {rawColour} •{" "}
              {rawHardness} Shore A
            </div>
            <button
              type="button"
              onClick={() =>
                props.onUpdateGlobalSpecs({
                  ...props.globalSpecs,
                  externalCoatingConfirmed: true,
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

export const ExternalRubberLiningOptions = memo(ExternalRubberLiningOptionsInner);
