import { memo } from "react";
import { type ISO12944SystemsByDurabilityResult } from "@/app/lib/api/client";
import { nowISO } from "@/app/lib/datetime";
import {
  classifyExternalDamageMechanisms,
  type ExternalEnvironmentProfile,
  hasCompleteExternalProfile,
  recommendExternalCoating,
} from "@/app/lib/utils/coatingLiningRecommendations";
import { autoFilledClass } from "./helpers";
import type { FeatureType } from "./types";

interface CoatingGlobalSpecs {
  ecpCathodicProtection?: boolean;
  ecpServiceLife?: string | null;
  ecpSoilMoisture?: string | null;
  ecpSoilResistivity?: string | null;
  ecpSoilType?: string | null;
  externalCoatingActionLog?: unknown[] | null;
  recBand1Input?: string | null;
  recBand2Input?: string | null;
  recCustomColourInput?: string | null;
  recExternalBand1Colour?: string | null;
  recExternalBand2Colour?: string | null;
  recExternalTopcoatColour?: string | null;
  showRecBand1Input?: boolean;
  showRecBand2Input?: boolean;
  showRecCustomColourInput?: boolean;
}

interface ExternalCoatingAssistantProps {
  globalSpecs: CoatingGlobalSpecs;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
  gsShowExternalCoatingProfile: boolean;
  gsWorkingTemperatureC: number | null;
  effectiveEcpTemperature: string | null;
  effectiveIndustrialPollution: string | null;
  effectiveInstallationType: string | null;
  effectiveIso12944: string | null;
  effectiveMarineInfluence: string | null;
  effectiveMechanicalRisk: string | null;
  effectiveUvExposure: string | null;
  isEcpTemperatureAutoFilled: boolean;
  isIndustrialPollutionAutoFilled: boolean;
  isInstallationTypeAutoFilled: boolean;
  isIso12944AutoFilled: boolean;
  isMarineInfluenceAutoFilled: boolean;
  isMechanicalRiskAutoFilled: boolean;
  isUvExposureAutoFilled: boolean;
  iso12944Systems: ISO12944SystemsByDurabilityResult | null;
  iso12944Loading: boolean;
  selectedIso12944System: ISO12944SystemsByDurabilityResult["recommended"] | undefined;
  selectedIso12944SystemCode: string | null;
  setSelectedIso12944SystemCode: (code: string | null) => void;
  rawEcpServiceLife: string | null;
  rawEcpSoilMoisture: string | null;
  rawEcpSoilResistivity: string | null;
  rawEcpSoilType: string | null;
}

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

          {/* Installation Conditions */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              Installation Conditions
              {(isInstallationTypeAutoFilled ||
                isUvExposureAutoFilled ||
                isMechanicalRiskAutoFilled) && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  ✓ Auto-filled from Mine Selection
                </span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Installation Type *
                  {isInstallationTypeAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveInstallationType || ""}
                  onChange={(e) => {
                    const rawValue3 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpInstallationType: rawValue3 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isInstallationTypeAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="AboveGround">Above Ground</option>
                  <option value="Buried">Buried</option>
                  <option value="Submerged">Submerged</option>
                  <option value="Splash">Splash Zone</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  UV Exposure
                  {isUvExposureAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                </label>
                <select
                  value={effectiveUvExposure || ""}
                  onChange={(e) => {
                    const rawValue4 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpUvExposure: rawValue4 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isUvExposureAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Mechanical Risk
                  {isMechanicalRiskAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMechanicalRisk || ""}
                  onChange={(e) => {
                    const rawValue5 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpMechanicalRisk: rawValue5 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMechanicalRiskAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High (Rocky/Abrasive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Atmospheric Environment */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Atmospheric Environment
              {(isIso12944AutoFilled ||
                isMarineInfluenceAutoFilled ||
                isIndustrialPollutionAutoFilled) && (
                <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Auto</span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  ISO 12944 *
                  {isIso12944AutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                </label>
                <select
                  value={effectiveIso12944 || ""}
                  onChange={(e) => {
                    const rawValue6 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpIso12944Category: rawValue6 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIso12944AutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="C1">C1 - Very Low</option>
                  <option value="C2">C2 - Low</option>
                  <option value="C3">C3 - Medium</option>
                  <option value="C4">C4 - High</option>
                  <option value="C5">C5 - Very High</option>
                  <option value="CX">CX - Extreme</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Marine
                  {isMarineInfluenceAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMarineInfluence || ""}
                  onChange={(e) => {
                    const rawValue7 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpMarineInfluence: rawValue7 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMarineInfluenceAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="None">None (Inland)</option>
                  <option value="Coastal">Coastal</option>
                  <option value="Offshore">Offshore</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Industrial
                  {isIndustrialPollutionAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveIndustrialPollution || ""}
                  onChange={(e) => {
                    const rawValue8 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpIndustrialPollution: rawValue8 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIndustrialPollutionAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="None">None / Rural</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Heavy">Heavy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Soil Conditions (for buried) */}
          {effectiveInstallationType === "Buried" && (
            <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
              <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                Soil Conditions
              </h5>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Soil Type
                  </label>
                  <select
                    value={rawEcpSoilType || ""}
                    onChange={(e) => {
                      const rawValue9 = e.target.value;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        ecpSoilType: rawValue9 || null,
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Clay">Clay</option>
                    <option value="Rocky">Rocky</option>
                    <option value="Marshy">Marshy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Resistivity
                  </label>
                  <select
                    value={rawEcpSoilResistivity || ""}
                    onChange={(e) => {
                      const rawValue10 = e.target.value;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        ecpSoilResistivity: rawValue10 || null,
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="VeryLow">&lt;500 Ω·cm</option>
                    <option value="Low">500–2k Ω·cm</option>
                    <option value="Medium">2k–10k Ω·cm</option>
                    <option value="High">&gt;10k Ω·cm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                    Moisture
                  </label>
                  <select
                    value={rawEcpSoilMoisture || ""}
                    onChange={(e) => {
                      const rawValue11 = e.target.value;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        ecpSoilMoisture: rawValue11 || null,
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Dry">Dry</option>
                    <option value="Normal">Normal</option>
                    <option value="Wet">Wet</option>
                    <option value="Saturated">Saturated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Operating Conditions */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                {effectiveInstallationType === "Buried" ? "4" : "3"}
              </span>
              Operating Conditions
              {isEcpTemperatureAutoFilled && (
                <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Temp Auto</span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Temperature
                </label>
                <select
                  value={effectiveEcpTemperature || ""}
                  onChange={(e) => {
                    const rawValue12 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpTemperature: rawValue12 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${
                    isEcpTemperatureAutoFilled
                      ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                      : "border border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="">Select...</option>
                  <option value="Ambient">Ambient</option>
                  <option value="Elevated">Elevated (60–120°C)</option>
                  <option value="High">High (120–200°C)</option>
                  <option value="Cyclic">Cyclic</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Service Life *
                </label>
                <select
                  value={rawEcpServiceLife || ""}
                  onChange={(e) => {
                    const rawValue13 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpServiceLife: rawValue13 || null,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="Short">&lt;7 years</option>
                  <option value="Medium">7–15 years</option>
                  <option value="Long">15–25 years</option>
                  <option value="Extended">&gt;25 years</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Cathodic Prot?
                </label>
                <select
                  value={
                    globalSpecs?.ecpCathodicProtection === true
                      ? "true"
                      : globalSpecs?.ecpCathodicProtection === false
                        ? "false"
                        : ""
                  }
                  onChange={(e) =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      ecpCathodicProtection:
                        e.target.value === "true"
                          ? true
                          : e.target.value === "false"
                            ? false
                            : null,
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recommendation Display */}
          {(() => {
            const profile: ExternalEnvironmentProfile = {
              installation: {
                type: effectiveInstallationType as any,
                uvExposure: effectiveUvExposure as any,
                mechanicalRisk: effectiveMechanicalRisk as any,
              },
              atmosphere: {
                iso12944Category: effectiveIso12944 as any,
                marineInfluence: effectiveMarineInfluence as any,
                industrialPollution: effectiveIndustrialPollution as any,
              },
              soil: {
                soilType: globalSpecs?.ecpSoilType as any,
                resistivity: globalSpecs?.ecpSoilResistivity as any,
                moisture: globalSpecs?.ecpSoilMoisture as any,
              },
              operating: {
                temperature: effectiveEcpTemperature as any,
                cathodicProtection: globalSpecs?.ecpCathodicProtection,
                serviceLife: globalSpecs?.ecpServiceLife as any,
              },
            };

            if (!hasCompleteExternalProfile(profile)) {
              return (
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Complete the required fields (marked *) to receive a coating recommendation.
                  </p>
                </div>
              );
            }

            const damage = classifyExternalDamageMechanisms(profile);
            const recommendation = recommendExternalCoating(profile, damage);

            const rawSystemCode = iso12944Systems?.recommended?.systemCode;
            const rawRecExternalTopcoatColour = globalSpecs?.recExternalTopcoatColour;
            const rawRecCustomColourInput = globalSpecs?.recCustomColourInput;
            const rawRecExternalBand1Colour = globalSpecs?.recExternalBand1Colour;
            const rawRecBand1Input = globalSpecs?.recBand1Input;
            const rawRecExternalBand2Colour = globalSpecs?.recExternalBand2Colour;
            const rawRecBand2Input = globalSpecs?.recBand2Input;

            return (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-md p-2 border-2 border-emerald-300">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h5 className="text-xs font-bold text-emerald-900">Recommended Coating</h5>
                  </div>
                  {isEcpTemperatureAutoFilled && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                      Temp: {gsWorkingTemperatureC}°C
                    </span>
                  )}
                </div>
                {/* Compact 4-column grid for main info */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500">Coating</div>
                    <div className="text-xs font-bold text-emerald-800">
                      {recommendation.coating}
                    </div>
                  </div>
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500">System</div>
                    <div className="text-[10px] text-gray-700">{recommendation.system}</div>
                  </div>
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500">Thickness</div>
                    <div className="text-xs font-semibold text-gray-800">
                      {recommendation.thicknessRange}
                    </div>
                  </div>
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500">Exposure</div>
                    <div className="flex flex-wrap gap-0.5">
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded ${damage.atmosphericCorrosion === "Severe" || damage.atmosphericCorrosion === "High" ? "bg-red-100 text-red-700" : damage.atmosphericCorrosion === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                      >
                        {damage.atmosphericCorrosion}
                      </span>
                      {effectiveInstallationType === "Buried" && (
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded ${damage.soilCorrosion === "Severe" || damage.soilCorrosion === "High" ? "bg-red-100 text-red-700" : damage.soilCorrosion === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                        >
                          Soil
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Standards and Notes in compact 2-column layout */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500 mb-1">Standards</div>
                    <div className="flex flex-wrap gap-1">
                      {recommendation.standardsBasis.slice(0, 3).map((std, i) => (
                        <span
                          key={i}
                          className="text-[9px] bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-medium"
                        >
                          {std}
                        </span>
                      ))}
                      {recommendation.standardsBasis.length > 3 && (
                        <span className="text-[9px] text-gray-500">
                          +{recommendation.standardsBasis.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded p-1.5 border border-emerald-200">
                    <div className="text-[10px] font-medium text-gray-500 mb-1">Rationale</div>
                    <p className="text-[10px] text-gray-700 line-clamp-2">
                      {recommendation.rationale}
                    </p>
                  </div>
                </div>
                {/* Engineering Notes - collapsible */}
                <details className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                  <summary className="text-[10px] font-medium text-gray-500 cursor-pointer">
                    Engineering Notes ({recommendation.engineeringNotes.length})
                  </summary>
                  <ul className="text-[10px] text-gray-700 mt-1 space-y-0.5 pl-2">
                    {recommendation.engineeringNotes.map((note, i) => (
                      <li key={i}>• {note}</li>
                    ))}
                  </ul>
                </details>
                {/* ISO 12944-5 Paint System Selection */}
                {["C1", "C2", "C3", "C4", "C5"].includes(effectiveIso12944 || "") &&
                  globalSpecs?.ecpServiceLife && (
                    <div className="bg-blue-50 rounded p-2 border border-blue-200 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                            ISO
                          </span>
                          <h6 className="text-[10px] font-bold text-blue-900">
                            ISO 12944-5:2018 Paint System
                          </h6>
                        </div>
                        {iso12944Loading && (
                          <span className="text-[9px] text-blue-600 animate-pulse">Loading...</span>
                        )}
                      </div>

                      {selectedIso12944System && (
                        <>
                          <div className="grid grid-cols-4 gap-1.5 mb-2">
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">
                                System Code
                              </div>
                              <div className="text-xs font-bold text-blue-800">
                                {selectedIso12944System.systemCode}
                              </div>
                            </div>
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">Binder</div>
                              <div className="text-[10px] text-gray-700">
                                {selectedIso12944System.binderType}
                              </div>
                            </div>
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">Primer</div>
                              <div className="text-[10px] text-gray-700">
                                {selectedIso12944System.primerType}
                              </div>
                            </div>
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">Total DFT</div>
                              <div className="text-xs font-semibold text-blue-800">
                                {selectedIso12944System.totalDftUmRange}μm
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 mb-2">
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">
                                System Description
                              </div>
                              <div className="text-[10px] text-gray-700">
                                {selectedIso12944System.system}
                              </div>
                            </div>
                            <div className="bg-white rounded p-1.5 border border-blue-200">
                              <div className="text-[9px] font-medium text-gray-500">
                                Coats / Primer DFT
                              </div>
                              <div className="text-[10px] text-gray-700">
                                {selectedIso12944System.coats} coats | Primer:{" "}
                                {selectedIso12944System.primerNdftUm}μm
                              </div>
                            </div>
                          </div>

                          {/* Alternative Systems Selector */}
                          {iso12944Systems && iso12944Systems.alternatives.length > 0 && (
                            <div className="flex items-center gap-2">
                              <label className="text-[9px] font-medium text-gray-600 whitespace-nowrap">
                                Alternative Systems:
                              </label>
                              <select
                                value={selectedIso12944SystemCode || ""}
                                onChange={(e) => setSelectedIso12944SystemCode(e.target.value)}
                                className="flex-1 px-2 py-1 text-[10px] border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                              >
                                {iso12944Systems.recommended && (
                                  <option value={rawSystemCode || ""}>
                                    {iso12944Systems.recommended.systemCode} -{" "}
                                    {iso12944Systems.recommended.system} (
                                    {iso12944Systems.recommended.totalDftUmRange}μm) [Recommended]
                                  </option>
                                )}
                                {iso12944Systems.alternatives.map((sys) => {
                                  const rawSystemCode2 = sys.systemCode;

                                  return (
                                    <option key={sys.systemCode} value={rawSystemCode2 || ""}>
                                      {sys.systemCode}- {sys.system}({sys.totalDftUmRange}μm)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </>
                      )}

                      {!selectedIso12944System && !iso12944Loading && (
                        <p className="text-[10px] text-blue-700">
                          No ISO 12944-5 systems available for this category/durability combination.
                        </p>
                      )}
                    </div>
                  )}
                {/* Colour Selection - more compact */}
                <div className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                  <div className="text-[10px] font-medium text-emerald-700 mb-1.5 flex items-center gap-1">
                    <span className="bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                      4
                    </span>
                    Colours (Optional)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Topcoat Colour */}
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                        Topcoat
                      </label>
                      {!globalSpecs?.showRecCustomColourInput ? (
                        <select
                          value={rawRecExternalTopcoatColour || ""}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_CUSTOM__") {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showRecCustomColourInput: true,
                              });
                            } else {
                              const rawValue14 = e.target.value;
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                recExternalTopcoatColour: rawValue14 || null,
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="__ADD_CUSTOM__">+ Custom...</option>
                          {(() => {
                            try {
                              const customColours = JSON.parse(
                                localStorage.getItem("customTopcoatColours") || "[]",
                              );
                              if (customColours.length > 0) {
                                return customColours.map((colour: string, idx: number) => (
                                  <option key={idx} value={colour}>
                                    {colour}
                                  </option>
                                ));
                              }
                            } catch {
                              console.warn("Failed to load custom topcoat colours");
                            }
                            return null;
                          })()}
                          <optgroup label="Mining">
                            <option value="Safety Yellow (RAL 1003)">Yellow RAL 1003</option>
                            <option value="Safety Orange (RAL 2009)">Orange RAL 2009</option>
                            <option value="Safety Red (RAL 3001)">Red RAL 3001</option>
                            <option value="Safety Green (RAL 6024)">Green RAL 6024</option>
                            <option value="Signal Blue (RAL 5005)">Blue RAL 5005</option>
                            <option value="White (RAL 9003)">White RAL 9003</option>
                            <option value="Black (RAL 9005)">Black RAL 9005</option>
                            <option value="Grey (RAL 7035)">Grey RAL 7035</option>
                          </optgroup>
                          <optgroup label="Pipeline">
                            <option value="Water - Blue (RAL 5015)">Water Blue</option>
                            <option value="Steam - Silver Grey (RAL 7001)">Steam Grey</option>
                            <option value="Air - Light Blue (RAL 5012)">Air Blue</option>
                            <option value="Gas - Yellow Ochre (RAL 1024)">Gas Yellow</option>
                            <option value="Fire Services - Red (RAL 3000)">Fire Red</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={rawRecCustomColourInput || ""}
                            onChange={(e) =>
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                recCustomColourInput: e.target.value,
                              })
                            }
                            placeholder="Colour name"
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.recCustomColourInput?.trim();
                                if (newColour) {
                                  try {
                                    const existing = JSON.parse(
                                      localStorage.getItem("customTopcoatColours") || "[]",
                                    );
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem(
                                        "customTopcoatColours",
                                        JSON.stringify(existing),
                                      );
                                    }
                                  } catch {
                                    console.warn("Failed to save custom topcoat colour");
                                  }
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    recExternalTopcoatColour: newColour,
                                    showRecCustomColourInput: false,
                                    recCustomColourInput: null,
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.recCustomColourInput?.trim()}
                              className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  showRecCustomColourInput: false,
                                  recCustomColourInput: null,
                                })
                              }
                              className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Band 1 Colour */}
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                        Band 1
                      </label>
                      {!globalSpecs?.showRecBand1Input ? (
                        <select
                          value={rawRecExternalBand1Colour || ""}
                          onChange={(e) => {
                            if (e.target.value === "__ADD_CUSTOM__") {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showRecBand1Input: true,
                              });
                            } else {
                              const rawValue15 = e.target.value;
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                recExternalBand1Colour: rawValue15 || null,
                                ...(e.target.value ? {} : { recExternalBand2Colour: null }),
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                        >
                          <option value="">None</option>
                          <option value="__ADD_CUSTOM__">+ Custom...</option>
                          {(() => {
                            try {
                              const customColours = JSON.parse(
                                localStorage.getItem("customBandColours") || "[]",
                              );
                              if (customColours.length > 0) {
                                return customColours.map((colour: string, idx: number) => (
                                  <option key={idx} value={colour}>
                                    {colour}
                                  </option>
                                ));
                              }
                            } catch {
                              console.warn("Failed to load custom band colours");
                            }
                            return null;
                          })()}
                          <option value="White (RAL 9003)">White</option>
                          <option value="Yellow (RAL 1023)">Yellow</option>
                          <option value="Orange (RAL 2004)">Orange</option>
                          <option value="Red (RAL 3020)">Red</option>
                          <option value="Blue (RAL 5015)">Blue</option>
                          <option value="Green (RAL 6032)">Green</option>
                          <option value="Black (RAL 9005)">Black</option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={rawRecBand1Input || ""}
                            onChange={(e) =>
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                recBand1Input: e.target.value,
                              })
                            }
                            placeholder="Band colour"
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.recBand1Input?.trim();
                                if (newColour) {
                                  try {
                                    const existing = JSON.parse(
                                      localStorage.getItem("customBandColours") || "[]",
                                    );
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem(
                                        "customBandColours",
                                        JSON.stringify(existing),
                                      );
                                    }
                                  } catch {
                                    console.warn("Failed to save custom band colour");
                                  }
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    recExternalBand1Colour: newColour,
                                    showRecBand1Input: false,
                                    recBand1Input: null,
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.recBand1Input?.trim()}
                              className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  showRecBand1Input: false,
                                  recBand1Input: null,
                                })
                              }
                              className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Band 2 Colour - Only if Band 1 selected */}
                    {globalSpecs?.recExternalBand1Colour && (
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Band 2
                        </label>
                        {!globalSpecs?.showRecBand2Input ? (
                          <select
                            value={rawRecExternalBand2Colour || ""}
                            onChange={(e) => {
                              if (e.target.value === "__ADD_CUSTOM__") {
                                onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  showRecBand2Input: true,
                                });
                              } else {
                                const rawValue16 = e.target.value;
                                onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  recExternalBand2Colour: rawValue16 || null,
                                });
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                          >
                            <option value="">None</option>
                            <option value="__ADD_CUSTOM__">+ Custom...</option>
                            {(() => {
                              try {
                                const customColours = JSON.parse(
                                  localStorage.getItem("customBandColours") || "[]",
                                );
                                if (customColours.length > 0) {
                                  return customColours.map((colour: string, idx: number) => (
                                    <option key={idx} value={colour}>
                                      {colour}
                                    </option>
                                  ));
                                }
                              } catch {
                                console.warn("Failed to load custom band colours");
                              }
                              return null;
                            })()}
                            <option value="White (RAL 9003)">White</option>
                            <option value="Yellow (RAL 1023)">Yellow</option>
                            <option value="Orange (RAL 2004)">Orange</option>
                            <option value="Red (RAL 3020)">Red</option>
                            <option value="Blue (RAL 5015)">Blue</option>
                            <option value="Green (RAL 6032)">Green</option>
                            <option value="Black (RAL 9005)">Black</option>
                          </select>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={rawRecBand2Input || ""}
                              onChange={(e) =>
                                onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  recBand2Input: e.target.value,
                                })
                              }
                              placeholder="Band colour"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newColour = globalSpecs?.recBand2Input?.trim();
                                  if (newColour) {
                                    try {
                                      const existing = JSON.parse(
                                        localStorage.getItem("customBandColours") || "[]",
                                      );
                                      if (!existing.includes(newColour)) {
                                        existing.push(newColour);
                                        localStorage.setItem(
                                          "customBandColours",
                                          JSON.stringify(existing),
                                        );
                                      }
                                    } catch {
                                      console.warn("Failed to save custom band colour");
                                    }
                                    onUpdateGlobalSpecs({
                                      ...globalSpecs,
                                      recExternalBand2Colour: newColour,
                                      showRecBand2Input: false,
                                      recBand2Input: null,
                                    });
                                  }
                                }}
                                disabled={!globalSpecs?.recBand2Input?.trim()}
                                className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    showRecBand2Input: false,
                                    recBand2Input: null,
                                  })
                                }
                                className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Compact action buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rawExternalCoatingActionLog = globalSpecs?.externalCoatingActionLog;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingType: recommendation.coatingType,
                        externalCoatingConfirmed: true,
                        externalCoatingRecommendationRejected: false,
                        externalBlastingGrade:
                          recommendation.coatingType === "Galvanized"
                            ? null
                            : "SA 2.5 (ISO 8501-1)",
                        externalTopcoatColour: globalSpecs?.recExternalTopcoatColour,
                        externalBand1Colour: globalSpecs?.recExternalBand1Colour,
                        externalBand2Colour: globalSpecs?.recExternalBand2Colour,
                        externalCoatingRecommendation: {
                          coating: recommendation.coating,
                          system: recommendation.system,
                          thicknessRange: recommendation.thicknessRange,
                          standardsBasis: recommendation.standardsBasis,
                          rationale: recommendation.rationale,
                          engineeringNotes: recommendation.engineeringNotes,
                          environmentProfile: {
                            installationType: effectiveInstallationType,
                            iso12944Category: effectiveIso12944,
                            marineInfluence: effectiveMarineInfluence,
                            industrialPollution: effectiveIndustrialPollution,
                            uvExposure: effectiveUvExposure,
                            mechanicalRisk: effectiveMechanicalRisk,
                            temperature: effectiveEcpTemperature,
                            serviceLife: globalSpecs?.ecpServiceLife,
                          },
                          damageAssessment: {
                            atmosphericCorrosion: damage.atmosphericCorrosion,
                            soilCorrosion: damage.soilCorrosion,
                            mechanicalDamage: damage.mechanicalDamage,
                            dominantMechanism: damage.dominantMechanism,
                          },
                        },
                        externalCoatingActionLog: [
                          ...(rawExternalCoatingActionLog || []),
                          {
                            action: "ACCEPTED",
                            timestamp: nowISO(),
                            recommendation: recommendation.coating,
                          },
                        ],
                      });
                    }}
                    className="flex-1 px-2 py-1.5 bg-emerald-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-emerald-700"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Accept & Lock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rawExternalCoatingActionLog2 = globalSpecs?.externalCoatingActionLog;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingRecommendationRejected: true,
                        externalCoatingActionLog: [
                          ...(rawExternalCoatingActionLog2 || []),
                          {
                            action: "REJECTED",
                            timestamp: nowISO(),
                            recommendation: recommendation.coating,
                          },
                        ],
                      });
                    }}
                    className="px-2 py-1.5 bg-red-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-red-700"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Reject
                  </button>
                </div>
                {/* Compact disclaimer */}
                <details className="mt-2 text-[10px] text-amber-700">
                  <summary className="cursor-pointer font-medium">Engineering Disclaimer</summary>
                  <p className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded">
                    Recommendations based on ISO 12944/21809. Does not replace project-specific
                    assessments or qualified inspector verification.
                  </p>
                </details>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export const ExternalCoatingAssistant = memo(ExternalCoatingAssistantInner);
