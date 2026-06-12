import { memo } from "react";
import {
  classifyDamageMechanisms,
  deriveMtpDefaultsFromSlurry,
  hasCompleteProfile,
  type MaterialTransferProfile,
  recommendLining,
} from "@/app/lib/utils/coatingLiningRecommendations";
import { autoFilledClass } from "./helpers";
import type { FeatureType } from "./types";

interface LiningGlobalSpecs {
  mtpParticleSize?: string | null;
  mtpParticleShape?: string | null;
  mtpSpecificGravity?: string | number | null;
  mtpHardnessClass?: string | null;
  mtpSilicaContent?: string | number | null;
  mtpPhRange?: string | null;
  mtpChlorides?: string | null;
  mtpTemperatureRange?: string | null;
  mtpSolidsPercent?: string | number | null;
  mtpVelocity?: string | number | null;
  mtpImpactAngle?: string | null;
  mtpEquipmentType?: string | null;
  mtpImpactZones?: boolean;
  mineSelected?: string | null;
  mineCommodity?: string | null;
  slurryPHMin?: number | null;
  slurryPHMax?: number | null;
  slurrySolidsMin?: number | null;
  slurrySolidsMax?: number | null;
  slurryTempMin?: number | null;
  slurryTempMax?: number | null;
  corrosionRisk?: string | null;
}

interface InternalLiningAssistantProps {
  globalSpecs: LiningGlobalSpecs;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  isUnregisteredCustomer: boolean;
  showMaterialTransferProfile: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
}

