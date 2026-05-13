import { memo } from "react";

interface CoatingRecommendation {
  coating: string;
  system: string;
  thicknessRange: string;
  standardsBasis: string[];
  engineeringNotes: string[];
  rationale: string;
}

interface ExternalCoatingLockedSupplierSpecProps {
  recommendation: CoatingRecommendation;
  blastingGrade: string | null | undefined;
  topcoatColour: string | null | undefined;
  band1Colour: string | null | undefined;
  band2Colour: string | null | undefined;
  installationType: string | null | undefined;
  iso12944Category: string | null | undefined;
  marineInfluence: string | null | undefined;
  uvExposure: string | null | undefined;
  temperature: string | null | undefined;
  serviceLife: string | null | undefined;
  mechanicalRisk: string | null | undefined;
  industrialPollution: string | null | undefined;
  onUnlock: () => void;
}

const ExternalCoatingLockedSupplierSpecInner = (props: ExternalCoatingLockedSupplierSpecProps) => {
  const rawBlastingGrade = props.blastingGrade;
  const rawTopcoatColour = props.topcoatColour;
  const rawBand1Colour = props.band1Colour;
  const rawBand2Colour = props.band2Colour;
  const rawInstallationType = props.installationType;
  const rawIso12944Category = props.iso12944Category;
  const rawMarineInfluence = props.marineInfluence;
  const rawUvExposure = props.uvExposure;
  const rawTemperature = props.temperature;
  const rawServiceLife = props.serviceLife;
  const rawMechanicalRisk = props.mechanicalRisk;
  const rawIndustrialPollution = props.industrialPollution;
  const showColourBlock = !!rawTopcoatColour || !!rawBand1Colour;
  const installationLabel = rawInstallationType || "N/A";
  const iso12944Label = rawIso12944Category || "N/A";
  const marineLabel = rawMarineInfluence || "None";
  const uvLabel = rawUvExposure || "N/A";
  const tempLabel = rawTemperature || "N/A";
  const serviceLifeLabel = rawServiceLife || "N/A";
  const mechanicalRiskLabel = rawMechanicalRisk || "N/A";
  const pollutionLabel = rawIndustrialPollution || "None";

  return (
    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-6 h-6 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        <h4 className="text-lg font-bold text-green-800">
          External Coating Specification (Locked)
        </h4>
      </div>

      <div className="bg-white rounded-lg border border-green-300 p-4 space-y-4">
        <div className="text-center border-b border-green-200 pb-3">
          <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Coating System
          </h5>
          <p className="text-xl font-bold text-green-800 mt-1">{props.recommendation.coating}</p>
        </div>

        {rawBlastingGrade && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <span className="font-semibold text-amber-800 text-sm">Surface Preparation:</span>
            <p className="text-amber-900 font-medium mt-1">{rawBlastingGrade}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700">System:</span>
            <p className="text-gray-900 mt-0.5">{props.recommendation.system}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Thickness Range:</span>
            <p className="text-gray-900 font-medium mt-0.5">
              {props.recommendation.thicknessRange}
            </p>
          </div>
        </div>

        {showColourBlock && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <span className="font-semibold text-blue-800 text-sm">Colour Specifications:</span>
            <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
              {rawTopcoatColour && (
                <div>
                  <span className="text-blue-600 text-xs">Topcoat Colour:</span>
                  <p className="font-medium text-blue-900">{rawTopcoatColour}</p>
                </div>
              )}
              {rawBand1Colour && (
                <div>
                  <span className="text-blue-600 text-xs">Band 1 Colour:</span>
                  <p className="font-medium text-blue-900">{rawBand1Colour}</p>
                </div>
              )}
              {rawBand2Colour && (
                <div>
                  <span className="text-blue-600 text-xs">Band 2 Colour:</span>
                  <p className="font-medium text-blue-900">{rawBand2Colour}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <span className="font-semibold text-gray-700 text-sm">Applicable Standards:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {props.recommendation.standardsBasis.map((std, i) => (
              <span
                key={`${std}-${i}`}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium"
              >
                {std}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <span className="font-semibold text-gray-700 text-sm">Environment Profile:</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
            <div>
              <span className="text-gray-500">Installation:</span>{" "}
              <span className="font-medium">{installationLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">ISO 12944:</span>{" "}
              <span className="font-medium">{iso12944Label}</span>
            </div>
            <div>
              <span className="text-gray-500">Marine:</span>{" "}
              <span className="font-medium">{marineLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">UV Exposure:</span>{" "}
              <span className="font-medium">{uvLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">Temperature:</span>{" "}
              <span className="font-medium">{tempLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">Service Life:</span>{" "}
              <span className="font-medium">{serviceLifeLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">Mech. Risk:</span>{" "}
              <span className="font-medium">{mechanicalRiskLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">Pollution:</span>{" "}
              <span className="font-medium">{pollutionLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-100 rounded-lg p-3">
          <span className="font-semibold text-green-800 text-sm">
            Engineering Notes for Suppliers:
          </span>
          <ul className="mt-2 text-xs text-green-900 space-y-1">
            {props.recommendation.engineeringNotes.map((note, i) => (
              <li key={`${note.slice(0, 20)}-${i}`} className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-3">
          <strong>Rationale:</strong> {props.recommendation.rationale}
        </div>
      </div>

      <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800 text-center">
        <strong>This specification will be sent to suppliers for quotation.</strong>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={props.onUnlock}
          className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          </svg>
          Unlock & Edit Specification
        </button>
      </div>
    </div>
  );
};

export const ExternalCoatingLockedSupplierSpec = memo(ExternalCoatingLockedSupplierSpecInner);
