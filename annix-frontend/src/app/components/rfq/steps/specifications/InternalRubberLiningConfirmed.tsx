import { memo } from "react";

interface InternalRubberLiningConfirmedProps {
  lineCallout: string | null | undefined;
  rubberType: string | null | undefined;
  rubberThickness: number | null | undefined;
  rubberHardness: number | null | undefined;
  rubberColour: string | null | undefined;
  rubberVulcanizationMethod: string | null | undefined;
  onEdit: () => void;
}

const InternalRubberLiningConfirmedInner = (props: InternalRubberLiningConfirmedProps) => {
  const rawLineCallout = props.lineCallout;
  const rawRubberType = props.rubberType;
  const rawRubberThickness = props.rubberThickness;
  const rawRubberHardness = props.rubberHardness;
  const rawRubberColour = props.rubberColour;
  const rawRubberVulcanizationMethod = props.rubberVulcanizationMethod;

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
          <span className="font-medium">Rubber Lined (SANS 1198:2013)</span>
        </div>
        <button
          type="button"
          onClick={props.onEdit}
          className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
        >
          Edit
        </button>
      </div>
      {rawLineCallout && (
        <div className="mt-2 bg-white rounded px-2 py-1 border border-green-300">
          <div className="text-xs text-green-900">
            <span className="font-semibold">Line Call-out:</span>{" "}
            <span className="font-mono">{rawLineCallout}</span>
          </div>
          <div className="text-xs text-green-700 mt-1">
            {rawRubberType && <span>{rawRubberType}</span>}
            {rawRubberThickness && <span> • {rawRubberThickness}mm</span>}
            {rawRubberHardness && <span> • {rawRubberHardness} IRHD</span>}
            {rawRubberColour && <span> • {rawRubberColour}</span>}
            {rawRubberVulcanizationMethod && <span> • {rawRubberVulcanizationMethod}</span>}
          </div>
        </div>
      )}
      {!rawLineCallout && (
        <div className="mt-1 text-xs text-green-700">
          {rawRubberType && <span>{rawRubberType}</span>}
          {rawRubberThickness && <span> • {rawRubberThickness}mm</span>}
          {rawRubberHardness && <span> • {rawRubberHardness} IRHD</span>}
          {rawRubberColour && <span> • {rawRubberColour}</span>}
        </div>
      )}
    </div>
  );
};

export const InternalRubberLiningConfirmed = memo(InternalRubberLiningConfirmedInner);
