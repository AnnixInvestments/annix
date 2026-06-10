"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import { STEEL_SPEC_NB_FALLBACK } from "@/app/lib/config/rfq";
import { FlangeDropdownTriplet } from "../sections/FlangeDropdownTriplet";
import { type SteelSpecItem } from "../shared";
import type { BendFormLogic } from "./useBendFormLogic";

const BendStubConnectionsSectionInner = (props: { logic: BendFormLogic }) => {
  const {
    allFlangeTypes,
    entry,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    masterData,
    onUpdateEntry,
    pressureClassesByStandard,
    rawLength2,
    rawLength3,
    rawLocationFromFlange,
    rawLocationFromFlange2,
    rawNumberOfStubs10,
    rawNumberOfStubs3,
    rawNumberOfStubs4,
    rawNumberOfStubs5,
    rawNumberOfStubs6,
    rawNumberOfStubs7,
    rawNumberOfStubs8,
    rawNumberOfStubs9,
    rawNumberOfTangents3,
    specs,
    stub0,
    stub1,
  } = props.logic;
  const specsSteelSpecificationId = specs.steelSpecificationId;
  const specsWallThicknessMm = specs.wallThicknessMm;
  if (specs.bendItemType === "SWEEP_TEE" || specs.bendItemType === "DUCKFOOT_BEND") {
    return null;
  }
  return (
    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mt-3">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Stub Connections</h4>
      </div>
      {/* Stub 1 Row - All fields in one row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {/* No Of Stubs */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            No. of Stubs
          </label>
          {(() => {
            const selectId = `bend-num-stubs-${entry.id}`;
            const rawNumberOfTangents2 = specs.numberOfTangents;
            const numTangents = rawNumberOfTangents2 || 0;
            const options =
              numTangents >= 2
                ? [
                    { value: "0", label: "0 - None" },
                    { value: "1", label: "1 - Single" },
                    { value: "2", label: "2 - Both" },
                  ]
                : [
                    { value: "0", label: "0 - None" },
                    { value: "1", label: "1 - Single" },
                  ];
            const rawNumberOfStubs2 = specs.numberOfStubs;
            const currentValue = rawNumberOfStubs2 || 0;
            const effectiveValue = currentValue > 1 && numTangents < 2 ? 1 : currentValue;
            return (
              <Select
                id={selectId}
                value={String(effectiveValue)}
                onChange={(value) => {
                  const count = parseInt(value, 10) || 0;
                  const rawStubs2 = specs.stubs;
                  const currentStubs = rawStubs2 || [];
                  const rawNominalBoreMm4 = specs.nominalBoreMm;
                  const mainNB = rawNominalBoreMm4 || 50;
                  const defaultStubNB = mainNB <= 50 ? mainNB : 50;
                  const defaultStub = {
                    nominalBoreMm: defaultStubNB,
                    length: 150,
                    orientation: "outside",
                    flangeSpec: "",
                  };
                  const rawItem02 = currentStubs[0];
                  const rawItem03 = currentStubs[0];
                  const rawItem12 = currentStubs[1];
                  const newStubs =
                    count === 0
                      ? []
                      : count === 1
                        ? [rawItem02 || defaultStub]
                        : [rawItem03 || defaultStub, rawItem12 || defaultStub];
                  const updatedEntry = {
                    ...entry,
                    specs: { ...entry.specs, numberOfStubs: count, stubs: newStubs },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                options={options}
                placeholder="Stubs"
              />
            );
          })()}
        </div>
        {/* Steel Spec - visible when stubs >= 1 */}
        {(rawNumberOfStubs3 || 0) >= 1 && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">
              Steel Spec
              {stub0.steelSpecificationId && <span className="text-purple-600 ml-1">*</span>}
            </label>
            {(() => {
              const selectId = `bend-stub1-steel-spec-${entry.id}`;
              const rawSteelSpecificationId11 = stub0.steelSpecificationId;
              const stub1EffectiveSpecId =
                rawSteelSpecificationId11 ||
                specsSteelSpecificationId ||
                globalSpecs?.steelSpecificationId;
              return (
                <Select
                  id={selectId}
                  value={String(stub1EffectiveSpecId || "")}
                  onChange={(value) => {
                    const newSpecId = value ? Number(value) : undefined;
                    const rawStubs3 = specs.stubs;
                    const stubs = [...(rawStubs3 || [])];
                    stubs[0] = {
                      ...stubs[0],
                      steelSpecificationId: newSpecId,
                      nominalBoreMm: undefined,
                      wallThicknessMm: undefined,
                    };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  options={[]}
                  groupedOptions={groupedSteelOptions}
                  placeholder="Spec"
                />
              );
            })()}
          </div>
        )}
        {/* NB - visible when stubs >= 1 */}
        {(rawNumberOfStubs4 || 0) >= 1 && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">NB</label>
            {(() => {
              const selectId = `bend-stub1-nb-${entry.id}`;
              const rawSteelSpecificationId12 = stub0.steelSpecificationId;
              const stub1EffectiveSpecId =
                rawSteelSpecificationId12 ||
                specsSteelSpecificationId ||
                globalSpecs?.steelSpecificationId;
              const stub1SteelSpec = masterData.steelSpecs?.find(
                (s: SteelSpecItem) => s.id === stub1EffectiveSpecId,
              );
              const rawSteelSpecName10 = stub1SteelSpec?.steelSpecName;
              const stub1SteelSpecName = rawSteelSpecName10 || "";
              const stub1FallbackNBs = entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
                stub1SteelSpecName.includes(pattern),
              )?.[1];
              const allStub1Nbs = stub1FallbackNBs || [
                15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
              ];
              const rawNominalBoreMm5 = specs.nominalBoreMm;
              const mainBendNB = rawNominalBoreMm5 || 0;
              const stub1Nbs = allStub1Nbs.filter((nb: number) => nb <= mainBendNB);
              const options = stub1Nbs.map((nb: number) => ({
                value: String(nb),
                label: `${nb} NB`,
              }));
              return (
                <Select
                  id={selectId}
                  value={stub0.nominalBoreMm ? String(entry.specs.stubs[0].nominalBoreMm) : ""}
                  onChange={(value) => {
                    const rawStubs4 = specs.stubs;
                    const stubs = [...(rawStubs4 || [])];
                    stubs[0] = { ...stubs[0], nominalBoreMm: parseInt(value, 10) || 0 };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  options={options}
                  placeholder="NB"
                />
              );
            })()}
          </div>
        )}
        {/* W/T - visible when stubs >= 1 */}
        {(rawNumberOfStubs5 || 0) >= 1 && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">
              W/T
              {stub0.wallThicknessOverride ? (
                <span className="text-purple-600 ml-1">*</span>
              ) : stub0.nominalBoreMm ? (
                <span className="text-green-600 ml-1">(A)</span>
              ) : null}
            </label>
            {(() => {
              const selectId = `bend-stub1-wt-${entry.id}`;
              const stub1NB = stub0.nominalBoreMm;
              const rawSteelSpecificationId13 = stub0.steelSpecificationId;
              const steelSpecId =
                rawSteelSpecificationId13 ||
                specsSteelSpecificationId ||
                globalSpecs?.steelSpecificationId;
              const stub1SteelSpec = masterData.steelSpecs?.find(
                (s: SteelSpecItem) => s.id === steelSpecId,
              );
              const rawSteelSpecName11 = stub1SteelSpec?.steelSpecName;
              const stub1SpecName = rawSteelSpecName11 || "";
              const isSABS719 =
                stub1SpecName.includes("SABS 719") || stub1SpecName.includes("SANS 719");
              const SABS_719_WT: Record<number, number> = {
                200: 5.2,
                250: 5.2,
                300: 6.4,
                350: 6.4,
                400: 6.4,
                450: 6.4,
                500: 6.4,
                550: 6.4,
                600: 6.4,
                650: 8.0,
                700: 8.0,
                750: 8.0,
                800: 8.0,
                850: 9.5,
                900: 9.5,
                1000: 9.5,
                1050: 9.5,
                1200: 12.7,
              };
              const ASTM_STUB_WT: Record<number, number> = {
                15: 2.77,
                20: 2.87,
                25: 3.38,
                32: 3.56,
                40: 3.68,
                50: 3.91,
                65: 5.16,
                80: 5.49,
                100: 6.02,
                125: 6.55,
                150: 7.11,
                200: 8.18,
                250: 9.27,
                300: 10.31,
              };
              const getSabs719Wt = (nb: number): number => {
                const sizes = keys(SABS_719_WT)
                  .map(Number)
                  .sort((a, b) => a - b);
                let closest = sizes[0];
                for (const size of sizes) {
                  if (size <= nb) closest = size;
                  else break;
                }
                const rawClosest = SABS_719_WT[closest];
                return rawClosest || specsWallThicknessMm || 6.4;
              };
              const rawStub1NB = ASTM_STUB_WT[stub1NB];
              const autoWt = stub1NB
                ? isSABS719
                  ? getSabs719Wt(stub1NB)
                  : rawStub1NB || stub1NB * 0.05
                : null;
              const currentWt = stub0.wallThicknessMm;
              const wtOptions = isSABS719
                ? [
                    ...(autoWt
                      ? [
                          {
                            value: String(autoWt),
                            label: `${autoWt.toFixed(1)} (Auto)`,
                          },
                        ]
                      : []),
                    { value: "4.0", label: "4.0" },
                    { value: "5.0", label: "5.0" },
                    { value: "5.2", label: "5.2" },
                    { value: "6.0", label: "6.0" },
                    { value: "6.4", label: "6.4" },
                    { value: "8.0", label: "8.0" },
                    { value: "9.5", label: "9.5" },
                    { value: "10.0", label: "10.0" },
                    { value: "12.0", label: "12.0" },
                    { value: "12.7", label: "12.7" },
                  ].filter((opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx)
                : [
                    ...(autoWt
                      ? [
                          {
                            value: String(autoWt),
                            label: `${autoWt.toFixed(2)} (Auto)`,
                          },
                        ]
                      : []),
                    { value: "2.77", label: "2.77" },
                    { value: "3.38", label: "3.38" },
                    { value: "3.91", label: "3.91" },
                    { value: "5.16", label: "5.16" },
                    { value: "5.49", label: "5.49" },
                    { value: "6.02", label: "6.02" },
                    { value: "6.55", label: "6.55" },
                    { value: "7.11", label: "7.11" },
                    { value: "8.18", label: "8.18" },
                    { value: "9.27", label: "9.27" },
                    { value: "10.31", label: "10.31" },
                  ].filter((opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx);
              return (
                <Select
                  id={selectId}
                  value={currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""}
                  onChange={(value) => {
                    const rawStubs5 = specs.stubs;
                    const stubs = [...(rawStubs5 || [])];
                    const newWt = parseFloat(value) || 0;
                    const isOverride = autoWt && newWt !== autoWt;
                    stubs[0] = {
                      ...stubs[0],
                      wallThicknessMm: newWt,
                      wallThicknessOverride: isOverride,
                    };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  options={wtOptions}
                  placeholder="W/T"
                />
              );
            })()}
          </div>
        )}
        {/* Position on T1 - visible when stubs >= 1 */}
        {(rawNumberOfStubs6 || 0) >= 1 && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Position</label>
            {(() => {
              const selectId = `bend-stub1-angle-${entry.id}`;
              const angleOptions = [
                { value: "0", label: "0° (Top)" },
                { value: "45", label: "45°" },
                { value: "90", label: "90° (Side)" },
                { value: "135", label: "135°" },
                { value: "180", label: "180° (Bot)" },
                { value: "225", label: "225°" },
                { value: "270", label: "270° (Side)" },
                { value: "315", label: "315°" },
              ];
              const rawAngleDegrees = stub0.angleDegrees;
              return (
                <Select
                  id={selectId}
                  value={String(rawAngleDegrees || "0")}
                  onChange={(value) => {
                    const rawStubs6 = specs.stubs;
                    const stubs = [...(rawStubs6 || [])];
                    stubs[0] = {
                      ...stubs[0],
                      angleDegrees: parseInt(value, 10) || 0,
                      tangent: 1,
                    };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  options={angleOptions}
                  placeholder="Pos"
                />
              );
            })()}
          </div>
        )}
        {/* Length - visible when stubs >= 1 */}
        {(rawNumberOfStubs7 || 0) >= 1 && (
          <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
            <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
              Length (mm)
            </label>
            <input
              type="number"
              value={rawLength2 || ""}
              onChange={(e) => {
                const rawStubs7 = specs.stubs;
                const stubs = [...(rawStubs7 || [])];
                stubs[0] = { ...stubs[0], length: parseInt(e.target.value, 10) || 0 };
                const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                updatedEntry.description = generateItemDescription(updatedEntry);
                onUpdateEntry(entry.id, updatedEntry);
              }}
              className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
              placeholder="150"
            />
          </div>
        )}
        {/* Location - visible when stubs >= 1 */}
        {(rawNumberOfStubs8 || 0) >= 1 && (
          <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
            <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
              Location (mm)
            </label>
            <input
              type="number"
              value={rawLocationFromFlange || ""}
              onChange={(e) => {
                const rawStubs8 = specs.stubs;
                const stubs = [...(rawStubs8 || [])];
                stubs[0] = {
                  ...stubs[0],
                  locationFromFlange: parseInt(e.target.value, 10) || 0,
                };
                const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                updatedEntry.description = generateItemDescription(updatedEntry);
                onUpdateEntry(entry.id, updatedEntry);
              }}
              className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
              placeholder="From flange"
            />
          </div>
        )}
      </div>
      {/* Stub 1 Flange - shown below the row when stubs >= 1 */}
      {(rawNumberOfStubs9 || 0) >= 1 && (
        <div className="mt-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
          {(() => {
            const rawHasBlankFlange = stub0.hasBlankFlange;
            const rawNominalBoreMm6 = stub0.nominalBoreMm;
            const rawFlangeStandards2 = masterData.flangeStandards;
            const rawPressureClasses2 = masterData.pressureClasses;
            const rawWpb2 = specs.workingPressureBar;
            const rawGlobalWpb2 = globalSpecs?.workingPressureBar;
            const stub1WorkingPressure = rawWpb2 || rawGlobalWpb2 || 0;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                {/* Title as first column */}
                <div className="flex items-center">
                  <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                    Stub 1 Flange
                  </span>
                </div>
                {/* Standard */}
                <FlangeDropdownTriplet
                  flangeStandardId={stub0.flangeStandardId}
                  flangePressureClassId={stub0.flangePressureClassId}
                  flangeTypeCode={stub0.flangeTypeCode}
                  globalFlangeStandardId={globalSpecs?.flangeStandardId}
                  globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                  globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                  flangeStandards={rawFlangeStandards2 || []}
                  pressureClasses={rawPressureClasses2 || []}
                  pressureClassesByStandard={pressureClassesByStandard}
                  allFlangeTypes={allFlangeTypes}
                  workingPressureBar={stub1WorkingPressure}
                  onStandardChange={(standardId) => {
                    const rawStubs15 = specs.stubs;
                    const stubs = [...(rawStubs15 || [])];
                    stubs[0] = {
                      ...stubs[0],
                      flangeStandardId: standardId,
                      flangePressureClassId: undefined,
                      flangeTypeCode: undefined,
                    };
                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                  }}
                  onPressureClassChange={(classId) => {
                    const rawStubs16 = specs.stubs;
                    const stubs = [...(rawStubs16 || [])];
                    stubs[0] = { ...stubs[0], flangePressureClassId: classId };
                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                  }}
                  onFlangeTypeChange={(typeCode) => {
                    const rawStubs17 = specs.stubs;
                    const stubs = [...(rawStubs17 || [])];
                    stubs[0] = { ...stubs[0], flangeTypeCode: typeCode };
                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                  }}
                  onLoadPressureClasses={getFilteredPressureClasses}
                />
                <div className="flex items-end">
                  <label className="flex items-center gap-1.5 pb-1.5">
                    <input
                      type="checkbox"
                      checked={rawHasBlankFlange || false}
                      onChange={(e) => {
                        const rawStubs13 = specs.stubs;
                        const stubs = [...(rawStubs13 || [])];
                        stubs[0] = { ...stubs[0], hasBlankFlange: e.target.checked };
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, stubs },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-xs text-red-700 font-medium">
                      + Blank ({rawNominalBoreMm6 || "?"}NB)
                    </span>
                  </label>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Stub 2 Section - only show when 2 stubs AND 2 tangents selected */}
      {(rawNumberOfStubs10 || 0) >= 2 && (rawNumberOfTangents3 || 0) >= 2 && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
          <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
            Stub 2 <span className="text-gray-500 dark:text-gray-400 font-normal">(on T2)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                Steel Spec
                {stub1.steelSpecificationId && <span className="text-purple-600 ml-1">*</span>}
              </label>
              {(() => {
                const selectId = `bend-stub2-steel-spec-${entry.id}`;
                const rawSteelSpecificationId14 = stub1.steelSpecificationId;
                const stub2EffectiveSpecId =
                  rawSteelSpecificationId14 ||
                  specsSteelSpecificationId ||
                  globalSpecs?.steelSpecificationId;

                return (
                  <Select
                    id={selectId}
                    value={String(stub2EffectiveSpecId || "")}
                    onChange={(value) => {
                      const newSpecId = value ? Number(value) : undefined;
                      const rawStubs14 = specs.stubs;
                      const stubs = [...(rawStubs14 || [])];
                      stubs[1] = {
                        ...stubs[1],
                        steelSpecificationId: newSpecId,
                        nominalBoreMm: undefined,
                        wallThicknessMm: undefined,
                      };
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, stubs },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    options={[]}
                    groupedOptions={groupedSteelOptions}
                    placeholder="Spec"
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">NB</label>
              {(() => {
                const selectId = `bend-stub2-nb-${entry.id}`;
                const rawSteelSpecificationId15 = stub1.steelSpecificationId;
                const stub2EffectiveSpecId =
                  rawSteelSpecificationId15 ||
                  specsSteelSpecificationId ||
                  globalSpecs?.steelSpecificationId;
                const stub2SteelSpec = masterData.steelSpecs?.find(
                  (s: SteelSpecItem) => s.id === stub2EffectiveSpecId,
                );
                const rawSteelSpecName12 = stub2SteelSpec?.steelSpecName;
                const stub2SteelSpecName = rawSteelSpecName12 || "";
                const stub2FallbackNBs = entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
                  stub2SteelSpecName.includes(pattern),
                )?.[1];
                const allStub2Nbs = stub2FallbackNBs || [
                  15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                ];
                const rawNominalBoreMm7 = specs.nominalBoreMm;
                const mainBendNB = rawNominalBoreMm7 || 0;
                const stub2Nbs = allStub2Nbs.filter((nb: number) => nb <= mainBendNB);
                const options = stub2Nbs.map((nb: number) => ({
                  value: String(nb),
                  label: `${nb} NB`,
                }));

                return (
                  <Select
                    id={selectId}
                    value={stub1.nominalBoreMm ? String(entry.specs.stubs[1].nominalBoreMm) : ""}
                    onChange={(value) => {
                      const rawStubs15 = specs.stubs;
                      const stubs = [...(rawStubs15 || [])];
                      stubs[1] = {
                        ...stubs[1],
                        nominalBoreMm: parseInt(value, 10) || 0,
                      };
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, stubs },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    options={options}
                    placeholder="Select NB"
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                W/T (mm)
                {stub1.wallThicknessOverride ? (
                  <span className="text-purple-600 ml-1">(Override)</span>
                ) : stub1.nominalBoreMm ? (
                  <span className="text-green-600 ml-1">(Auto)</span>
                ) : null}
              </label>
              {(() => {
                const selectId = `bend-stub2-wt-${entry.id}`;
                const stub2NB = stub1.nominalBoreMm;
                const rawSteelSpecificationId16 = stub1.steelSpecificationId;
                const steelSpecId =
                  rawSteelSpecificationId16 ||
                  specsSteelSpecificationId ||
                  globalSpecs?.steelSpecificationId;
                const stub2SteelSpec = masterData.steelSpecs?.find(
                  (s: SteelSpecItem) => s.id === steelSpecId,
                );
                const rawSteelSpecName13 = stub2SteelSpec?.steelSpecName;
                const stub2SpecName = rawSteelSpecName13 || "";
                const isSABS719 =
                  stub2SpecName.includes("SABS 719") || stub2SpecName.includes("SANS 719");

                const SABS_719_WT: Record<number, number> = {
                  200: 5.2,
                  250: 5.2,
                  300: 6.4,
                  350: 6.4,
                  400: 6.4,
                  450: 6.4,
                  500: 6.4,
                  550: 6.4,
                  600: 6.4,
                  650: 8.0,
                  700: 8.0,
                  750: 8.0,
                  800: 8.0,
                  850: 9.5,
                  900: 9.5,
                  1000: 9.5,
                  1050: 9.5,
                  1200: 12.7,
                };
                const ASTM_STUB_WT: Record<number, number> = {
                  15: 2.77,
                  20: 2.87,
                  25: 3.38,
                  32: 3.56,
                  40: 3.68,
                  50: 3.91,
                  65: 5.16,
                  80: 5.49,
                  100: 6.02,
                  125: 6.55,
                  150: 7.11,
                  200: 8.18,
                  250: 9.27,
                  300: 10.31,
                };

                const getSabs719Wt = (nb: number): number => {
                  const sizes = keys(SABS_719_WT)
                    .map(Number)
                    .sort((a, b) => a - b);
                  let closest = sizes[0];
                  for (const size of sizes) {
                    if (size <= nb) closest = size;
                    else break;
                  }
                  const rawClosest2 = SABS_719_WT[closest];
                  return rawClosest2 || specsWallThicknessMm || 6.4;
                };

                const rawStub2NB = ASTM_STUB_WT[stub2NB];

                const autoWt = stub2NB
                  ? isSABS719
                    ? getSabs719Wt(stub2NB)
                    : rawStub2NB || stub2NB * 0.05
                  : null;
                const currentWt = stub1.wallThicknessMm;

                const wtOptions = isSABS719
                  ? [
                      ...(autoWt
                        ? [
                            {
                              value: String(autoWt),
                              label: `${autoWt.toFixed(1)} (Auto - SABS 719)`,
                            },
                          ]
                        : []),
                      { value: "4.0", label: "4.0 (WT4)" },
                      { value: "5.0", label: "5.0 (WT5)" },
                      { value: "5.2", label: "5.2" },
                      { value: "6.0", label: "6.0 (WT6)" },
                      { value: "6.4", label: "6.4" },
                      { value: "8.0", label: "8.0 (WT8)" },
                      { value: "9.5", label: "9.5" },
                      { value: "10.0", label: "10.0 (WT10)" },
                      { value: "12.0", label: "12.0 (WT12)" },
                      { value: "12.7", label: "12.7" },
                    ].filter((opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx)
                  : [
                      ...(autoWt
                        ? [
                            {
                              value: String(autoWt),
                              label: `${autoWt.toFixed(2)} (Auto)`,
                            },
                          ]
                        : []),
                      { value: "2.77", label: "2.77" },
                      { value: "3.38", label: "3.38" },
                      { value: "3.91", label: "3.91" },
                      { value: "5.16", label: "5.16" },
                      { value: "5.49", label: "5.49" },
                      { value: "6.02", label: "6.02" },
                      { value: "6.55", label: "6.55" },
                      { value: "7.11", label: "7.11" },
                      { value: "8.18", label: "8.18" },
                      { value: "9.27", label: "9.27" },
                      { value: "10.31", label: "10.31" },
                    ].filter(
                      (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx,
                    );

                return (
                  <Select
                    id={selectId}
                    value={currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""}
                    onChange={(value) => {
                      const rawStubs16 = specs.stubs;
                      const stubs = [...(rawStubs16 || [])];
                      const newWt = parseFloat(value) || 0;
                      const isOverride = autoWt && newWt !== autoWt;
                      stubs[1] = {
                        ...stubs[1],
                        wallThicknessMm: newWt,
                        wallThicknessOverride: isOverride,
                      };
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, stubs },
                      };
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    options={wtOptions}
                    placeholder="Select W/T"
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                Position <span className="text-gray-400">on T2</span>
              </label>
              {(() => {
                const selectId = `bend-stub2-angle-${entry.id}`;
                const angleOptions = [
                  { value: "0", label: "0° (Top)" },
                  { value: "45", label: "45°" },
                  { value: "90", label: "90° (Side)" },
                  { value: "135", label: "135°" },
                  { value: "180", label: "180° (Bottom)" },
                  { value: "225", label: "225°" },
                  { value: "270", label: "270° (Side)" },
                  { value: "315", label: "315°" },
                ];
                const rawAngleDegrees2 = stub1.angleDegrees;
                return (
                  <Select
                    id={selectId}
                    value={String(rawAngleDegrees2 || "0")}
                    onChange={(value) => {
                      const rawStubs17 = specs.stubs;
                      const stubs = [...(rawStubs17 || [])];
                      stubs[1] = {
                        ...stubs[1],
                        angleDegrees: parseInt(value, 10) || 0,
                        tangent: 2,
                      };
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, stubs },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    options={angleOptions}
                    placeholder="Select angle"
                  />
                );
              })()}
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
              <label className="block text-xs text-purple-800 mb-0.5">Length (mm)</label>
              <input
                type="number"
                value={rawLength3 || ""}
                onChange={(e) => {
                  const rawStubs18 = specs.stubs;
                  const stubs = [...(rawStubs18 || [])];
                  stubs[1] = {
                    ...stubs[1],
                    length: parseInt(e.target.value, 10) || 0,
                  };
                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                placeholder="150"
              />
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
              <label className="block text-xs text-purple-800 mb-0.5">Location (mm)</label>
              <input
                type="number"
                value={rawLocationFromFlange2 || ""}
                onChange={(e) => {
                  const rawStubs19 = specs.stubs;
                  const stubs = [...(rawStubs19 || [])];
                  stubs[1] = {
                    ...stubs[1],
                    locationFromFlange: parseInt(e.target.value, 10) || 0,
                  };
                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                }}
                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                placeholder="From flange"
              />
            </div>
          </div>
          {/* Stub 2 Flange - matching Stub 1 layout */}
          <div className="mt-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
            {(() => {
              const rawHasBlankFlange2 = stub1.hasBlankFlange;
              const rawNominalBoreMm8 = stub1.nominalBoreMm;
              const rawWpb = specs.workingPressureBar;
              const rawGlobalWpb = globalSpecs?.workingPressureBar;
              const stub2WorkingPressure = rawWpb || rawGlobalWpb || 0;
              const rawFlangeStandards3 = masterData.flangeStandards;
              const rawPressureClasses3 = masterData.pressureClasses;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  {/* Title as first column */}
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                      Stub 2 Flange
                    </span>
                  </div>
                  <FlangeDropdownTriplet
                    flangeStandardId={stub1.flangeStandardId}
                    flangePressureClassId={stub1.flangePressureClassId}
                    flangeTypeCode={stub1.flangeTypeCode}
                    globalFlangeStandardId={globalSpecs?.flangeStandardId}
                    globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                    globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                    flangeStandards={rawFlangeStandards3 || []}
                    pressureClasses={rawPressureClasses3 || []}
                    pressureClassesByStandard={pressureClassesByStandard}
                    allFlangeTypes={allFlangeTypes}
                    workingPressureBar={stub2WorkingPressure}
                    onStandardChange={(standardId) => {
                      const rawStubs = specs.stubs;
                      const currentStubs = [...(rawStubs || [])];
                      currentStubs[1] = {
                        ...currentStubs[1],
                        flangeStandardId: standardId,
                        flangePressureClassId: undefined,
                        flangeTypeCode: undefined,
                      };
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, stubs: currentStubs },
                      });
                    }}
                    onPressureClassChange={(classId) => {
                      const rawStubs2 = specs.stubs;
                      const currentStubs = [...(rawStubs2 || [])];
                      currentStubs[1] = {
                        ...currentStubs[1],
                        flangePressureClassId: classId,
                      };
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, stubs: currentStubs },
                      });
                    }}
                    onFlangeTypeChange={(typeCode) => {
                      const rawStubs3 = specs.stubs;
                      const currentStubs = [...(rawStubs3 || [])];
                      currentStubs[1] = { ...currentStubs[1], flangeTypeCode: typeCode };
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, stubs: currentStubs },
                      });
                    }}
                    onLoadPressureClasses={getFilteredPressureClasses}
                  />
                  <div className="flex items-end">
                    <label className="flex items-center gap-1.5 pb-1.5">
                      <input
                        type="checkbox"
                        checked={rawHasBlankFlange2 || false}
                        onChange={(e) => {
                          const rawStubs24 = specs.stubs;
                          const stubs = [...(rawStubs24 || [])];
                          stubs[1] = {
                            ...stubs[1],
                            hasBlankFlange: e.target.checked,
                          };
                          const updatedEntry = {
                            ...entry,
                            specs: { ...entry.specs, stubs },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-xs text-red-700 font-medium">
                        + Blank ({rawNominalBoreMm8 || "?"}NB)
                      </span>
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export const BendStubConnectionsSection = memo(BendStubConnectionsSectionInner);
