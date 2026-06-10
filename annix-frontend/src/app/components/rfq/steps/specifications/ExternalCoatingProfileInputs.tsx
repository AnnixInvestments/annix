import { memo } from "react";
import type { ExternalCoatingAssistantProps } from "./external-coating-types";
import { autoFilledClass } from "./helpers";

const ExternalCoatingProfileInputsInner = (props: ExternalCoatingAssistantProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
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
  const rawEcpServiceLife = props.rawEcpServiceLife;
  const rawEcpSoilMoisture = props.rawEcpSoilMoisture;
  const rawEcpSoilResistivity = props.rawEcpSoilResistivity;
  const rawEcpSoilType = props.rawEcpSoilType;
  return (
    <>
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
              {isMechanicalRiskAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
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
              {isMarineInfluenceAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
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
              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Moisture</label>
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
                    e.target.value === "true" ? true : e.target.value === "false" ? false : null,
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
    </>
  );
};

export const ExternalCoatingProfileInputs = memo(ExternalCoatingProfileInputsInner);
