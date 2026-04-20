"use client";

import { currencyByCode } from "@/app/lib/currencies";
import type { ExtractedSpecs, PricingInputs } from "../lib/types";

interface PricingInputsSectionProps {
  extractedSpecs: ExtractedSpecs;
  pricingInputs: PricingInputs;
  onPricingInputChange: (
    category:
      | "steelSpecs"
      | "weldTypes"
      | "flangeTypes"
      | "bnwTypes"
      | "valveTypes"
      | "instrumentTypes",
    key: string,
    value: number,
  ) => void;
  onPercentageChange: (
    field: "labourExtrasPercent" | "contingenciesPercent",
    value: number,
  ) => void;
  currencyCode: string;
}

function PricingInputsSection(props: PricingInputsSectionProps) {
  const extractedSpecs = props.extractedSpecs;
  const pricingInputs = props.pricingInputs;
  const onPricingInputChange = props.onPricingInputChange;
  const onPercentageChange = props.onPercentageChange;
  const currencyCode = props.currencyCode;

  const currency = currencyByCode(currencyCode);
  const symbolFromCurrency = currency?.symbol;
  const currencySymbol = symbolFromCurrency ? symbolFromCurrency : currencyCode;

  const flangeWeldInputValue = pricingInputs.weldTypes["flangeWeld"];
  const mitreWeldInputValue = pricingInputs.weldTypes["mitreWeld"];
  const teeWeldInputValue = pricingInputs.weldTypes["teeWeld"];
  const gussetTeeWeldInputValue = pricingInputs.weldTypes["gussetTeeWeld"];
  const latWeld45PlusInputValue = pricingInputs.weldTypes["latWeld45Plus"];
  const latWeldUnder45InputValue = pricingInputs.weldTypes["latWeldUnder45"];
  const tackWeldInputValue = pricingInputs.weldTypes["tackWeld"];
  const slipOnFlangeInputValue = pricingInputs.flangeTypes["slipOn"];
  const rotatingFlangeInputValue = pricingInputs.flangeTypes["rotating"];
  const blankFlangeInputValue = pricingInputs.flangeTypes["blank"];
  const boltsInputValue = pricingInputs.bnwTypes["bolts"];
  const nutsInputValue = pricingInputs.bnwTypes["nuts"];
  const washersInputValue = pricingInputs.bnwTypes["washers"];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 w-full">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Inputs</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your prices below and the BOQ item unit prices will be automatically calculated based
        on weight.
      </p>

      <div className="flex flex-wrap gap-6 w-full [&>div]:flex-1 [&>div]:min-w-[200px]">
        {/* Steel Specifications */}
        <div className="space-y-3 min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
            Steel Specifications (Price/kg)
          </h3>
          {extractedSpecs.steelSpecs.length > 0
            ? extractedSpecs.steelSpecs.map((spec) => {
                const steelValue = pricingInputs.steelSpecs[spec];
                return (
                  <div key={spec} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 flex-1 min-w-0 truncate" title={spec}>
                      {spec}
                    </label>
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={steelValue ? steelValue : ""}
                        onChange={(e) =>
                          onPricingInputChange("steelSpecs", spec, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-gray-500 ml-1">/Kg</span>
                    </div>
                  </div>
                );
              })
            : (() => {
                const steelGeneral = pricingInputs.steelSpecs["Steel"];
                return (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 flex-1">Steel (General)</label>
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={steelGeneral ? steelGeneral : ""}
                        onChange={(e) =>
                          onPricingInputChange(
                            "steelSpecs",
                            "Steel",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                        className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-gray-500 ml-1">/Kg</span>
                    </div>
                  </div>
                );
              })()}
        </div>

        {(() => {
          const rawFlangeWeld = extractedSpecs.weldTypes.flangeWeld;
          const rawMitreWeld = extractedSpecs.weldTypes.mitreWeld;
          const rawTeeWeld = extractedSpecs.weldTypes.teeWeld;
          const rawTackWeld = extractedSpecs.weldTypes.tackWeld;
          const hasAnyWeldType = rawFlangeWeld || rawMitreWeld || rawTeeWeld || rawTackWeld;
          if (!hasAnyWeldType) return null;
          return (
            <div className="space-y-3 min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Weld Types (Price/Lm)
              </h3>
              {extractedSpecs.weldTypes.flangeWeld && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Flange Weld</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={flangeWeldInputValue ? flangeWeldInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "flangeWeld",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.mitreWeld && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Mitre Weld</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={mitreWeldInputValue ? mitreWeldInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "mitreWeld",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.teeWeld && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Tee Weld</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={teeWeldInputValue ? teeWeldInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "teeWeld",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.gussetTeeWeld && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Gusset Tee Weld</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={gussetTeeWeldInputValue ? gussetTeeWeldInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "gussetTeeWeld",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.latWeld45Plus && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Lat Weld 45+</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={latWeld45PlusInputValue ? latWeld45PlusInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "latWeld45Plus",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.latWeldUnder45 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Lat Weld &lt;45</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={latWeldUnder45InputValue ? latWeldUnder45InputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "latWeldUnder45",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
              {extractedSpecs.weldTypes.tackWeld && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Tack Weld (Loose Flange)</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tackWeldInputValue ? tackWeldInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "weldTypes",
                          "tackWeld",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Lm</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Flange Price Centers - only show types used in this RFQ */}
        {(() => {
          const rawSlipOn = extractedSpecs.flangeTypes.slipOn;
          const rawRotating = extractedSpecs.flangeTypes.rotating;
          const rawBlank = extractedSpecs.flangeTypes.blank;
          const hasAnyFlangeType = rawSlipOn || rawRotating || rawBlank;
          if (!hasAnyFlangeType) return null;
          return (
            <div className="space-y-3 min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                Flange Pricing (Price/unit)
              </h3>
              {extractedSpecs.flangeTypes.slipOn && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Slip On Flange</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={slipOnFlangeInputValue ? slipOnFlangeInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "flangeTypes",
                          "slipOn",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Kg</span>
                  </div>
                </div>
              )}
              {extractedSpecs.flangeTypes.rotating && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Rotating Flange (R/F)</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rotatingFlangeInputValue ? rotatingFlangeInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "flangeTypes",
                          "rotating",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Kg</span>
                  </div>
                </div>
              )}
              {extractedSpecs.flangeTypes.blank && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">Blank Flange</label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={blankFlangeInputValue ? blankFlangeInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "flangeTypes",
                          "blank",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/Kg</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Bolts, Nuts & Washers Pricing - only show if BNW section exists */}
        {extractedSpecs.bnwGrade && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Bolts, Nuts & Washers - {extractedSpecs.bnwGrade} (Price/Kg)
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Bolts</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={boltsInputValue ? boltsInputValue : ""}
                  onChange={(e) =>
                    onPricingInputChange("bnwTypes", "bolts", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Nuts</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nutsInputValue ? nutsInputValue : ""}
                  onChange={(e) =>
                    onPricingInputChange("bnwTypes", "nuts", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex-1">Washers</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={washersInputValue ? washersInputValue : ""}
                  onChange={(e) =>
                    onPricingInputChange("bnwTypes", "washers", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500 ml-1">/Kg</span>
              </div>
            </div>
          </div>
        )}

        {/* Valve Pricing - only show if valve sections exist */}
        {extractedSpecs.valveTypes.length > 0 && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Valve Pricing (Price/unit)
            </h3>
            {extractedSpecs.valveTypes.map((valveType) => {
              const labels: Record<string, string> = {
                ball_valve: "Ball Valve",
                gate_valve: "Gate Valve",
                globe_valve: "Globe Valve",
                butterfly_valve: "Butterfly Valve",
                check_valve: "Check Valve",
                control_valve: "Control Valve",
                safety_valve: "Safety/Relief Valve",
                plug_valve: "Plug Valve",
                needle_valve: "Needle Valve",
                diaphragm_valve: "Diaphragm Valve",
                general_valve: "Valve (General)",
              };
              const valveLabel = labels[valveType];
              const valveInputValue = pricingInputs.valveTypes[valveType];
              return (
                <div key={valveType} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">
                    {valveLabel ? valveLabel : valveType}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valveInputValue ? valveInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "valveTypes",
                          valveType,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/ea</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instrument Pricing - only show if instrument sections exist */}
        {extractedSpecs.instrumentTypes.length > 0 && (
          <div className="space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
              Instrument Pricing (Price/unit)
            </h3>
            {extractedSpecs.instrumentTypes.map((instType) => {
              const labels: Record<string, string> = {
                flow_meter: "Flow Meter",
                pressure_instrument: "Pressure Instrument",
                level_instrument: "Level Instrument",
                temperature_instrument: "Temperature Instrument",
                analytical_instrument: "Analytical Instrument",
                general_instrument: "Instrument (General)",
              };
              const instLabel = labels[instType];
              const instInputValue = pricingInputs.instrumentTypes[instType];
              return (
                <div key={instType} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 flex-1">
                    {instLabel ? instLabel : instType}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={instInputValue ? instInputValue : ""}
                      onChange={(e) =>
                        onPricingInputChange(
                          "instrumentTypes",
                          instType,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="w-28 px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-500 ml-1">/ea</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Labour & Extras and Contingencies */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Labour & Extras
            </label>
            <div className="flex items-center w-28">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={(() => {
                  const rawLabourExtrasPercent = pricingInputs.labourExtrasPercent;
                  return rawLabourExtrasPercent || "";
                })()}
                onChange={(e) =>
                  onPercentageChange("labourExtrasPercent", parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              (Added to each line item)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Contingencies
            </label>
            <div className="flex items-center w-28">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={(() => {
                  const rawContingenciesPercent = pricingInputs.contingenciesPercent;
                  return rawContingenciesPercent || "";
                })()}
                onChange={(e) =>
                  onPercentageChange("contingenciesPercent", parseFloat(e.target.value) || 0)
                }
                placeholder="5"
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">(Added to grand total)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingInputsSection;
