import { memo } from "react";

interface InternalPuLiningOptionsProps {
  thickness: number | null | undefined;
  hardness: number | null | undefined;
  globalSpecs: Record<string, unknown>;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const InternalPuLiningOptionsInner = (props: InternalPuLiningOptionsProps) => {
  const rawThickness = props.thickness;
  const rawHardness = props.hardness;
  const thicknessValue = rawThickness || "";
  const hardnessValue = rawHardness || "";
  const summaryVisible = !!rawThickness && !!rawHardness;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        Internal PU Lining Specifications
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
          <select
            value={thicknessValue}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalPuThickness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
          <select
            value={hardnessValue}
            onChange={(e) =>
              props.onUpdateGlobalSpecs({
                ...props.globalSpecs,
                internalPuHardness: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            {[40, 50, 60, 70, 80, 90].map((shore) => (
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
              <span className="font-medium">PU Lining:</span> {rawThickness}mm • {rawHardness} Shore
              A
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

export const InternalPuLiningOptions = memo(InternalPuLiningOptionsInner);
