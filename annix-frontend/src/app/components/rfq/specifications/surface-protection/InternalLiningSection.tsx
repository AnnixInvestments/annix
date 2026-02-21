"use client";

import {
  classifyDamageMechanisms,
  hasCompleteProfile,
  type MaterialTransferProfile,
  recommendLining,
} from "@/app/lib/utils/coatingLiningRecommendations";
import type { InternalLiningSectionProps } from "./types";

export function InternalLiningSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  isUnregisteredCustomer,
  showFeatureRestrictionPopup,
}: InternalLiningSectionProps) {
  const buildMaterialProfile = (): MaterialTransferProfile => ({
    material: {
      particleSize: globalSpecs?.mtpParticleSize as any,
      particleShape: globalSpecs?.mtpParticleShape as any,
      specificGravity: globalSpecs?.mtpSpecificGravity as any,
      hardnessClass: globalSpecs?.mtpHardnessClass as any,
      silicaContent: globalSpecs?.mtpSilicaContent as any,
    },
    chemistry: {
      phRange: globalSpecs?.mtpPhRange as any,
      chlorides: globalSpecs?.mtpChlorides as any,
      temperatureRange: globalSpecs?.mtpTemperatureRange as any,
    },
    flow: {
      solidsPercent: globalSpecs?.mtpSolidsPercent as any,
      velocity: globalSpecs?.mtpVelocity as any,
      impactAngle: globalSpecs?.mtpImpactAngle as any,
    },
    equipment: {
      equipmentType: globalSpecs?.mtpEquipmentType as any,
      impactZones: globalSpecs?.mtpImpactZones,
    },
  });

  const profile = buildMaterialProfile();
  const isProfileComplete = hasCompleteProfile(profile);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-gray-800 mb-2">Internal Lining</h3>

      {globalSpecs?.externalCoatingType === "Galvanized" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Internal lining not available for hot-dip galvanized items</span>
          </div>
        </div>
      ) : (
        <>
          {/* Lining Assistant Toggle */}
          {!globalSpecs?.internalLiningConfirmed && (
            <div className="mb-2">
              <button
                type="button"
                onClick={
                  isUnregisteredCustomer
                    ? showFeatureRestrictionPopup("lining-assistant")
                    : () =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          showMaterialTransferProfile: !globalSpecs?.showMaterialTransferProfile,
                        })
                }
                onMouseEnter={
                  isUnregisteredCustomer
                    ? showFeatureRestrictionPopup("lining-assistant")
                    : undefined
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
                    globalSpecs?.showMaterialTransferProfile ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {globalSpecs?.showMaterialTransferProfile ? "Hide" : "Show"} Lining Assistant
                (ASTM/ISO)
              </button>

              {globalSpecs?.showMaterialTransferProfile && (
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
                    <h4 className="text-sm font-semibold text-indigo-900">
                      Material Transfer Profile
                    </h4>
                  </div>

                  {/* Material Properties */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      Material Properties
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Particle Size
                        </label>
                        <select
                          value={globalSpecs?.mtpParticleSize || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpParticleSize: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Fine">Fine (&lt;0.5mm D50)</option>
                          <option value="Medium">Medium (0.5-2mm)</option>
                          <option value="Coarse">Coarse (2-10mm)</option>
                          <option value="VeryCoarse">Very Coarse (&gt;10mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Particle Shape
                        </label>
                        <select
                          value={globalSpecs?.mtpParticleShape || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpParticleShape: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Rounded">Rounded</option>
                          <option value="SubAngular">Sub-Angular</option>
                          <option value="Angular">Angular</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Material Hardness
                        </label>
                        <select
                          value={globalSpecs?.mtpHardnessClass || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpHardnessClass: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (Mohs &lt;4)</option>
                          <option value="Medium">Medium (Mohs 4-6)</option>
                          <option value="High">High (Mohs &gt;6)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Silica Content
                        </label>
                        <select
                          value={globalSpecs?.mtpSilicaContent || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpSilicaContent: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Moderate">Moderate (20-50%)</option>
                          <option value="High">High (&gt;50%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Specific Gravity
                        </label>
                        <select
                          value={globalSpecs?.mtpSpecificGravity || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpSpecificGravity: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Light">Light (&lt;2.0)</option>
                          <option value="Medium">Medium (2.0-3.5)</option>
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
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          pH Range
                        </label>
                        <select
                          value={globalSpecs?.mtpPhRange || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpPhRange: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Acidic">Acidic (&lt;5)</option>
                          <option value="Neutral">Neutral (5-9)</option>
                          <option value="Alkaline">Alkaline (&gt;9)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Chloride Level
                        </label>
                        <select
                          value={globalSpecs?.mtpChlorides || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpChlorides: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;100ppm)</option>
                          <option value="Moderate">Moderate (100-500)</option>
                          <option value="High">High (&gt;500ppm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Operating Temp
                        </label>
                        <select
                          value={globalSpecs?.mtpTemperatureRange || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpTemperatureRange: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Ambient">Ambient (&lt;40C)</option>
                          <option value="Elevated">Elevated (40-80C)</option>
                          <option value="High">High (&gt;80C)</option>
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
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Flow Velocity
                        </label>
                        <select
                          value={globalSpecs?.mtpVelocity || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpVelocity: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;2 m/s)</option>
                          <option value="Medium">Medium (2-4 m/s)</option>
                          <option value="High">High (&gt;4 m/s)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Impact Angle
                        </label>
                        <select
                          value={globalSpecs?.mtpImpactAngle || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpImpactAngle: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;30 deg)</option>
                          <option value="Mixed">Mixed (30-60 deg)</option>
                          <option value="High">High (&gt;60 deg)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Equipment Type
                        </label>
                        <select
                          value={globalSpecs?.mtpEquipmentType || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpEquipmentType: e.target.value || undefined,
                            })
                          }
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
                        </label>
                        <select
                          value={globalSpecs?.mtpSolidsPercent || ""}
                          onChange={(e) =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              mtpSolidsPercent: e.target.value || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Medium">Medium (20-40%)</option>
                          <option value="High">High (40-60%)</option>
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
                                    : undefined,
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
                  {isProfileComplete && (
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
                        <h5 className="text-sm font-bold text-green-900">
                          Recommended Lining System
                        </h5>
                      </div>
                      {(() => {
                        const damage = classifyDamageMechanisms(profile);
                        const recommendation = recommendLining(profile, damage);

                        return (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-semibold text-gray-900">
                                {recommendation.lining}
                              </span>
                              <span className="text-gray-600 ml-2">
                                ({recommendation.thicknessRange})
                              </span>
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
                                    internalLiningType: recommendation.liningType,
                                    internalLiningRecommendation: recommendation as any,
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
                                    showMaterialTransferProfile: false,
                                    internalLiningRecommendationRejected: true,
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

          {/* Manual Lining Type Selection */}
          {!globalSpecs?.internalLiningConfirmed && !globalSpecs?.showMaterialTransferProfile && (
            <div className="space-y-2">
              <label className="block text-[10px] font-medium text-gray-700">
                Internal Lining Type <span className="text-red-500">*</span>
              </label>
              <select
                value={globalSpecs?.internalLiningType || ""}
                onChange={(e) =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningType: e.target.value || undefined,
                  })
                }
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Select lining type...</option>
                <option value="Rubber Lined">Rubber Lining</option>
                <option value="Ceramic Lined">Ceramic Tile Lining</option>
                <option value="PU Lined">Polyurethane (PU)</option>
                <option value="HDPE Lined">HDPE Lining</option>
                <option value="Epoxy Lined">Epoxy Lining</option>
                <option value="FBE Lined">Fusion Bonded Epoxy</option>
                <option value="Cement Mortar">Cement Mortar</option>
                <option value="Paint">Paint System</option>
                <option value="None">None / Bare Steel</option>
              </select>
            </div>
          )}

          {/* Confirmed State */}
          {globalSpecs?.internalLiningConfirmed && (
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
                    Internal Lining: {globalSpecs.internalLiningType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalLiningConfirmed: false,
                    })
                  }
                  className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
