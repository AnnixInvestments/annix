import { memo } from "react";
import { ExternalCoatingProfileInputs } from "./ExternalCoatingProfileInputs";
import { ExternalCoatingRecommendation } from "./ExternalCoatingRecommendation";
import type { ExternalCoatingAssistantProps } from "./external-coating-types";

const ExternalCoatingAssistantInner = (props: ExternalCoatingAssistantProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const isUnregisteredCustomer = props.isUnregisteredCustomer;
  const showFeatureRestrictionPopup = props.showFeatureRestrictionPopup;
  const gsShowExternalCoatingProfile = props.gsShowExternalCoatingProfile;
  const gsWorkingTemperatureC = props.gsWorkingTemperatureC;
  const effectiveEcpTemperature = props.effectiveEcpTemperature;
  const effectiveIndustrialPollution = props.effectiveIndustrialPollution;
  const effectiveInstallationType = props.effectiveInstallationType;
  const effectiveIso12944 = props.effectiveIso12944;
  const effectiveMarineInfluence = props.effectiveMarineInfluence;
  const effectiveMechanicalRisk = props.effectiveMechanicalRisk;
  const effectiveUvExposure = props.effectiveUvExposure;
  const isEcpTemperatureAutoFilled = props.isEcpTemperatureAutoFilled;
  const isIndustrialPollutionAutoFilled = props.isIndustrialPollutionAutoFilled;
  const isInstallationTypeAutoFilled = props.isInstallationTypeAutoFilled;
  const isIso12944AutoFilled = props.isIso12944AutoFilled;
  const isMarineInfluenceAutoFilled = props.isMarineInfluenceAutoFilled;
  const isMechanicalRiskAutoFilled = props.isMechanicalRiskAutoFilled;
  const isUvExposureAutoFilled = props.isUvExposureAutoFilled;
  const iso12944Systems = props.iso12944Systems;
  const iso12944Loading = props.iso12944Loading;
  const selectedIso12944System = props.selectedIso12944System;
  const selectedIso12944SystemCode = props.selectedIso12944SystemCode;
  const setSelectedIso12944SystemCode = props.setSelectedIso12944SystemCode;
  const rawEcpServiceLife = props.rawEcpServiceLife;
  const rawEcpSoilMoisture = props.rawEcpSoilMoisture;
  const rawEcpSoilResistivity = props.rawEcpSoilResistivity;
  const rawEcpSoilType = props.rawEcpSoilType;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={
          isUnregisteredCustomer
            ? showFeatureRestrictionPopup("coating-assistant")
            : () =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showExternalCoatingProfile: !gsShowExternalCoatingProfile,
                })
        }
        onMouseEnter={
          isUnregisteredCustomer ? showFeatureRestrictionPopup("coating-assistant") : undefined
        }
        className={`flex items-center gap-1.5 font-medium text-xs mb-2 ${
          isUnregisteredCustomer
            ? "text-gray-400 cursor-not-allowed"
            : "text-blue-600 hover:text-blue-800"
        }`}
      >
        {isUnregisteredCustomer && (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${gsShowExternalCoatingProfile ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {gsShowExternalCoatingProfile ? "Hide" : "Show"} Coating Assistant (ISO 12944/21809)
      </button>

      {gsShowExternalCoatingProfile && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h4 className="text-sm font-semibold text-orange-900">External Environment Profile</h4>
          </div>

          <ExternalCoatingProfileInputs {...props} />
          {/* Recommendation Display */}
          <ExternalCoatingRecommendation {...props} />
        </div>
      )}
    </div>
  );
};

export const ExternalCoatingAssistant = memo(ExternalCoatingAssistantInner);
