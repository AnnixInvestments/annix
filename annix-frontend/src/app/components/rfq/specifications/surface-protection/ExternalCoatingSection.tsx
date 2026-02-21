"use client";

import { useEffect, useState } from "react";
import {
  coatingSpecificationApi,
  type ISO12944SystemsByDurabilityResult,
} from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";
import {
  classifyExternalDamageMechanisms,
  type ExternalEnvironmentProfile,
  recommendExternalCoating,
} from "@/app/lib/utils/coatingLiningRecommendations";
import type { ExternalCoatingSectionProps } from "./types";
import { APPLICATION_METHODS, SUBSTRATE_TYPES } from "./types";

export function ExternalCoatingSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  isUnregisteredCustomer,
  showFeatureRestrictionPopup,
  effectiveInstallationType,
  effectiveUvExposure,
  effectiveMechanicalRisk,
  effectiveIso12944,
  effectiveMarineInfluence,
  effectiveIndustrialPollution,
  effectiveEcpTemperature,
  isInstallationTypeAutoFilled,
  isUvExposureAutoFilled,
  isMechanicalRiskAutoFilled,
  isIso12944AutoFilled,
  isMarineInfluenceAutoFilled,
  isIndustrialPollutionAutoFilled,
  isEcpTemperatureAutoFilled,
}: ExternalCoatingSectionProps) {
  const [iso12944Systems, setIso12944Systems] = useState<ISO12944SystemsByDurabilityResult | null>(
    null,
  );
  const [iso12944Loading, setIso12944Loading] = useState(false);
  const [selectedIso12944SystemCode, setSelectedIso12944SystemCode] = useState<string | null>(null);

  const autoFilledClass = (isAutoFilled: boolean) =>
    isAutoFilled
      ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
      : "border border-gray-300 text-gray-900";

  const serviceLifeToDurability = (
    serviceLife: string | undefined,
  ): "L" | "M" | "H" | "VH" | null => {
    switch (serviceLife) {
      case "Short":
        return "L";
      case "Medium":
        return "M";
      case "Long":
        return "H";
      case "Extended":
        return "VH";
      default:
        return null;
    }
  };

  const effectiveDurability = serviceLifeToDurability(globalSpecs?.ecpServiceLife);

  useEffect(() => {
    const fetchIso12944Systems = async () => {
      if (!effectiveIso12944 || !effectiveDurability) {
        setIso12944Systems(null);
        setSelectedIso12944SystemCode(null);
        return;
      }

      if (!["C1", "C2", "C3", "C4", "C5"].includes(effectiveIso12944)) {
        setIso12944Systems(null);
        setSelectedIso12944SystemCode(null);
        return;
      }

      setIso12944Loading(true);
      try {
        const result = await coatingSpecificationApi.systemsByDurability(
          effectiveIso12944,
          effectiveDurability,
        );
        setIso12944Systems(result);
        if (result.recommended?.systemCode) {
          setSelectedIso12944SystemCode(result.recommended.systemCode);
        }
      } catch (error) {
        log.error("Failed to fetch ISO 12944-5 systems", { error });
        setIso12944Systems(null);
      } finally {
        setIso12944Loading(false);
      }
    };

    fetchIso12944Systems();
  }, [effectiveIso12944, effectiveDurability]);

  const selectedIso12944System = selectedIso12944SystemCode
    ? iso12944Systems?.recommended?.systemCode === selectedIso12944SystemCode
      ? iso12944Systems.recommended
      : iso12944Systems?.alternatives.find((s) => s.systemCode === selectedIso12944SystemCode)
    : iso12944Systems?.recommended;

  const hasCompleteExternalProfile = (): boolean => {
    return !!(effectiveInstallationType && effectiveIso12944 && globalSpecs?.ecpServiceLife);
  };

  const buildExternalProfile = (): ExternalEnvironmentProfile => ({
    installation: {
      type: effectiveInstallationType as
        | "AboveGround"
        | "Buried"
        | "Submerged"
        | "Splash"
        | undefined,
      uvExposure: effectiveUvExposure as "None" | "Moderate" | "High" | undefined,
      mechanicalRisk: effectiveMechanicalRisk as "Low" | "Medium" | "High" | undefined,
    },
    atmosphere: {
      iso12944Category: effectiveIso12944 as "C1" | "C2" | "C3" | "C4" | "C5" | "CX" | undefined,
      marineInfluence: effectiveMarineInfluence as "None" | "Coastal" | "Offshore" | undefined,
      industrialPollution: effectiveIndustrialPollution as
        | "None"
        | "Moderate"
        | "Heavy"
        | undefined,
    },
    soil: {
      soilType: globalSpecs?.ecpSoilType as "Sandy" | "Clay" | "Rocky" | "Marshy" | undefined,
      resistivity: globalSpecs?.ecpSoilResistivity as
        | "VeryLow"
        | "Low"
        | "Medium"
        | "High"
        | undefined,
      moisture: globalSpecs?.ecpSoilMoisture as "Dry" | "Normal" | "Wet" | "Saturated" | undefined,
    },
    operating: {
      temperature: effectiveEcpTemperature as
        | "Ambient"
        | "Elevated"
        | "High"
        | "Cyclic"
        | undefined,
      cathodicProtection: globalSpecs?.ecpCathodicProtection,
      serviceLife: globalSpecs?.ecpServiceLife as
        | "Short"
        | "Medium"
        | "Long"
        | "Extended"
        | undefined,
    },
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-gray-800 mb-2">External Coating</h3>

      {!globalSpecs?.externalCoatingConfirmed && (
        <div className="mb-2">
          <button
            type="button"
            onClick={
              isUnregisteredCustomer
                ? showFeatureRestrictionPopup("coating-assistant")
                : () =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      showExternalCoatingProfile: !globalSpecs?.showExternalCoatingProfile,
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
              className={`w-3 h-3 transition-transform ${
                globalSpecs?.showExternalCoatingProfile ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {globalSpecs?.showExternalCoatingProfile ? "Hide" : "Show"} Coating Assistant (ISO
            12944/21809)
          </button>

          {globalSpecs?.showExternalCoatingProfile && (
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
                <h4 className="text-sm font-semibold text-orange-900">
                  External Environment Profile
                </h4>
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
                      Auto-filled from Mine Selection
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
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpInstallationType: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isInstallationTypeAutoFilled,
                      )}`}
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
                      {isUvExposureAutoFilled && (
                        <span className="ml-1 text-emerald-600">(Auto)</span>
                      )}
                    </label>
                    <select
                      value={effectiveUvExposure || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpUvExposure: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isUvExposureAutoFilled,
                      )}`}
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
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpMechanicalRisk: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isMechanicalRiskAutoFilled,
                      )}`}
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
                    <span className="ml-1 text-[10px] font-medium text-emerald-600">Auto</span>
                  )}
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      ISO 12944 *
                      {isIso12944AutoFilled && (
                        <span className="ml-1 text-emerald-600">(Auto)</span>
                      )}
                    </label>
                    <select
                      value={effectiveIso12944 || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpIso12944Category: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isIso12944AutoFilled,
                      )}`}
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
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpMarineInfluence: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isMarineInfluenceAutoFilled,
                      )}`}
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
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpIndustrialPollution: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(
                        isIndustrialPollutionAutoFilled,
                      )}`}
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
                        value={globalSpecs?.ecpSoilType || ""}
                        onChange={(e) =>
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            ecpSoilType: e.target.value || undefined,
                          })
                        }
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
                        value={globalSpecs?.ecpSoilResistivity || ""}
                        onChange={(e) =>
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            ecpSoilResistivity: e.target.value || undefined,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">Select...</option>
                        <option value="VeryLow">&lt;500 Ohm-cm</option>
                        <option value="Low">500-2k Ohm-cm</option>
                        <option value="Medium">2k-10k Ohm-cm</option>
                        <option value="High">&gt;10k Ohm-cm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                        Moisture
                      </label>
                      <select
                        value={globalSpecs?.ecpSoilMoisture || ""}
                        onChange={(e) =>
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            ecpSoilMoisture: e.target.value || undefined,
                          })
                        }
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
                    <span className="ml-1 text-[10px] font-medium text-emerald-600">Temp Auto</span>
                  )}
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Temperature
                    </label>
                    <select
                      value={effectiveEcpTemperature || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpTemperature: e.target.value || undefined,
                        })
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${
                        isEcpTemperatureAutoFilled
                          ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                          : "border border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">Select...</option>
                      <option value="Ambient">Ambient</option>
                      <option value="Elevated">Elevated (60-120C)</option>
                      <option value="High">High (120-200C)</option>
                      <option value="Cyclic">Cyclic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Service Life *
                    </label>
                    <select
                      value={globalSpecs?.ecpServiceLife || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          ecpServiceLife: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="">Select...</option>
                      <option value="Short">&lt;7 years</option>
                      <option value="Medium">7-15 years</option>
                      <option value="Long">15-25 years</option>
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
                                : undefined,
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

              {/* Substrate Type Selection - NEW */}
              <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {effectiveInstallationType === "Buried" ? "5" : "4"}
                  </span>
                  Substrate & Application
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Substrate Type
                    </label>
                    <select
                      value={globalSpecs?.externalSubstrateType || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalSubstrateType: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select...</option>
                      {SUBSTRATE_TYPES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Application Method
                    </label>
                    <select
                      value={globalSpecs?.externalApplicationMethod || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalApplicationMethod: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select...</option>
                      {APPLICATION_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                      Shop/Field
                    </label>
                    <select
                      value={globalSpecs?.externalApplicationLocation || ""}
                      onChange={(e) =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalApplicationLocation: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select...</option>
                      <option value="shop">Shop Applied</option>
                      <option value="field">Field Applied</option>
                      <option value="both">Shop + Field Touch-up</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Recommendation Display */}
              {hasCompleteExternalProfile() && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-green-600"
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
                    <h5 className="text-sm font-bold text-green-900">Recommended Coating System</h5>
                  </div>
                  {(() => {
                    const profile = buildExternalProfile();
                    const damage = classifyExternalDamageMechanisms(profile);
                    const recommendation = recommendExternalCoating(profile, damage);

                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">
                            {recommendation.coating}
                          </span>
                          <span className="text-gray-600 ml-2">
                            ({recommendation.thicknessRange})
                          </span>
                        </div>
                        <div className="text-xs text-gray-700">
                          <strong>System:</strong> {recommendation.system}
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Rationale:</strong> {recommendation.rationale}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalCoatingType: recommendation.coatingType,
                                externalCoatingRecommendation: recommendation as any,
                              })
                            }
                            className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                          >
                            Accept Recommendation
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showExternalCoatingProfile: false,
                                externalCoatingRecommendationRejected: true,
                              })
                            }
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                          >
                            Choose Manually
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Coating Type Selection */}
      {!globalSpecs?.externalCoatingConfirmed && !globalSpecs?.showExternalCoatingProfile && (
        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-gray-700">
            External Coating Type <span className="text-red-500">*</span>
          </label>
          <select
            value={globalSpecs?.externalCoatingType || ""}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalCoatingType: e.target.value || undefined,
              })
            }
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select coating type...</option>
            <option value="Paint">Paint System</option>
            <option value="Galvanized">Hot-Dip Galvanized</option>
            <option value="Rubber Lined">Rubber Coating</option>
            <option value="FBE">Fusion Bonded Epoxy (FBE)</option>
            <option value="3LPE">3-Layer Polyethylene (3LPE)</option>
            <option value="None">None / Bare Steel</option>
          </select>
        </div>
      )}

      {/* Confirmed State */}
      {globalSpecs?.externalCoatingConfirmed && (
        <div className="bg-green-100 border border-green-400 rounded-md p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">
                External Coating: {globalSpecs.externalCoatingType}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                })
              }
              className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
