import { memo } from "react";
import { nowISO } from "@/app/lib/datetime";
import {
  classifyExternalDamageMechanisms,
  type ExternalEnvironmentProfile,
  hasCompleteExternalProfile,
  recommendExternalCoating,
} from "@/app/lib/utils/coatingLiningRecommendations";
import type { ExternalCoatingAssistantProps } from "./external-coating-types";

const ExternalCoatingRecommendationInner = (props: ExternalCoatingAssistantProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const gsWorkingTemperatureC = props.gsWorkingTemperatureC;
  const effectiveEcpTemperature = props.effectiveEcpTemperature;
  const effectiveIndustrialPollution = props.effectiveIndustrialPollution;
  const effectiveInstallationType = props.effectiveInstallationType;
  const effectiveIso12944 = props.effectiveIso12944;
  const effectiveMarineInfluence = props.effectiveMarineInfluence;
  const effectiveMechanicalRisk = props.effectiveMechanicalRisk;
  const effectiveUvExposure = props.effectiveUvExposure;
  const isEcpTemperatureAutoFilled = props.isEcpTemperatureAutoFilled;
  const iso12944Systems = props.iso12944Systems;
  const iso12944Loading = props.iso12944Loading;
  const selectedIso12944System = props.selectedIso12944System;
  const selectedIso12944SystemCode = props.selectedIso12944SystemCode;
  const setSelectedIso12944SystemCode = props.setSelectedIso12944SystemCode;
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
          <div className="text-xs font-bold text-emerald-800">{recommendation.coating}</div>
        </div>
        <div className="bg-white rounded p-1.5 border border-emerald-200">
          <div className="text-[10px] font-medium text-gray-500">System</div>
          <div className="text-[10px] text-gray-700">{recommendation.system}</div>
        </div>
        <div className="bg-white rounded p-1.5 border border-emerald-200">
          <div className="text-[10px] font-medium text-gray-500">Thickness</div>
          <div className="text-xs font-semibold text-gray-800">{recommendation.thicknessRange}</div>
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
          <p className="text-[10px] text-gray-700 line-clamp-2">{recommendation.rationale}</p>
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
                    <div className="text-[9px] font-medium text-gray-500">System Code</div>
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
                    <div className="text-[9px] font-medium text-gray-500">System Description</div>
                    <div className="text-[10px] text-gray-700">{selectedIso12944System.system}</div>
                  </div>
                  <div className="bg-white rounded p-1.5 border border-blue-200">
                    <div className="text-[9px] font-medium text-gray-500">Coats / Primer DFT</div>
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
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Topcoat</label>
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
                            localStorage.setItem("customTopcoatColours", JSON.stringify(existing));
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
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 1</label>
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
                            localStorage.setItem("customBandColours", JSON.stringify(existing));
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
              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 2</label>
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
                              localStorage.setItem("customBandColours", JSON.stringify(existing));
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
                recommendation.coatingType === "Galvanized" ? null : "SA 2.5 (ISO 8501-1)",
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
          Recommendations based on ISO 12944/21809. Does not replace project-specific assessments or
          qualified inspector verification.
        </p>
      </details>
    </div>
  );
};

export const ExternalCoatingRecommendation = memo(ExternalCoatingRecommendationInner);
