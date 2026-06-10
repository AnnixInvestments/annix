"use client";

import { memo } from "react";
import {
  recommendDuckfootGussetCount,
  recommendDuckfootGussetThickness,
} from "@/app/lib/utils/pipeCalculations";
import type { BendFormLogic } from "./useBendFormLogic";

const BendDuckfootSteelworkSectionInner = (props: { logic: BendFormLogic }) => {
  const { entry, generateItemDescription, globalSpecs, onUpdateEntry, specs } = props.logic;
  if (specs.bendItemType !== "DUCKFOOT_BEND") {
    return null;
  }
  return (
    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3 mt-3">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Duckfoot Steelwork (Base Plate & Ribs)
        </h4>
      </div>
      {(() => {
        const nominalBore = specs.nominalBoreMm;
        const duckfootDefaults: Record<
          number,
          { x: number; y: number; t1: number; t2: number; inletH: number }
        > = {
          200: { x: 355, y: 230, t1: 6, t2: 10, inletH: 365 },
          250: { x: 405, y: 280, t1: 6, t2: 10, inletH: 417 },
          300: { x: 460, y: 330, t1: 6, t2: 10, inletH: 467 },
          350: { x: 510, y: 380, t1: 8, t2: 12, inletH: 519 },
          400: { x: 560, y: 430, t1: 8, t2: 12, inletH: 559 },
          450: { x: 610, y: 485, t1: 8, t2: 12, inletH: 633 },
          500: { x: 660, y: 535, t1: 10, t2: 14, inletH: 703 },
          550: { x: 710, y: 585, t1: 10, t2: 14, inletH: 752 },
          600: { x: 760, y: 635, t1: 10, t2: 14, inletH: 790 },
          650: { x: 815, y: 693, t1: 12, t2: 16, inletH: 847 },
          700: { x: 865, y: 733, t1: 12, t2: 16, inletH: 892 },
          750: { x: 915, y: 793, t1: 12, t2: 16, inletH: 940 },
          800: { x: 970, y: 833, t1: 14, t2: 18, inletH: 991 },
          850: { x: 1020, y: 883, t1: 14, t2: 18, inletH: 1016 },
          900: { x: 1070, y: 933, t1: 14, t2: 18, inletH: 1067 },
        };
        const defaults =
          nominalBore && duckfootDefaults[nominalBore] ? duckfootDefaults[nominalBore] : null;
        const hasDefaults = !!defaults;

        const rawDuckfootBasePlateXMm = specs.duckfootBasePlateXMm;
        const rawDuckfootBasePlateYMm = specs.duckfootBasePlateYMm;
        const rawDuckfootInletCentreHeightMm = specs.duckfootInletCentreHeightMm;
        const rawDuckfootPlateThicknessT1Mm = specs.duckfootPlateThicknessT1Mm;
        const rawDuckfootRibThicknessT2Mm = specs.duckfootRibThicknessT2Mm;
        const rawDuckfootGussetPointDDegrees = specs.duckfootGussetPointDDegrees;
        const rawDuckfootGussetPointCDegrees = specs.duckfootGussetPointCDegrees;

        const defaultX = defaults?.x;
        const defaultY = defaults?.y;
        const defaultInletH = defaults?.inletH;
        const defaultT1 = defaults?.t1;
        const defaultT2 = defaults?.t2;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Plate X
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Width of the duckfoot base plate (longer dimension) in mm"
                >
                  ?
                </span>
              </label>
              <input
                type="number"
                value={rawDuckfootBasePlateXMm || defaultX || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootBasePlateXMm: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                placeholder={hasDefaults ? `${defaults.x}` : "X"}
                className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                min="100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Plate Y
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Depth of the duckfoot base plate (shorter dimension) in mm"
                >
                  ?
                </span>
              </label>
              <input
                type="number"
                value={rawDuckfootBasePlateYMm || defaultY || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootBasePlateYMm: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                placeholder={hasDefaults ? `${defaults.y}` : "Y"}
                className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                min="100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Plate Height
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Height from base plate to centre of inlet opening in mm. Steelwork height is calculated from this minus wall thickness and half inner diameter."
                >
                  ?
                </span>
              </label>
              <input
                type="number"
                value={rawDuckfootInletCentreHeightMm || defaultInletH || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootInletCentreHeightMm: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                placeholder={hasDefaults ? `${defaults.inletH}` : "H"}
                className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                min="100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Rib T1
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Thickness of the vertical ribs supporting the pipe in mm"
                >
                  ?
                </span>
              </label>
              <input
                type="number"
                value={rawDuckfootPlateThicknessT1Mm || defaultT1 || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootPlateThicknessT1Mm: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                placeholder={hasDefaults ? `${defaults.t1}` : "T1"}
                className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                min="4"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Plate T2
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Thickness of the base plate in mm"
                >
                  ?
                </span>
              </label>
              <input
                type="number"
                value={rawDuckfootRibThicknessT2Mm || defaultT2 || ""}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootRibThicknessT2Mm: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                placeholder={hasDefaults ? `${defaults.t2}` : "T2"}
                className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                min="6"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Pt C
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Angle position of Point C on the yellow gusset (degrees from bend start)"
                >
                  ?
                </span>
              </label>
              <select
                value={rawDuckfootGussetPointDDegrees || 15}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootGussetPointDDegrees: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
              >
                <option value={5}>5°</option>
                <option value={10}>10°</option>
                <option value={15}>15°</option>
                <option value={20}>20°</option>
                <option value={25}>25°</option>
                <option value={30}>30°</option>
                <option value={35}>35°</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Pt D
                <span
                  className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                  title="Angle position of Point D on the yellow gusset (degrees from bend start)"
                >
                  ?
                </span>
              </label>
              <select
                value={rawDuckfootGussetPointCDegrees || 75}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, duckfootGussetPointCDegrees: value },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
              >
                <option value={55}>55°</option>
                <option value={60}>60°</option>
                <option value={65}>65°</option>
                <option value={70}>70°</option>
                <option value={75}>75°</option>
                <option value={80}>80°</option>
                <option value={85}>85°</option>
              </select>
            </div>
          </div>
        );
      })()}

      {/* Gusset Configuration Row */}
      <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-600">
        <h5 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Gusset Configuration
        </h5>
        {(() => {
          const nominalBore = specs.nominalBoreMm;
          const rawWorkingPressureBar7 = specs.workingPressureBar;
          const workingPressure = rawWorkingPressureBar7 || globalSpecs?.workingPressureBar;
          const recommendedCount = nominalBore ? recommendDuckfootGussetCount(nominalBore) : 2;
          const recommendedThickness =
            nominalBore && workingPressure
              ? recommendDuckfootGussetThickness({
                  nominalBoreMm: nominalBore,
                  designPressureBar: workingPressure,
                })
              : null;

          const rawDuckfootGussetCount = specs.duckfootGussetCount;
          const rawDuckfootGussetPlacement = specs.duckfootGussetPlacement;
          const rawDuckfootGussetThicknessMm = specs.duckfootGussetThicknessMm;
          const rawDuckfootGussetMaterialGrade = specs.duckfootGussetMaterialGrade;
          const rawDuckfootGussetWeldType = specs.duckfootGussetWeldType;
          const rawDuckfootGussetWeldElectrode = specs.duckfootGussetWeldElectrode;
          const rawDuckfootGussetPreheatTempC = specs.duckfootGussetPreheatTempC;
          const rawDuckfootGussetPwhtRequired = specs.duckfootGussetPwhtRequired;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Count
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Number of gussets (2=basic, 4=medium bore, 6=large bore)"
                  >
                    ?
                  </span>
                </label>
                <select
                  value={rawDuckfootGussetCount || recommendedCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, duckfootGussetCount: value },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Placement
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Gusset placement pattern: HEEL_ONLY (at base), SYMMETRICAL (around pipe), FULL_COVERAGE (comprehensive)"
                  >
                    ?
                  </span>
                </label>
                <select
                  value={rawDuckfootGussetPlacement || "HEEL_ONLY"}
                  onChange={(e) => {
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, duckfootGussetPlacement: e.target.value },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value="HEEL_ONLY">Heel Only</option>
                  <option value="SYMMETRICAL">Symmetrical</option>
                  <option value="FULL_COVERAGE">Full Coverage</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Thickness
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title={`Gusset plate thickness in mm${recommendedThickness ? ` (calculated: ${recommendedThickness.toFixed(1)}mm)` : ""}`}
                  >
                    ?
                  </span>
                </label>
                <input
                  type="number"
                  value={rawDuckfootGussetThicknessMm || recommendedThickness || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, duckfootGussetThicknessMm: value },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  placeholder={recommendedThickness ? recommendedThickness.toFixed(1) : "mm"}
                  className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  min="6"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Material
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Gusset plate material grade"
                  >
                    ?
                  </span>
                </label>
                <select
                  value={rawDuckfootGussetMaterialGrade || "A36"}
                  onChange={(e) => {
                    const updatedEntry = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        duckfootGussetMaterialGrade: e.target.value,
                      },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value="A36">A36</option>
                  <option value="Q235">Q235</option>
                  <option value="A283_C">A283-C</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Weld Type
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Type of weld for gusset attachment"
                  >
                    ?
                  </span>
                </label>
                <select
                  value={rawDuckfootGussetWeldType || "FILLET"}
                  onChange={(e) => {
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, duckfootGussetWeldType: e.target.value },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value="FILLET">Fillet</option>
                  <option value="FULL_PENETRATION">Full Pen.</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Electrode
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Welding electrode specification"
                  >
                    ?
                  </span>
                </label>
                <select
                  value={rawDuckfootGussetWeldElectrode || "E7018"}
                  onChange={(e) => {
                    const updatedEntry = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        duckfootGussetWeldElectrode: e.target.value,
                      },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                >
                  <option value="E7018">E7018</option>
                  <option value="E7024">E7024</option>
                  <option value="E6013">E6013</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Preheat
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Preheat temperature in °C (optional, for thicker plates)"
                  >
                    ?
                  </span>
                </label>
                <input
                  type="number"
                  value={rawDuckfootGussetPreheatTempC || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, duckfootGussetPreheatTempC: value },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  placeholder="°C"
                  className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  min="0"
                  max="400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  PWHT
                  <span
                    className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                    title="Post-Weld Heat Treatment required"
                  >
                    ?
                  </span>
                </label>
                <div className="flex items-center h-[30px]">
                  <input
                    type="checkbox"
                    checked={rawDuckfootGussetPwhtRequired || false}
                    onChange={(e) => {
                      const updatedEntry = {
                        ...entry,
                        specs: {
                          ...entry.specs,
                          duckfootGussetPwhtRequired: e.target.checked,
                        },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    className="w-4 h-4 text-orange-500 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500"
                  />
                  <span className="ml-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                    Required
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {specs.nominalBoreMm && (
        <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
          <span className="font-medium">Note:</span> Default dimensions are based on MPS manual page
          30 for {entry.specs.nominalBoreMm}NB duckfoot elbows/bends.
        </div>
      )}
    </div>
  );
};

export const BendDuckfootSteelworkSection = memo(BendDuckfootSteelworkSectionInner);
