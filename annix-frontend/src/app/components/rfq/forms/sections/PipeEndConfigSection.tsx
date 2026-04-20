"use client";

import { Select } from "@/app/components/ui/Select";
import {
  PIPE_END_OPTIONS,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
} from "@/app/lib/config/rfq";
import { log } from "@/app/lib/logger";
import { getPipeEndConfigurationDetails } from "@/app/lib/utils/systemUtils";
import type { FlangeStandardItem, PressureClassItem } from "../shared";
import { FlangeDropdownTriplet } from "./FlangeDropdownTriplet";

interface PipeEndConfigSectionProps {
  entryId: string;
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  pressureClassesByStandard: Record<number, any[]>;
  allFlangeTypes: any[];
  generateItemDescription: (entry: any) => string;
  onUpdateEntry: (id: string, updates: any) => void;
  onLoadPressureClasses: (standardId: number) => void;
}

export function PipeEndConfigSection(props: PipeEndConfigSectionProps) {
  const rawPipeEndConfiguration = props.specs.pipeEndConfiguration;
  const pipeEndConfig = rawPipeEndConfiguration || "PE";
  const configUpper = pipeEndConfig.toUpperCase();
  const hasInletFlange = ["FBE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"].includes(configUpper);
  const hasOutletFlange = ["FOE", "FBE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"].includes(configUpper);
  const hasFlanges = hasInletFlange || hasOutletFlange;
  const availableBlankPositions: { key: string; label: string }[] = [
    ...(hasInletFlange ? [{ key: "inlet", label: "End A" }] : []),
    ...(hasOutletFlange ? [{ key: "outlet", label: "End B" }] : []),
  ];
  const rawBlankFlangePositions = props.specs.blankFlangePositions;
  const currentBlankPositions = rawBlankFlangePositions || [];
  const rawPipeEndConfiguration2 = props.entry.specs.pipeEndConfiguration;
  const rawWorkingPressureBar = props.specs.workingPressureBar;
  const rawGlobalWorkingPressureBar = props.globalSpecs?.workingPressureBar;
  const effectiveWorkingPressure = rawWorkingPressureBar || rawGlobalWorkingPressureBar || 0;

  const rawFlangeStandards = props.masterData.flangeStandards;
  const flangeStandards = rawFlangeStandards || [];
  const rawPressureClasses = props.masterData.pressureClasses;
  const pressureClasses = rawPressureClasses || [];
  const rawGlobalFlangeStandardId = props.globalSpecs?.flangeStandardId;
  const rawGlobalFlangePressureClassId = props.globalSpecs?.flangePressureClassId;
  const rawGlobalFlangeTypeCode = props.globalSpecs?.flangeTypeCode;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <FlangeDropdownTriplet
          flangeStandardId={props.specs.flangeStandardId}
          flangePressureClassId={props.specs.flangePressureClassId}
          flangeTypeCode={props.specs.flangeTypeCode}
          globalFlangeStandardId={rawGlobalFlangeStandardId}
          globalFlangePressureClassId={rawGlobalFlangePressureClassId}
          globalFlangeTypeCode={rawGlobalFlangeTypeCode}
          flangeStandards={flangeStandards}
          pressureClasses={pressureClasses}
          pressureClassesByStandard={props.pressureClassesByStandard}
          allFlangeTypes={props.allFlangeTypes}
          workingPressureBar={effectiveWorkingPressure}
          onStandardChange={(standardId) => {
            const rawStandards = props.masterData.flangeStandards;
            const newStandard = rawStandards?.find((s: FlangeStandardItem) => s.id === standardId);
            const rawNewStandardCode = newStandard?.code;
            const newStandardCode = rawNewStandardCode || "";
            const rawEndConfig = props.specs.pipeEndConfiguration;
            const endConfig = rawEndConfig || "PE";
            const rawSpecsFlangeTypeCode = props.specs.flangeTypeCode;
            const rawGlobalFlangeType = props.globalSpecs?.flangeTypeCode;
            const effectiveFlangeTypeCode =
              rawSpecsFlangeTypeCode || rawGlobalFlangeType || recommendedFlangeTypeCode(endConfig);
            const rawSpecsWp = props.specs.workingPressureBar;
            const rawGlobalWp = props.globalSpecs?.workingPressureBar;
            const workingPressure = rawSpecsWp || rawGlobalWp || 0;
            let newPressureClassId: number | undefined;
            if (standardId && workingPressure > 0) {
              const rawClassesByStandard = props.pressureClassesByStandard[standardId];
              let availableClasses = rawClassesByStandard || [];
              if (availableClasses.length === 0) {
                const rawMasterPressureClasses = props.masterData.pressureClasses;
                const filteredClasses = rawMasterPressureClasses?.filter(
                  (pc: PressureClassItem) =>
                    pc.flangeStandardId === standardId || pc.standardId === standardId,
                );
                availableClasses = filteredClasses || [];
              }
              if (availableClasses.length > 0) {
                newPressureClassId =
                  recommendedPressureClassId(
                    workingPressure,
                    availableClasses,
                    newStandardCode,
                    effectiveFlangeTypeCode,
                  ) || undefined;
              }
            }
            const updatedEntry = {
              ...props.entry,
              specs: {
                ...props.entry.specs,
                flangeStandardId: standardId,
                flangeTypeCode: effectiveFlangeTypeCode,
                flangePressureClassId: newPressureClassId,
              },
            };
            const newDescription = props.generateItemDescription(updatedEntry);
            props.onUpdateEntry(props.entryId, {
              specs: updatedEntry.specs,
              description: newDescription,
            });
          }}
          onPressureClassChange={(classId) => {
            const updatedEntry = {
              ...props.entry,
              specs: { ...props.entry.specs, flangePressureClassId: classId },
            };
            const newDescription = props.generateItemDescription(updatedEntry);
            props.onUpdateEntry(props.entryId, {
              specs: updatedEntry.specs,
              description: newDescription,
            });
          }}
          onFlangeTypeChange={(typeCode) => {
            const updatedEntry = {
              ...props.entry,
              specs: { ...props.entry.specs, flangeTypeCode: typeCode },
            };
            const newDescription = props.generateItemDescription(updatedEntry);
            props.onUpdateEntry(props.entryId, {
              specs: updatedEntry.specs,
              description: newDescription,
            });
          }}
          onLoadPressureClasses={props.onLoadPressureClasses}
        />

        <div data-nix-target="pipe-end-config-select">
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
            Config
            <span
              className="ml-1 text-gray-400 font-normal cursor-help"
              title="PE = Plain End (no flanges, for butt welding to other pipes). FOE = Flanged One End (connect to equipment/valve). FBE = Flanged Both Ends (spool piece). L/F = Loose Flange (slip-on, easier bolt alignment). R/F = Rotating Flange (backing ring allows rotation for bolt hole alignment)."
            >
              ?
            </span>
          </label>
          {props.specs.pipeType === "spigot" ? (
            <div className="px-2 py-1.5 bg-teal-100 border border-teal-300 rounded text-xs text-teal-800 font-medium">
              FBE - Flanged Both Ends
            </div>
          ) : (
            <Select
              id={`pipe-config-${props.entryId}`}
              value={rawPipeEndConfiguration2 || (props.specs.pipeType === "puddle" ? "FOE" : "PE")}
              onChange={async (value) => {
                const newConfig = value;
                let weldDetails = null;
                try {
                  weldDetails = await getPipeEndConfigurationDetails(newConfig);
                } catch (error) {
                  log.warn("Could not get pipe end configuration details:", error);
                }

                const rawGlobalFlangeType2 = props.globalSpecs?.flangeTypeCode;
                const effectiveFlangeTypeCode =
                  rawGlobalFlangeType2 || recommendedFlangeTypeCode(newConfig);
                const rawSpecsFlangeStdId = props.specs.flangeStandardId;
                const rawGlobalFlangeStdId = props.globalSpecs?.flangeStandardId;
                const flangeStdId = rawSpecsFlangeStdId || rawGlobalFlangeStdId;
                const rawMasterFlangeStds = props.masterData.flangeStandards;
                const matchedStandard = rawMasterFlangeStds?.find(
                  (s: FlangeStandardItem) => s.id === flangeStdId,
                );
                const rawMatchedCode = matchedStandard?.code;
                const flangeStdCode = rawMatchedCode || "";
                const rawSpecsWp2 = props.specs.workingPressureBar;
                const rawGlobalWp2 = props.globalSpecs?.workingPressureBar;
                const wp = rawSpecsWp2 || rawGlobalWp2 || 0;
                const rawClassesByStd = flangeStdId
                  ? props.pressureClassesByStandard[flangeStdId]
                  : null;
                let availableClasses = rawClassesByStd || [];
                if (availableClasses.length === 0 && flangeStdId) {
                  const rawMasterPc = props.masterData.pressureClasses;
                  const filteredPc = rawMasterPc?.filter(
                    (pc: PressureClassItem) =>
                      pc.flangeStandardId === flangeStdId || pc.standardId === flangeStdId,
                  );
                  availableClasses = filteredPc || [];
                }
                const rawSpecsPcId = props.specs.flangePressureClassId;
                const rawGlobalPcId = props.globalSpecs?.flangePressureClassId;
                const newPressureClassId =
                  wp > 0 && availableClasses.length > 0
                    ? recommendedPressureClassId(
                        wp,
                        availableClasses,
                        flangeStdCode,
                        effectiveFlangeTypeCode,
                      )
                    : rawSpecsPcId || rawGlobalPcId;

                const updatedEntry: any = {
                  specs: {
                    ...props.entry.specs,
                    pipeEndConfiguration: newConfig,
                    blankFlangePositions: [],
                    addBlankFlange: false,
                    blankFlangeCount: 0,
                    flangeTypeCode: effectiveFlangeTypeCode,
                    ...(newPressureClassId && {
                      flangePressureClassId: newPressureClassId,
                    }),
                  },
                  ...(weldDetails && { weldInfo: weldDetails }),
                };
                updatedEntry.description = props.generateItemDescription({
                  ...props.entry,
                  ...updatedEntry,
                });
                props.onUpdateEntry(props.entryId, updatedEntry);
                if (props.specs.pipeType === "plain" || !props.specs.pipeType) {
                  setTimeout(() => {
                    const pipeLengthInput = document.getElementById(
                      `pipe-length-${props.entryId}`,
                    ) as HTMLInputElement;
                    if (pipeLengthInput) {
                      pipeLengthInput.focus();
                      pipeLengthInput.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      pipeLengthInput.select();
                    }
                  }, 100);
                }
                if (props.specs.pipeType === "puddle") {
                  setTimeout(() => {
                    const puddleOdInput = document.getElementById(
                      `puddle-od-${props.entryId}`,
                    ) as HTMLInputElement;
                    if (puddleOdInput) {
                      puddleOdInput.focus();
                      puddleOdInput.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      puddleOdInput.select();
                    }
                  }, 100);
                }
              }}
              options={
                props.specs.pipeType === "puddle"
                  ? [
                      { value: "PE", label: "PE - Plain Ended" },
                      { value: "FOE", label: "FOE - Flanged One End" },
                      { value: "FBE", label: "FBE - Flanged Both Ends" },
                    ]
                  : [...PIPE_END_OPTIONS]
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
            />
          )}
        </div>
      </div>
      {hasFlanges && availableBlankPositions.length > 0 && (
        <div className="mt-2 flex justify-end">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-900">Blank:</span>
            <span
              className="text-gray-400 font-normal cursor-help text-xs"
              title="Add blank flanges for hydrostatic testing, isolation, or future connections. Select both ends when pipes will be tested individually before installation."
            >
              ?
            </span>
            {availableBlankPositions.map((pos) => (
              <label key={pos.key} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentBlankPositions.includes(pos.key)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newPositions = checked
                      ? [...currentBlankPositions, pos.key]
                      : currentBlankPositions.filter((p: string) => p !== pos.key);
                    props.onUpdateEntry(props.entryId, {
                      specs: {
                        ...props.entry.specs,
                        addBlankFlange: newPositions.length > 0,
                        blankFlangeCount: newPositions.length,
                        blankFlangePositions: newPositions,
                      },
                    });
                  }}
                  className="w-3.5 h-3.5 text-amber-600 border-amber-400 dark:border-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-xs text-gray-800 dark:text-gray-900">{pos.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
