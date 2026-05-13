import { memo } from "react";

interface ExternalPaintConfirmedProps {
  blastingGrade: string | null | undefined;
  primerType: string;
  primerMicrons: number;
  intermediateType: string | null | undefined;
  intermediateMicrons: number | null | undefined;
  topcoatType: string | null | undefined;
  topcoatMicrons: number | null | undefined;
  topcoatColour: string | null | undefined;
  band1Colour: string | null | undefined;
  band2Colour: string | null | undefined;
  onEdit: () => void;
}

const ExternalPaintConfirmedInner = (props: ExternalPaintConfirmedProps) => {
  const rawBlastingGrade = props.blastingGrade;
  const rawPrimerMicrons = props.primerMicrons;
  const rawIntermediateType = props.intermediateType;
  const rawIntermediateMicrons = props.intermediateMicrons;
  const rawTopcoatType = props.topcoatType;
  const rawTopcoatMicrons = props.topcoatMicrons;
  const rawTopcoatColour = props.topcoatColour;
  const rawBand1Colour = props.band1Colour;
  const rawBand2Colour = props.band2Colour;
  const primerMicronsNum = rawPrimerMicrons || 0;
  const intermediateMicronsNum = rawIntermediateMicrons || 0;
  const topcoatMicronsNum = rawTopcoatMicrons || 0;
  const totalDft = primerMicronsNum + intermediateMicronsNum + topcoatMicronsNum;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          External Paint Specification (Confirmed)
        </h4>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-green-700">
              <span className="font-medium">Surface Prep:</span>{" "}
              {rawBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-green-700">
              <span className="font-medium">Primer:</span> {props.primerType}
            </span>
            <span className="font-semibold text-green-800">{props.primerMicrons} μm</span>
          </div>

          {rawIntermediateType && rawIntermediateMicrons && (
            <div className="flex justify-between items-center">
              <span className="text-green-700">
                <span className="font-medium">Intermediate:</span> {rawIntermediateType}
              </span>
              <span className="font-semibold text-green-800">{rawIntermediateMicrons} μm</span>
            </div>
          )}

          {rawTopcoatType && rawTopcoatMicrons && (
            <div className="flex justify-between items-center">
              <span className="text-green-700">
                <span className="font-medium">Topcoat:</span> {rawTopcoatType}
              </span>
              <span className="font-semibold text-green-800">{rawTopcoatMicrons} μm</span>
            </div>
          )}

          {rawTopcoatType && (
            <div className="flex justify-between items-center">
              <span className="text-green-700">
                <span className="font-medium">Colour:</span>{" "}
                {rawTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}
              </span>
            </div>
          )}

          <div className="flex gap-6 items-center">
            <span className="text-green-700">
              <span className="font-medium">Band 1:</span>{" "}
              {rawBand1Colour || <span className="text-gray-400 italic">None</span>}
            </span>
            <span className="text-green-700">
              <span className="font-medium">Band 2:</span>{" "}
              {rawBand2Colour || <span className="text-gray-400 italic">None</span>}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
            <span className="font-semibold text-green-800">Total DFT</span>
            <span className="font-bold text-green-900">{totalDft} μm</span>
          </div>
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={props.onEdit}
            className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Specification
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExternalPaintConfirmed = memo(ExternalPaintConfirmedInner);
