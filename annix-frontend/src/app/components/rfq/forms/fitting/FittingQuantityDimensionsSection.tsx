"use client";

import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import { masterDataApi } from "@/app/lib/api/client";
import { ALL_FITTING_SIZES, SABS719_FITTING_SIZES } from "@/app/lib/config/rfq";
import { log } from "@/app/lib/logger";
import {
  getLateralDimensionsForAngle,
  LateralAngleRange,
} from "@/app/lib/utils/sabs719LateralData";
import { type SteelSpecItem } from "../shared";
import type { FittingFormLogic } from "./useFittingFormLogic";

const FittingQuantityDimensionsSectionInner = (props: { logic: FittingFormLogic }) => {
  const {
    debouncedCalculate,
    entry,
    fittingQuantityDisplayValue,
    globalSpecs,
    groupedSteelOptions,
    isLateral,
    isOffsetBend,
    isReducer,
    isUnequalTee,
    masterData,
    onUpdateEntry,
    rawHasReducerStub,
    rawHasStubs,
    rawOffsetAngleDegrees,
    rawOffsetLengthA,
    rawOffsetLengthB,
    rawOffsetLengthC,
    rawPipeLengthAMm2,
    rawPipeLengthBMm3,
    rawReducerLengthMm,
    rawReducerStubAngleDegrees,
    rawStubLocation,
    specs,
  } = props.logic;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between border-b border-blue-400 pb-1.5 mb-3">
        <h4 className="text-sm font-bold text-blue-900">Quantity & Dimensions</h4>
        {isLateral && (
          <label className="flex items-center gap-1.5 text-xs font-medium text-blue-900 cursor-pointer">
            <input
              type="checkbox"
              checked={rawHasStubs || false}
              onChange={(e) => {
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    hasStubs: e.target.checked,
                    numberOfStubs: e.target.checked ? 1 : undefined,
                    stubs: e.target.checked
                      ? [
                          {
                            steelSpecId: specs.steelSpecificationId,
                            nominalBoreMm: 50,
                            distanceFromOutletMm: 100,
                            outletLocation: "branch",
                            positionDegrees: 0,
                          },
                        ]
                      : undefined,
                  },
                });
              }}
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
            />
            Add Stubs
          </label>
        )}
      </div>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${isUnequalTee || isLateral ? "md:grid-cols-6" : isReducer ? "md:grid-cols-3" : isOffsetBend ? "md:grid-cols-5" : "md:grid-cols-3"} gap-3`}
      >
        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">Quantity *</label>
          <input
            type="number"
            value={fittingQuantityDisplayValue}
            onChange={(e) => {
              const rawValue = e.target.value;
              if (rawValue === "") {
                onUpdateEntry(entry.id, {
                  specs: { ...entry.specs, quantityValue: undefined },
                });
                return;
              }
              const qty = Number(rawValue);
              onUpdateEntry(entry.id, {
                specs: { ...entry.specs, quantityValue: qty },
              });
              debouncedCalculate();
            }}
            onBlur={(e) => {
              if (e.target.value === "" || Number(e.target.value) < 1) {
                onUpdateEntry(entry.id, { specs: { ...entry.specs, quantityValue: 1 } });
                debouncedCalculate();
              }
            }}
            className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            min="1"
            placeholder="1"
          />
        </div>

        {/* Pipe Length A - or Angle Range for Laterals/Y-Pieces (not for reducers or offset bends) */}
        {(() => {
          const fittingType = specs.fittingType;
          const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType || "");
          const isOffsetBendType = fittingType === "OFFSET_BEND";
          if (isReducerType || isOffsetBendType) return null;

          const isLateral = fittingType === "LATERAL" || fittingType === "Y_PIECE";
          const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType || "");
          const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
            fittingType || "",
          );
          const isReducingTee = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(
            fittingType || "",
          );
          const isTee = isEqualTee || isUnequalTee || isReducingTee;
          const isAutoA = specs.pipeLengthAMmAuto && !specs.pipeLengthAOverride;

          if (isLateral) {
            const rawAngleRange = specs.angleRange;
            return (
              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Angle Range *
                </label>
                <select
                  value={rawAngleRange || ""}
                  onChange={async (e) => {
                    const angleRange = e.target.value;
                    const rawSteelSpecificationId16 = specs.steelSpecificationId;
                    const isSABS719 =
                      (rawSteelSpecificationId16 || globalSpecs?.steelSpecificationId) === 8;
                    const rawFittingStandard6 = specs.fittingStandard;
                    const effectiveStandard =
                      rawFittingStandard6 || (isSABS719 ? "SABS719" : "SABS62");

                    let pipeLengthA = specs.pipeLengthAMm;
                    let pipeLengthB = specs.pipeLengthBMm;
                    let pipeLengthAMmAuto = specs.pipeLengthAMmAuto;
                    let pipeLengthBMmAuto = specs.pipeLengthBMmAuto;
                    let lateralHeightMm = specs.lateralHeightMm;
                    let lateralHeightMmAuto = specs.lateralHeightMmAuto;

                    if (specs.fittingType && specs.nominalDiameterMm && angleRange) {
                      try {
                        const dims = await masterDataApi.getFittingDimensions(
                          effectiveStandard as "SABS62" | "SABS719",
                          entry.specs.fittingType,
                          entry.specs.nominalDiameterMm,
                          angleRange,
                        );
                        if (dims) {
                          const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                          const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                          if (dimA && !specs.pipeLengthAOverride) {
                            pipeLengthA = dimA;
                            pipeLengthAMmAuto = dimA;
                          }
                          if (dimB && !specs.pipeLengthBOverride) {
                            pipeLengthB = dimB;
                            pipeLengthBMmAuto = dimB;
                          }
                        }
                      } catch (err) {
                        log.debug("Could not fetch fitting dimensions:", err);
                      }

                      // Auto-populate lateral height (A/C/E dimension) from MPS manual
                      const lateralDims = getLateralDimensionsForAngle(
                        entry.specs.nominalDiameterMm,
                        angleRange as LateralAngleRange,
                      );
                      if (lateralDims && !specs.lateralHeightOverride) {
                        lateralHeightMm = lateralDims.heightMm;
                        lateralHeightMmAuto = lateralDims.heightMm;
                      }
                    }

                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        angleRange,
                        pipeLengthAMm: pipeLengthA,
                        pipeLengthBMm: pipeLengthB,
                        pipeLengthAMmAuto,
                        pipeLengthBMmAuto,
                        lateralHeightMm,
                        lateralHeightMmAuto,
                      },
                    });
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value="">Select angle range...</option>
                  <option value="60-90">60° - 90°</option>
                  <option value="45-59">45° - 59°</option>
                  <option value="30-44">30° - 44°</option>
                </select>
              </div>
            );
          }

          const rawPipeLengthAMm = specs.pipeLengthAMm;

          return (
            <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Pipe Length A (mm) *
                {isEqualTee && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>
                )}
                {!isEqualTee && isAutoA && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                )}
                {!isEqualTee && specs.pipeLengthAOverride && (
                  <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                )}
              </label>
              <input
                type="number"
                value={rawPipeLengthAMm || ""}
                onChange={(e) => {
                  if (isEqualTee) return;
                  const newValue = Number(e.target.value);
                  const isOverride =
                    specs.pipeLengthAMmAuto && newValue !== specs.pipeLengthAMmAuto;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      pipeLengthAMm: newValue,
                      pipeLengthAOverride: isOverride,
                    },
                  });
                }}
                className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 ${
                  isEqualTee
                    ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                }`}
                placeholder="e.g., 1000"
                min="0"
                readOnly={isEqualTee}
                aria-readonly={isEqualTee}
              />
              {(isUnequalTee || isReducingTee) && (
                <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
              )}
            </div>
          );
        })()}

        {/* Pipe Length B - or Degrees for Laterals (not for reducers or offset bends) */}
        {(() => {
          const fittingType = specs.fittingType;
          const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType || "");
          const isOffsetBendType = fittingType === "OFFSET_BEND";
          if (isReducerType || isOffsetBendType) return null;

          const isLateral = fittingType === "LATERAL";
          const isYPiece = fittingType === "Y_PIECE";
          const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType || "");
          const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
            fittingType || "",
          );
          const isReducingTee = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(
            fittingType || "",
          );
          const isTee = isEqualTee || isUnequalTee || isReducingTee;
          const isAutoB = specs.pipeLengthBMmAuto && !specs.pipeLengthBOverride;

          if (isLateral) {
            const rawDegrees = specs.degrees;
            return (
              <div>
                <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Degrees *
                </label>
                <input
                  type="number"
                  value={rawDegrees || ""}
                  onChange={(e) => {
                    onUpdateEntry(entry.id, {
                      specs: { ...entry.specs, degrees: Number(e.target.value) },
                    });
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  placeholder="e.g., 45, 60, 90"
                  min="30"
                  max="90"
                />
              </div>
            );
          }

          if (isYPiece) {
            const rawPipeLengthBMm = specs.pipeLengthBMm;
            return (
              <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Pipe Length B (mm) *
                  {isAutoB && (
                    <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                  )}
                  {specs.pipeLengthBOverride && (
                    <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={rawPipeLengthBMm || ""}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    const isOverride =
                      specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        pipeLengthBMm: newValue,
                        pipeLengthBOverride: isOverride,
                      },
                    });
                  }}
                  className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-blue-50"
                  placeholder="e.g., 1000"
                  min="0"
                />
              </div>
            );
          }

          const rawPipeLengthBMm2 = specs.pipeLengthBMm;

          return (
            <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Pipe Length B (mm) *
                {isEqualTee && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>
                )}
                {!isEqualTee && isAutoB && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                )}
                {!isEqualTee && specs.pipeLengthBOverride && (
                  <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                )}
              </label>
              <input
                type="number"
                value={rawPipeLengthBMm2 || ""}
                onChange={(e) => {
                  if (isEqualTee) return;
                  const newValue = Number(e.target.value);
                  const isOverride =
                    specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      pipeLengthBMm: newValue,
                      pipeLengthBOverride: isOverride,
                    },
                  });
                }}
                className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 ${
                  isEqualTee
                    ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                }`}
                placeholder="e.g., 1000"
                min="0"
                readOnly={isEqualTee}
                aria-readonly={isEqualTee}
              />
              {(isUnequalTee || isReducingTee) && (
                <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
              )}
            </div>
          );
        })()}

        {/* Pipe Length A - for Laterals in the same row */}
        {isLateral && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Pipe Length A (mm) *
              {specs.pipeLengthAMmAuto && !specs.pipeLengthAOverride && (
                <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
              )}
              {specs.pipeLengthAOverride && (
                <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
              )}
            </label>
            <input
              type="number"
              value={rawPipeLengthAMm2 || ""}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                const isOverride = specs.pipeLengthAMmAuto && newValue !== specs.pipeLengthAMmAuto;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    pipeLengthAMm: newValue,
                    pipeLengthAOverride: isOverride,
                  },
                });
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 915"
              min="0"
            />
          </div>
        )}

        {/* Pipe Length B - for Laterals in the same row */}
        {isLateral && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Pipe Length B (mm) *
              {specs.pipeLengthBMmAuto && !specs.pipeLengthBOverride && (
                <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
              )}
              {specs.pipeLengthBOverride && (
                <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
              )}
            </label>
            <input
              type="number"
              value={rawPipeLengthBMm3 || ""}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                const isOverride = specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    pipeLengthBMm: newValue,
                    pipeLengthBOverride: isOverride,
                  },
                });
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 1120"
              min="0"
            />
          </div>
        )}

        {/* Dimension A/C/E - Height dimension for Laterals based on angle */}
        {isLateral && (
          <div>
            {(() => {
              const angleRange = specs.angleRange as LateralAngleRange | undefined;
              const nominalBore = specs.nominalDiameterMm;
              const dimensionLabel =
                angleRange === "60-90" ? "A" : angleRange === "45-59" ? "C" : "E";
              const lateralDims =
                nominalBore && angleRange
                  ? getLateralDimensionsForAngle(nominalBore, angleRange)
                  : null;
              const autoHeight = lateralDims?.heightMm;
              const currentHeight = specs.lateralHeightMm;
              const isAuto =
                autoHeight && currentHeight === autoHeight && !specs.lateralHeightOverride;
              const isOverride = specs.lateralHeightOverride;

              const rawLateralHeightMm = specs.lateralHeightMm;

              return (
                <>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Dimension {dimensionLabel} (mm)
                    {isAuto && (
                      <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                    )}
                    {isOverride && (
                      <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={rawLateralHeightMm || ""}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      const isOverrideNow = autoHeight && newValue !== autoHeight;
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          lateralHeightMm: newValue,
                          lateralHeightOverride: isOverrideNow,
                        },
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder={autoHeight ? `e.g., ${autoHeight}` : "Height"}
                    min="0"
                  />
                </>
              );
            })()}
          </div>
        )}

        {/* Tee Steel Spec - Inside blue section for Unequal Tees */}
        {isUnequalTee && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Tee Steel *<span className="text-blue-600 text-xs ml-1 font-normal">(Branch)</span>
            </label>
            {(() => {
              const rawSteelSpecificationId17 = specs.steelSpecificationId;
              const mainSteelSpecId =
                rawSteelSpecificationId17 || globalSpecs?.steelSpecificationId;
              const rawTeeSteelSpecificationId = specs.teeSteelSpecificationId;
              const teeSteelSpecId = rawTeeSteelSpecificationId || mainSteelSpecId;
              const isUsingMainSpec = !specs.teeSteelSpecificationId;

              return (
                <Select
                  value={String(teeSteelSpecId || "")}
                  onChange={(value) => {
                    const newSpecId = value ? parseInt(value, 10) : undefined;
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        teeSteelSpecificationId: newSpecId,
                        teeNominalDiameterMm: undefined,
                      },
                    });
                  }}
                  className={
                    isUsingMainSpec ? "border-2 border-green-500" : "border-2 border-orange-500"
                  }
                  options={[]}
                  groupedOptions={groupedSteelOptions}
                  placeholder="Select..."
                />
              );
            })()}
          </div>
        )}

        {/* Tee NB - Inside blue section for Unequal Tees */}
        {isUnequalTee && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Tee NB (mm) *<span className="text-blue-600 text-xs ml-1 font-normal">(Branch)</span>
            </label>
            {(() => {
              const rawNominalDiameterMm6 = specs.nominalDiameterMm;
              const mainNB = rawNominalDiameterMm6 || 0;
              const rawSteelSpecificationId18 = specs.steelSpecificationId;
              const mainSteelSpecId =
                rawSteelSpecificationId18 || globalSpecs?.steelSpecificationId;
              const rawTeeSteelSpecificationId2 = specs.teeSteelSpecificationId;
              const teeSteelSpecId = rawTeeSteelSpecificationId2 || mainSteelSpecId;
              const isSABS719Tee = teeSteelSpecId === 8;
              const availableSizes = isSABS719Tee
                ? [...SABS719_FITTING_SIZES]
                : [...ALL_FITTING_SIZES];
              const sizes = availableSizes.filter((nb) => nb <= mainNB);
              const options = sizes.map((nb: number) => ({
                value: String(nb),
                label: `${nb}mm`,
              }));

              return (
                <Select
                  id={`fitting-tee-nb-blue-${entry.id}`}
                  value={specs.teeNominalDiameterMm ? String(entry.specs.teeNominalDiameterMm) : ""}
                  onChange={(value) => {
                    if (!value) return;
                    const teeDiameter = Number(value);
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        teeNominalDiameterMm: teeDiameter,
                      },
                    });
                    debouncedCalculate();
                  }}
                  options={options}
                  placeholder="Select..."
                />
              );
            })()}
          </div>
        )}

        {/* Location of Tee - Inside blue section for Unequal Tees */}
        {isUnequalTee && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Location (mm)
              <span className="text-blue-600 text-xs ml-1 font-normal">(from left)</span>
            </label>
            <input
              type="number"
              value={rawStubLocation || ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : undefined;
                onUpdateEntry(entry.id, {
                  specs: { ...entry.specs, stubLocation: value },
                });
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 500"
              min="0"
            />
          </div>
        )}

        {/* Reducer Length - For Reducers */}
        {isReducer && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Length (mm)
              {specs.reducerLengthMmAuto && !specs.reducerLengthOverride && (
                <span className="text-green-600 text-xs ml-1 font-normal">(auto)</span>
              )}
              {specs.reducerLengthOverride && (
                <span className="text-orange-600 text-xs ml-1 font-normal">(override)</span>
              )}
            </label>
            <input
              type="number"
              value={rawReducerLengthMm || ""}
              onChange={(e) => {
                const newValue = e.target.value ? Number(e.target.value) : undefined;
                const autoLength = specs.reducerLengthMmAuto;
                const isOverrideNow = autoLength && newValue !== autoLength;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    reducerLengthMm: newValue,
                    reducerLengthOverride: isOverrideNow,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder={
                specs.reducerLengthMmAuto ? `e.g., ${entry.specs.reducerLengthMmAuto}` : "Length"
              }
              min="0"
            />
          </div>
        )}

        {/* Reducer Stub - Checkbox only, sub-fields on separate row */}
        {isReducer && (
          <div className="flex items-center h-full pt-5">
            <input
              type="checkbox"
              id={`reducer-stub-${entry.id}`}
              checked={rawHasReducerStub || false}
              onChange={(e) => {
                const rawReducerStubNbMm = specs.reducerStubNbMm;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    hasReducerStub: e.target.checked,
                    reducerStubNbMm: e.target.checked ? rawReducerStubNbMm || 50 : undefined,
                  },
                });
                debouncedCalculate();
              }}
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor={`reducer-stub-${entry.id}`}
              className="ml-2 text-xs font-semibold text-blue-900 cursor-pointer"
            >
              Add Center Stub
            </label>
          </div>
        )}

        {/* Offset Bend - Length A */}
        {isOffsetBend && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Length A (mm)
              <span className="text-gray-500 text-xs ml-1 font-normal">(first)</span>
            </label>
            <input
              type="number"
              value={rawOffsetLengthA || ""}
              onChange={(e) => {
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    offsetLengthA: e.target.value ? Number(e.target.value) : undefined,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 300"
              min="0"
            />
          </div>
        )}

        {/* Offset Bend - Length B */}
        {isOffsetBend && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Length B (mm)
              <span className="text-gray-500 text-xs ml-1 font-normal">(middle)</span>
            </label>
            <input
              type="number"
              value={rawOffsetLengthB || ""}
              onChange={(e) => {
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    offsetLengthB: e.target.value ? Number(e.target.value) : undefined,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 200"
              min="0"
            />
          </div>
        )}

        {/* Offset Bend - Length C */}
        {isOffsetBend && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Length C (mm)
              <span className="text-gray-500 text-xs ml-1 font-normal">(last)</span>
            </label>
            <input
              type="number"
              value={rawOffsetLengthC || ""}
              onChange={(e) => {
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    offsetLengthC: e.target.value ? Number(e.target.value) : undefined,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="e.g., 300"
              min="0"
            />
          </div>
        )}

        {/* Offset Bend - Angle */}
        {isOffsetBend && (
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Offset Angle (°)
            </label>
            <select
              value={rawOffsetAngleDegrees || ""}
              onChange={(e) => {
                const angle = e.target.value ? Number(e.target.value) : undefined;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    offsetAngleDegrees: angle,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Select...</option>
              {Array.from({ length: 90 }, (_, i) => i + 1).map((deg) => (
                <option key={deg} value={deg}>
                  {deg}°
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reducer Stub Sub-fields - Shown when Add Center Stub is checked */}
      {isReducer && specs.hasReducerStub && (
        <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Stub Steel</label>
            {(() => {
              const rawSteelSpecificationId19 = specs.steelSpecificationId;
              const mainSteelSpecId =
                rawSteelSpecificationId19 || globalSpecs?.steelSpecificationId;
              const rawReducerStubSteelSpecId = specs.reducerStubSteelSpecId;
              const stubSteelSpecId = rawReducerStubSteelSpecId || mainSteelSpecId;
              const isUsingMainSpec = !specs.reducerStubSteelSpecId;
              return (
                <Select
                  value={String(stubSteelSpecId || "")}
                  onChange={(value) => {
                    const newSpecId = value ? parseInt(value, 10) : undefined;
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        reducerStubSteelSpecId: newSpecId,
                      },
                    });
                    debouncedCalculate();
                  }}
                  className={
                    isUsingMainSpec ? "border-2 border-green-500" : "border-2 border-orange-500"
                  }
                  options={[]}
                  groupedOptions={groupedSteelOptions}
                  placeholder="Select..."
                />
              );
            })()}
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Stub NB (mm)</label>
            {(() => {
              const rawSmallNominalDiameterMm = specs.smallNominalDiameterMm;
              const smallNB = rawSmallNominalDiameterMm || 0;
              const maxStubNB = smallNB - 50;
              const rawReducerStubSteelSpecId2 = specs.reducerStubSteelSpecId;
              const rawSpecsSteelSpecId = specs.steelSpecificationId;
              const rawGlobalSteelSpecId = globalSpecs?.steelSpecificationId;
              const stubSteelSpecId =
                rawReducerStubSteelSpecId2 || rawSpecsSteelSpecId || rawGlobalSteelSpecId;
              const rawSteelSpecs = masterData?.steelSpecs;
              const stubSteelSpec = rawSteelSpecs?.find(
                (s: SteelSpecItem) => s.id === stubSteelSpecId,
              );
              const rawStubSpecName = stubSteelSpec?.steelSpecName;
              const isSABS719Stub =
                rawStubSpecName?.includes("SABS 719") || rawStubSpecName?.includes("SANS 719");
              const minStubNB = isSABS719Stub ? 200 : 15;
              const allStubSizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
              const stubSizes = allStubSizes.filter((nb) => nb >= minStubNB && nb <= maxStubNB);
              const rawReducerStubNbMm2 = specs.reducerStubNbMm;
              return (
                <select
                  value={rawReducerStubNbMm2 || ""}
                  onChange={(e) => {
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        reducerStubNbMm: Number(e.target.value),
                      },
                    });
                    debouncedCalculate();
                  }}
                  className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select...</option>
                  {stubSizes.map((nb) => (
                    <option key={nb} value={nb}>
                      {nb}mm
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Location (mm)
              <span className="text-green-600 text-xs ml-1 font-normal">(center)</span>
            </label>
            <input
              type="number"
              value={specs.reducerLengthMm ? Math.round(entry.specs.reducerLengthMm / 2) : ""}
              disabled
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-gray-100 text-gray-700 cursor-not-allowed"
              placeholder="Auto"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Angle (°)
              <span className="text-green-600 text-xs ml-1 font-normal">(0-360)</span>
            </label>
            <input
              type="number"
              min="0"
              max="360"
              value={rawReducerStubAngleDegrees || 0}
              onChange={(e) => {
                const angle = Math.min(360, Math.max(0, Number(e.target.value) || 0));
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    reducerStubAngleDegrees: angle,
                  },
                });
                debouncedCalculate();
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="0"
            />
          </div>
          <p className="col-span-4 text-xs text-blue-600 mt-1">Stub flanged same as reducer</p>
        </div>
      )}
    </div>
  );
};

export const FittingQuantityDimensionsSection = memo(FittingQuantityDimensionsSectionInner);