const InternalLiningAssistantInner = (props: InternalLiningAssistantProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const isUnregisteredCustomer = props.isUnregisteredCustomer;
  const gsShowMaterialTransferProfile = props.showMaterialTransferProfile;
  const showFeatureRestrictionPopup = props.showFeatureRestrictionPopup;
  const rawMtpParticleSize = globalSpecs?.mtpParticleSize;
  const rawMtpParticleShape = globalSpecs?.mtpParticleShape;
  const rawMtpSpecificGravity = globalSpecs?.mtpSpecificGravity;
  const rawMtpHardnessClass = globalSpecs?.mtpHardnessClass;
  const rawMtpSilicaContent = globalSpecs?.mtpSilicaContent;
  const rawMtpPhRange = globalSpecs?.mtpPhRange;
  const rawMtpChlorides = globalSpecs?.mtpChlorides;
  const rawMtpTemperatureRange = globalSpecs?.mtpTemperatureRange;
  const rawMtpSolidsPercent = globalSpecs?.mtpSolidsPercent;
  const rawMtpVelocity = globalSpecs?.mtpVelocity;
  const rawMtpImpactAngle = globalSpecs?.mtpImpactAngle;
  const rawMtpEquipmentType = globalSpecs?.mtpEquipmentType;

  // Derive Material Transfer Profile defaults from the SA Mine quick-select's slurry intelligence
  const mtpSlurryDefaults = deriveMtpDefaultsFromSlurry(globalSpecs ?? {});
  const derivedMtpParticleSize = mtpSlurryDefaults.particleSize;
  const effectiveMtpParticleSize = rawMtpParticleSize || derivedMtpParticleSize;
  const isMtpParticleSizeAutoFilled = !rawMtpParticleSize && !!derivedMtpParticleSize;
  const derivedMtpParticleShape = mtpSlurryDefaults.particleShape;
  const effectiveMtpParticleShape = rawMtpParticleShape || derivedMtpParticleShape;
  const isMtpParticleShapeAutoFilled = !rawMtpParticleShape && !!derivedMtpParticleShape;
  const derivedMtpHardnessClass = mtpSlurryDefaults.hardnessClass;
  const effectiveMtpHardnessClass = rawMtpHardnessClass || derivedMtpHardnessClass;
  const isMtpHardnessClassAutoFilled = !rawMtpHardnessClass && !!derivedMtpHardnessClass;
  const derivedMtpSilicaContent = mtpSlurryDefaults.silicaContent;
  const effectiveMtpSilicaContent = rawMtpSilicaContent || derivedMtpSilicaContent;
  const isMtpSilicaContentAutoFilled = !rawMtpSilicaContent && !!derivedMtpSilicaContent;
  const derivedMtpSpecificGravity = mtpSlurryDefaults.specificGravity;
  const effectiveMtpSpecificGravity = rawMtpSpecificGravity || derivedMtpSpecificGravity;
  const isMtpSpecificGravityAutoFilled = !rawMtpSpecificGravity && !!derivedMtpSpecificGravity;
  const derivedMtpPhRange = mtpSlurryDefaults.phRange;
  const effectiveMtpPhRange = rawMtpPhRange || derivedMtpPhRange;
  const isMtpPhRangeAutoFilled = !rawMtpPhRange && !!derivedMtpPhRange;
  const derivedMtpChlorides = mtpSlurryDefaults.chlorides;
  const effectiveMtpChlorides = rawMtpChlorides || derivedMtpChlorides;
  const isMtpChloridesAutoFilled = !rawMtpChlorides && !!derivedMtpChlorides;
  const derivedMtpTemperatureRange = mtpSlurryDefaults.temperatureRange;
  const effectiveMtpTemperatureRange = rawMtpTemperatureRange || derivedMtpTemperatureRange;
  const isMtpTemperatureRangeAutoFilled = !rawMtpTemperatureRange && !!derivedMtpTemperatureRange;
  const derivedMtpSolidsPercent = mtpSlurryDefaults.solidsPercent;
  const effectiveMtpSolidsPercent = rawMtpSolidsPercent || derivedMtpSolidsPercent;
  const isMtpSolidsPercentAutoFilled = !rawMtpSolidsPercent && !!derivedMtpSolidsPercent;
  const derivedMtpVelocity = mtpSlurryDefaults.velocity;
  const effectiveMtpVelocity = rawMtpVelocity || derivedMtpVelocity;
  const isMtpVelocityAutoFilled = !rawMtpVelocity && !!derivedMtpVelocity;
  const isMtpFlowAutoFilled = isMtpSolidsPercentAutoFilled || isMtpVelocityAutoFilled;
  const isMtpMaterialAutoFilled =
    isMtpParticleSizeAutoFilled ||
    isMtpParticleShapeAutoFilled ||
    isMtpHardnessClassAutoFilled ||
    isMtpSilicaContentAutoFilled ||
    isMtpSpecificGravityAutoFilled;
  const isMtpChemistryAutoFilled =
    isMtpPhRangeAutoFilled || isMtpChloridesAutoFilled || isMtpTemperatureRangeAutoFilled;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={
          isUnregisteredCustomer
            ? showFeatureRestrictionPopup("lining-assistant")
            : () =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showMaterialTransferProfile: !gsShowMaterialTransferProfile,
                })
        }
        onMouseEnter={
          isUnregisteredCustomer ? showFeatureRestrictionPopup("lining-assistant") : undefined
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
          className={`w-3 h-3 transition-transform ${gsShowMaterialTransferProfile ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {gsShowMaterialTransferProfile ? "Hide" : "Show"} Lining Assistant (ASTM/ISO)
      </button>

      {gsShowMaterialTransferProfile && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h4 className="text-sm font-semibold text-indigo-900">Material Transfer Profile</h4>
          </div>

          {/* Material Properties */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              Material Properties
              {isMtpMaterialAutoFilled && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  ✓ Auto-filled from Mine Selection
                </span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Particle Size
                  {isMtpParticleSizeAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpParticleSize || ""}
                  onChange={(e) => {
                    const rawValue27 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpParticleSize: rawValue27 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpParticleSizeAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Fine">Fine (&lt;0.5mm D50)</option>
                  <option value="Medium">Medium (0.5–2mm)</option>
                  <option value="Coarse">Coarse (2–10mm)</option>
                  <option value="VeryCoarse">Very Coarse (&gt;10mm)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Particle Shape
                  {isMtpParticleShapeAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpParticleShape || ""}
                  onChange={(e) => {
                    const rawValue28 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpParticleShape: rawValue28 || null,
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 ${autoFilledClass(isMtpParticleShapeAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Rounded">Rounded</option>
                  <option value="SubAngular">Sub-Angular</option>
                  <option value="Angular">Angular</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Material Hardness
                  {isMtpHardnessClassAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpHardnessClass || ""}
                  onChange={(e) => {
                    const rawValue29 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpHardnessClass: rawValue29 || null,
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 ${autoFilledClass(isMtpHardnessClassAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (Mohs &lt;4)</option>
                  <option value="Medium">Medium (Mohs 4–6)</option>
                  <option value="High">High (Mohs &gt;6)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Silica Content
                  {isMtpSilicaContentAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpSilicaContent || ""}
                  onChange={(e) => {
                    const rawValue30 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpSilicaContent: rawValue30 || null,
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 ${autoFilledClass(isMtpSilicaContentAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (&lt;20%)</option>
                  <option value="Moderate">Moderate (20–50%)</option>
                  <option value="High">High (&gt;50%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Specific Gravity
                  {isMtpSpecificGravityAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpSpecificGravity || ""}
                  onChange={(e) => {
                    const rawValue31 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpSpecificGravity: rawValue31 || null,
                    });
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 ${autoFilledClass(isMtpSpecificGravityAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Light">Light (&lt;2.0)</option>
                  <option value="Medium">Medium (2.0–3.5)</option>
                  <option value="Heavy">Heavy (&gt;3.5)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chemical Environment */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Chemical Environment
              {isMtpChemistryAutoFilled && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  ✓ Auto-filled from Mine Selection
                </span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  pH Range
                  {isMtpPhRangeAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                </label>
                <select
                  value={effectiveMtpPhRange || ""}
                  onChange={(e) => {
                    const rawValue32 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpPhRange: rawValue32 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpPhRangeAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Acidic">Acidic (&lt;5)</option>
                  <option value="Neutral">Neutral (5–9)</option>
                  <option value="Alkaline">Alkaline (&gt;9)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Chloride Level
                  {isMtpChloridesAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpChlorides || ""}
                  onChange={(e) => {
                    const rawValue33 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpChlorides: rawValue33 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpChloridesAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (&lt;100ppm)</option>
                  <option value="Moderate">Moderate (100–500)</option>
                  <option value="High">High (&gt;500ppm)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Operating Temp
                  {isMtpTemperatureRangeAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpTemperatureRange || ""}
                  onChange={(e) => {
                    const rawValue34 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpTemperatureRange: rawValue34 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpTemperatureRangeAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Ambient">Ambient (&lt;40°C)</option>
                  <option value="Elevated">Elevated (40–80°C)</option>
                  <option value="High">High (&gt;80°C)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flow & Equipment */}
          <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              Flow & Equipment
              {isMtpFlowAutoFilled && (
                <span className="ml-2 text-xs font-medium text-emerald-600">
                  ✓ Auto-filled from Mine Selection
                </span>
              )}
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Flow Velocity
                  {isMtpVelocityAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                </label>
                <select
                  value={effectiveMtpVelocity || ""}
                  onChange={(e) => {
                    const rawValue35 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpVelocity: rawValue35 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpVelocityAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (&lt;2 m/s)</option>
                  <option value="Medium">Medium (2–4 m/s)</option>
                  <option value="High">High (&gt;4 m/s)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Impact Angle
                </label>
                <select
                  value={rawMtpImpactAngle || ""}
                  onChange={(e) => {
                    const rawValue36 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpImpactAngle: rawValue36 || null,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (&lt;30°)</option>
                  <option value="Mixed">Mixed (30–60°)</option>
                  <option value="High">High (&gt;60°)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Equipment Type
                </label>
                <select
                  value={rawMtpEquipmentType || ""}
                  onChange={(e) => {
                    const rawValue37 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpEquipmentType: rawValue37 || null,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="Pipe">Pipe</option>
                  <option value="Tank">Tank</option>
                  <option value="Chute">Chute</option>
                  <option value="Hopper">Hopper</option>
                  <option value="Launder">Launder</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Solids Conc.
                  {isMtpSolidsPercentAutoFilled && (
                    <span className="ml-1 text-emerald-600">(Auto)</span>
                  )}
                </label>
                <select
                  value={effectiveMtpSolidsPercent || ""}
                  onChange={(e) => {
                    const rawValue38 = e.target.value;

                    return onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpSolidsPercent: rawValue38 || null,
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-indigo-500 ${autoFilledClass(isMtpSolidsPercentAutoFilled)}`}
                >
                  <option value="">Select...</option>
                  <option value="Low">Low (&lt;20%)</option>
                  <option value="Medium">Medium (20–40%)</option>
                  <option value="High">High (40–60%)</option>
                  <option value="VeryHigh">Very High (&gt;60%)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Impact Zones?
                </label>
                <select
                  value={
                    globalSpecs?.mtpImpactZones === true
                      ? "true"
                      : globalSpecs?.mtpImpactZones === false
                        ? "false"
                        : ""
                  }
                  onChange={(e) =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      mtpImpactZones:
                        e.target.value === "true"
                          ? true
                          : e.target.value === "false"
                            ? false
                            : null,
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes (bends, drops)</option>
                  <option value="false">No (straight only)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recommendation Display */}
          {(() => {
            const profile: MaterialTransferProfile = {
              material: {
                particleSize: effectiveMtpParticleSize as any,
                particleShape: effectiveMtpParticleShape as any,
                specificGravity: effectiveMtpSpecificGravity as any,
                hardnessClass: effectiveMtpHardnessClass as any,
                silicaContent: effectiveMtpSilicaContent as any,
              },
              chemistry: {
                phRange: effectiveMtpPhRange as any,
                chlorides: effectiveMtpChlorides as any,
                temperatureRange: effectiveMtpTemperatureRange as any,
              },
              flow: {
                solidsPercent: effectiveMtpSolidsPercent as any,
                velocity: effectiveMtpVelocity as any,
                impactAngle: globalSpecs?.mtpImpactAngle as any,
              },
              equipment: {
                equipmentType: globalSpecs?.mtpEquipmentType as any,
                impactZones: globalSpecs?.mtpImpactZones,
              },
            };

            if (!hasCompleteProfile(profile)) {
              return (
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Complete the required fields above to receive a lining recommendation.
                  </p>
                </div>
              );
            }

            const damage = classifyDamageMechanisms(profile);
            const recommendation = recommendLining(profile, damage);

            return (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-300">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-6 h-6 text-emerald-600"
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
                  <h5 className="text-md font-bold text-emerald-900">Recommended Lining</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Lining Type</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {recommendation.lining}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {recommendation.thicknessRange}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Dominant Mechanism</div>
                    <div className="text-md font-semibold text-gray-800">
                      {damage.dominantMechanism}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${damage.abrasion === "Severe" ? "bg-red-100 text-red-700" : damage.abrasion === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                      >
                        Abrasion: {damage.abrasion}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${damage.impact === "Severe" ? "bg-red-100 text-red-700" : damage.impact === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                      >
                        Impact: {damage.impact}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">Rationale</div>
                  <p className="text-sm text-gray-700">{recommendation.rationale}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Applicable Standards</div>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.standardsBasis.map((std, i) => (
                      <span
                        key={i}
                        className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium"
                      >
                        {std}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Engineering Notes</div>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {recommendation.engineeringNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalLiningType: recommendation.liningType,
                    })
                  }
                  className="w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Apply Recommendation: {recommendation.liningType}
                </button>

                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Engineering Disclaimer:</strong> Lining recommendations are indicative
                    and based on generalized abrasion, impact, and corrosion models aligned with
                    ASTM and ISO test standards. They do not replace site-specific trials,
                    operational history, or manufacturer design verification.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export const InternalLiningAssistant = memo(InternalLiningAssistantInner);
