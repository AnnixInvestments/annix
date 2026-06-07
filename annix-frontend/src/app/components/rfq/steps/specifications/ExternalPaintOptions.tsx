import { memo } from "react";
import { ExternalPaintConfirmed } from "./ExternalPaintConfirmed";

interface PaintGlobalSpecs {
  externalBlastingGrade?: string | null;
  externalPrimerType?: string | null;
  externalPrimerMicrons?: number | null;
  externalIntermediateType?: string | null;
  externalIntermediateMicrons?: number | null;
  externalTopcoatType?: string | null;
  externalTopcoatMicrons?: number | null;
  externalTopcoatColour?: string | null;
  customColourInput?: string | null;
  externalBand1Colour?: string | null;
  customBand1Input?: string | null;
  externalBand2Colour?: string | null;
  customBand2Input?: string | null;
  showCustomColourInput?: boolean;
  showCustomBand1Input?: boolean;
  showCustomBand2Input?: boolean;
  externalPaintSpecConfirmed?: boolean;
}

interface ExternalPaintOptionsProps {
  globalSpecs: PaintGlobalSpecs;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
}

const ExternalPaintOptionsInner = (props: ExternalPaintOptionsProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const rawExternalBlastingGrade2 = globalSpecs?.externalBlastingGrade;
  const rawExternalPrimerType = globalSpecs?.externalPrimerType;
  const rawExternalPrimerMicrons2 = globalSpecs?.externalPrimerMicrons;
  const rawExternalIntermediateType = globalSpecs?.externalIntermediateType;
  const rawExternalIntermediateMicrons2 = globalSpecs?.externalIntermediateMicrons;
  const rawExternalTopcoatType = globalSpecs?.externalTopcoatType;
  const rawExternalTopcoatMicrons2 = globalSpecs?.externalTopcoatMicrons;
  const rawExternalTopcoatColour3 = globalSpecs?.externalTopcoatColour;
  const rawCustomColourInput = globalSpecs?.customColourInput;
  const rawExternalBand1Colour2 = globalSpecs?.externalBand1Colour;
  const rawCustomBand1Input = globalSpecs?.customBand1Input;
  const rawExternalBand2Colour2 = globalSpecs?.externalBand2Colour;
  const rawCustomBand2Input = globalSpecs?.customBand2Input;
  const rawExternalBlastingGrade3 = globalSpecs?.externalBlastingGrade;
  const rawExternalTopcoatColour4 = globalSpecs?.externalTopcoatColour;
  const rawExternalBand1Colour3 = globalSpecs?.externalBand1Colour;
  const rawExternalBand2Colour3 = globalSpecs?.externalBand2Colour;
  const rawExternalPrimerMicrons3 = globalSpecs?.externalPrimerMicrons;
  const rawExternalIntermediateMicrons3 = globalSpecs?.externalIntermediateMicrons;
  const rawExternalTopcoatMicrons3 = globalSpecs?.externalTopcoatMicrons;
  const rawExternalBlastingGrade4 = globalSpecs?.externalBlastingGrade;
  const rawExternalTopcoatColour5 = globalSpecs?.externalTopcoatColour;
  const rawExternalBand1Colour4 = globalSpecs?.externalBand1Colour;
  const rawExternalBand2Colour4 = globalSpecs?.externalBand2Colour;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">External Paint Specifications</h4>

      {/* Surface Preparation + Primer in one row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Blasting Grade</label>
          <select
            value={rawExternalBlastingGrade2 || ""}
            onChange={(e) => {
              const rawValue20 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                externalBlastingGrade: rawValue20 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="SA 1 (ISO 8501-1)">SA 1 - Light</option>
            <option value="SA 2 (ISO 8501-1)">SA 2 - Thorough</option>
            <option value="SA 2.5 (ISO 8501-1)">SA 2.5 - Very Thorough</option>
            <option value="SA 3 (ISO 8501-1)">SA 3 - Visually Clean</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
          <select
            value={rawExternalPrimerType || ""}
            onChange={(e) => {
              const rawValue21 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                externalPrimerType: rawValue21 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select...</option>
            <option value="Inorganic Zinc Silicate">Inorganic Zinc</option>
            <option value="Organic Zinc Epoxy">Organic Zinc Epoxy</option>
            <option value="Zinc Phosphate Epoxy">Zinc Phosphate</option>
            <option value="Epoxy Primer">Epoxy</option>
            <option value="Polyurethane Primer">Polyurethane</option>
            <option value="Red Oxide Primer">Red Oxide</option>
            <option value="Alkyd Primer">Alkyd</option>
            <option value="Shop Primer">Shop Primer</option>
            <option value="Etch Primer">Etch Primer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
          <input
            type="number"
            value={rawExternalPrimerMicrons2 || ""}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalPrimerMicrons: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="50-75"
            min="0"
            max="500"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Optional Intermediate Coat */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Intermediate Coat
          </label>
          <select
            value={rawExternalIntermediateType || ""}
            onChange={(e) => {
              const rawValue22 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                externalIntermediateType: rawValue22 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">None</option>
            <option value="MIO Epoxy (Micaceous Iron Oxide)">MIO Epoxy</option>
            <option value="Glass Flake Epoxy">Glass Flake Epoxy</option>
            <option value="High Build Epoxy">High Build Epoxy</option>
            <option value="Epoxy Polyamide">Epoxy Polyamide</option>
            <option value="Epoxy Phenalkamine">Epoxy Phenalkamine</option>
          </select>
        </div>

        {globalSpecs?.externalIntermediateType && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Intermediate (μm)
            </label>
            <input
              type="number"
              value={rawExternalIntermediateMicrons2 || ""}
              onChange={(e) =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalIntermediateMicrons: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="125-200"
              min="0"
              max="500"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
          </div>
        )}
      </div>

      {/* Topcoat / Finish Coat */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat Type</label>
          <select
            value={rawExternalTopcoatType || ""}
            onChange={(e) => {
              const rawValue23 = e.target.value;

              return onUpdateGlobalSpecs({
                ...globalSpecs,
                externalTopcoatType: rawValue23 || null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">None (No topcoat)</option>
            <option value="Aliphatic Polyurethane">Aliphatic Polyurethane</option>
            <option value="Acrylic Polyurethane">Acrylic Polyurethane</option>
            <option value="Polysiloxane">Polysiloxane</option>
            <option value="Epoxy Topcoat">Epoxy Topcoat</option>
            <option value="Alkyd Topcoat">Alkyd Topcoat</option>
            <option value="Acrylic Topcoat">Acrylic Topcoat</option>
          </select>
        </div>

        {globalSpecs?.externalTopcoatType && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
              <input
                type="number"
                value={rawExternalTopcoatMicrons2 || ""}
                onChange={(e) =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalTopcoatMicrons: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="50-75"
                min="0"
                max="500"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Final Coat Colour
              </label>
              {!globalSpecs?.showCustomColourInput ? (
                <select
                  value={rawExternalTopcoatColour3 || ""}
                  onChange={(e) => {
                    if (e.target.value === "__ADD_CUSTOM__") {
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        showCustomColourInput: true,
                      });
                    } else {
                      const rawValue24 = e.target.value;
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalTopcoatColour: rawValue24 || null,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select colour...</option>
                  <optgroup label="SA Mining Standard Colours">
                    <option value="Safety Yellow (RAL 1003)">Safety Yellow (RAL 1003)</option>
                    <option value="Safety Orange (RAL 2009)">Safety Orange (RAL 2009)</option>
                    <option value="Safety Red (RAL 3001)">Safety Red (RAL 3001)</option>
                    <option value="Safety Green (RAL 6024)">Safety Green (RAL 6024)</option>
                    <option value="Signal Blue (RAL 5005)">Signal Blue (RAL 5005)</option>
                    <option value="White (RAL 9003)">White (RAL 9003)</option>
                    <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                    <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                  </optgroup>
                  <optgroup label="Pipeline Identification (SABS 0140)">
                    <option value="Water - Blue (RAL 5015)">Water - Blue (RAL 5015)</option>
                    <option value="Steam - Silver Grey (RAL 7001)">
                      Steam - Silver Grey (RAL 7001)
                    </option>
                    <option value="Air - Light Blue (RAL 5012)">Air - Light Blue (RAL 5012)</option>
                    <option value="Gas - Yellow Ochre (RAL 1024)">
                      Gas - Yellow Ochre (RAL 1024)
                    </option>
                    <option value="Acids - Orange (RAL 2000)">Acids - Orange (RAL 2000)</option>
                    <option value="Alkalis - Violet (RAL 4001)">Alkalis - Violet (RAL 4001)</option>
                    <option value="Oil - Brown (RAL 8001)">Oil - Brown (RAL 8001)</option>
                    <option value="Fire Services - Red (RAL 3000)">
                      Fire Services - Red (RAL 3000)
                    </option>
                    <option value="Slurry - Black (RAL 9005)">Slurry - Black (RAL 9005)</option>
                  </optgroup>
                  <optgroup label="Common Mine Colours">
                    <option value="Anglo American Blue">Anglo American Blue</option>
                    <option value="Sasol Blue">Sasol Blue</option>
                    <option value="Exxaro Green">Exxaro Green</option>
                    <option value="Harmony Gold">Harmony Gold</option>
                    <option value="Sibanye Silver">Sibanye Silver</option>
                    <option value="Impala Platinum Grey">Impala Platinum Grey</option>
                    <option value="Kumba Iron Ore Red">Kumba Iron Ore Red</option>
                  </optgroup>
                  {/* Custom colours from localStorage */}
                  {(() => {
                    try {
                      const customColours = JSON.parse(
                        localStorage.getItem("customTopcoatColours") || "[]",
                      );
                      if (customColours.length > 0) {
                        return (
                          <optgroup label="Custom Colours">
                            {customColours.map((colour: string, idx: number) => (
                              <option key={idx} value={colour}>
                                {colour}
                              </option>
                            ))}
                          </optgroup>
                        );
                      }
                    } catch (e) {
                      // Ignore localStorage errors
                    }
                    return null;
                  })()}
                  <optgroup label="Other">
                    <option value="__ADD_CUSTOM__">+ Add Custom Colour...</option>
                  </optgroup>
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rawCustomColourInput || ""}
                    onChange={(e) =>
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        customColourInput: e.target.value,
                      })
                    }
                    placeholder="Enter colour (e.g., Mine Blue RAL 5010)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newColour = globalSpecs?.customColourInput?.trim();
                        if (newColour) {
                          // Save to localStorage
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
                          } catch (e) {
                            // Ignore localStorage errors
                          }
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            externalTopcoatColour: newColour,
                            showCustomColourInput: false,
                            customColourInput: null,
                          });
                        }
                      }}
                      disabled={!globalSpecs?.customColourInput?.trim()}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Colour
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          showCustomColourInput: false,
                          customColourInput: null,
                        })
                      }
                      className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Band Colours Row */}
      {globalSpecs?.externalTopcoatType && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Band 1 Colour */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Band 1 <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {!globalSpecs?.showCustomBand1Input ? (
              <select
                value={rawExternalBand1Colour2 || ""}
                onChange={(e) => {
                  if (e.target.value === "__ADD_CUSTOM__") {
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      showCustomBand1Input: true,
                    });
                  } else {
                    const rawValue25 = e.target.value;
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalBand1Colour: rawValue25 || null,
                      ...(e.target.value ? {} : { externalBand2Colour: null }),
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                <option value="">No band required</option>
                <optgroup label="Add Your Own">
                  <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                </optgroup>
                {/* Custom band colours from localStorage */}
                {(() => {
                  try {
                    const customColours = JSON.parse(
                      localStorage.getItem("customBandColours") || "[]",
                    );
                    if (customColours.length > 0) {
                      return (
                        <optgroup label="Saved Custom Colours">
                          {customColours.map((colour: string, idx: number) => (
                            <option key={idx} value={colour}>
                              {colour}
                            </option>
                          ))}
                        </optgroup>
                      );
                    }
                  } catch {
                    console.warn("Failed to load custom band colours");
                  }
                  return null;
                })()}
                <optgroup label="Common Band Colours">
                  <option value="White (RAL 9003)">White (RAL 9003)</option>
                  <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                  <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                  <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                  <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                  <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                  <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                  <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                </optgroup>
                <optgroup label="Safety & Warning Bands">
                  <option value="Safety Yellow Band">Safety Yellow Band</option>
                  <option value="Caution Orange Band">Caution Orange Band</option>
                  <option value="Danger Red Band">Danger Red Band</option>
                  <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                </optgroup>
                <optgroup label="Pipeline Identification Bands">
                  <option value="Water Identification Blue">Water Identification Blue</option>
                  <option value="Steam Grey Band">Steam Grey Band</option>
                  <option value="Gas Yellow Band">Gas Yellow Band</option>
                  <option value="Fire Red Band">Fire Red Band</option>
                  <option value="Slurry Black Band">Slurry Black Band</option>
                </optgroup>
              </select>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  value={rawCustomBand1Input || ""}
                  onChange={(e) =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      customBand1Input: e.target.value,
                    })
                  }
                  placeholder="Enter band colour"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newColour = globalSpecs?.customBand1Input?.trim();
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
                          externalBand1Colour: newColour,
                          showCustomBand1Input: false,
                          customBand1Input: null,
                        });
                      }
                    }}
                    disabled={!globalSpecs?.customBand1Input?.trim()}
                    className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        showCustomBand1Input: false,
                        customBand1Input: null,
                      })
                    }
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Band 2 Colour */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Band 2 <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {!globalSpecs?.showCustomBand2Input ? (
              <select
                value={rawExternalBand2Colour2 || ""}
                onChange={(e) => {
                  if (e.target.value === "__ADD_CUSTOM__") {
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      showCustomBand2Input: true,
                    });
                  } else {
                    const rawValue26 = e.target.value;
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalBand2Colour: rawValue26 || null,
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                disabled={!globalSpecs?.externalBand1Colour}
              >
                <option value="">No second band required</option>
                <optgroup label="Add Your Own">
                  <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                </optgroup>
                {/* Custom band colours from localStorage */}
                {(() => {
                  try {
                    const customColours = JSON.parse(
                      localStorage.getItem("customBandColours") || "[]",
                    );
                    if (customColours.length > 0) {
                      return (
                        <optgroup label="Saved Custom Colours">
                          {customColours.map((colour: string, idx: number) => (
                            <option key={idx} value={colour}>
                              {colour}
                            </option>
                          ))}
                        </optgroup>
                      );
                    }
                  } catch {
                    console.warn("Failed to load custom band colours");
                  }
                  return null;
                })()}
                <optgroup label="Common Band Colours">
                  <option value="White (RAL 9003)">White (RAL 9003)</option>
                  <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                  <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                  <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                  <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                  <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                  <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                  <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                </optgroup>
                <optgroup label="Safety & Warning Bands">
                  <option value="Safety Yellow Band">Safety Yellow Band</option>
                  <option value="Caution Orange Band">Caution Orange Band</option>
                  <option value="Danger Red Band">Danger Red Band</option>
                  <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                </optgroup>
                <optgroup label="Pipeline Identification Bands">
                  <option value="Water Identification Blue">Water Identification Blue</option>
                  <option value="Steam Grey Band">Steam Grey Band</option>
                  <option value="Gas Yellow Band">Gas Yellow Band</option>
                  <option value="Fire Red Band">Fire Red Band</option>
                  <option value="Slurry Black Band">Slurry Black Band</option>
                </optgroup>
              </select>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  value={rawCustomBand2Input || ""}
                  onChange={(e) =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      customBand2Input: e.target.value,
                    })
                  }
                  placeholder="Enter band colour"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newColour = globalSpecs?.customBand2Input?.trim();
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
                          externalBand2Colour: newColour,
                          showCustomBand2Input: false,
                          customBand2Input: null,
                        });
                      }
                    }}
                    disabled={!globalSpecs?.customBand2Input?.trim()}
                    className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        showCustomBand2Input: false,
                        customBand2Input: null,
                      })
                    }
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paint Specification Summary - shows when primer is selected */}
      {globalSpecs?.externalPrimerType &&
        globalSpecs?.externalPrimerMicrons &&
        !globalSpecs?.externalPaintSpecConfirmed && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                External Paint Specification (Review)
              </h4>

              <div className="space-y-1 text-xs">
                {/* Surface Preparation / Blasting - Always show */}
                <div className="flex justify-between items-center">
                  <span className="text-amber-700">
                    <span className="font-medium">Surface Prep:</span>{" "}
                    {rawExternalBlastingGrade3 || (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-amber-700">
                    <span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}
                  </span>
                  <span className="font-semibold text-amber-800">
                    {globalSpecs.externalPrimerMicrons} μm
                  </span>
                </div>

                {globalSpecs?.externalIntermediateType &&
                  globalSpecs?.externalIntermediateMicrons && (
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700">
                        <span className="font-medium">Intermediate:</span>{" "}
                        {globalSpecs.externalIntermediateType}
                      </span>
                      <span className="font-semibold text-amber-800">
                        {globalSpecs.externalIntermediateMicrons} μm
                      </span>
                    </div>
                  )}

                {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700">
                      <span className="font-medium">Topcoat:</span>{" "}
                      {globalSpecs.externalTopcoatType}
                    </span>
                    <span className="font-semibold text-amber-800">
                      {globalSpecs.externalTopcoatMicrons} μm
                    </span>
                  </div>
                )}

                {globalSpecs?.externalTopcoatType && (
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700">
                      <span className="font-medium">Colour:</span>{" "}
                      {rawExternalTopcoatColour4 || (
                        <span className="text-gray-400 italic">Not specified</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="flex gap-6 items-center">
                  <span className="text-amber-700">
                    <span className="font-medium">Band 1:</span>{" "}
                    {rawExternalBand1Colour3 || <span className="text-gray-400 italic">None</span>}
                  </span>
                  <span className="text-amber-700">
                    <span className="font-medium">Band 2:</span>{" "}
                    {rawExternalBand2Colour3 || <span className="text-gray-400 italic">None</span>}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 mt-1 border-t border-amber-300">
                  <span className="font-semibold text-amber-800">Total DFT</span>
                  <span className="font-bold text-amber-900">
                    {(rawExternalPrimerMicrons3 || 0) +
                      (rawExternalIntermediateMicrons3 || 0) +
                      (rawExternalTopcoatMicrons3 || 0)}{" "}
                    μm
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalPaintSpecConfirmed: true,
                      externalCoatingConfirmed: true,
                    })
                  }
                  className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 text-xs flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm & Lock
                </button>
              </div>
            </div>
          </div>
        )}

      {globalSpecs?.externalPaintSpecConfirmed && globalSpecs?.externalPrimerType && (
        <ExternalPaintConfirmed
          blastingGrade={rawExternalBlastingGrade4}
          primerType={globalSpecs.externalPrimerType as string}
          primerMicrons={globalSpecs.externalPrimerMicrons as number}
          intermediateType={globalSpecs?.externalIntermediateType}
          intermediateMicrons={globalSpecs?.externalIntermediateMicrons}
          topcoatType={globalSpecs?.externalTopcoatType}
          topcoatMicrons={globalSpecs?.externalTopcoatMicrons}
          topcoatColour={rawExternalTopcoatColour5}
          band1Colour={rawExternalBand1Colour4}
          band2Colour={rawExternalBand2Colour4}
          onEdit={() =>
            onUpdateGlobalSpecs({
              ...globalSpecs,
              externalPaintSpecConfirmed: false,
              externalCoatingConfirmed: false,
            })
          }
        />
      )}
    </div>
  );
};

export const ExternalPaintOptions = memo(ExternalPaintOptionsInner);
