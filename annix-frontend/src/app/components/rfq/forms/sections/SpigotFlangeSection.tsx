"use client";

import { flangeTypesForStandardCode } from "@/app/lib/query/hooks";
import type { FlangeStandardItem, PressureClassItem } from "../shared";

interface SpigotFlangeSectionProps {
  entryId: string;
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  pressureClassesByStandard: Record<number, any[]>;
  allFlangeTypes: any[];
  onUpdateEntry: (id: string, updates: any) => void;
}

export function SpigotFlangeSection(props: SpigotFlangeSectionProps) {
  const rawFlangeStandardId = props.specs.flangeStandardId;
  const mainFlangeStandardId = rawFlangeStandardId || props.globalSpecs?.flangeStandardId;
  const rawSpigotFlangeStandardId = props.specs.spigotFlangeStandardId;
  const spigotFlangeStandardId = rawSpigotFlangeStandardId || mainFlangeStandardId;
  const isStandardFromMain = !props.specs.spigotFlangeStandardId;

  const rawFlangePressureClassId = props.specs.flangePressureClassId;
  const mainPressureClassId = rawFlangePressureClassId || props.globalSpecs?.flangePressureClassId;
  const rawSpigotFlangePressureClassId = props.specs.spigotFlangePressureClassId;
  const spigotPressureClassId = rawSpigotFlangePressureClassId || mainPressureClassId;
  const isClassFromMain = !props.specs.spigotFlangePressureClassId;

  const rawFlangeTypeCode = props.specs.flangeTypeCode;
  const mainFlangeTypeCode = rawFlangeTypeCode || props.globalSpecs?.flangeTypeCode;
  const rawSpigotFlangeTypeCode = props.specs.spigotFlangeTypeCode;
  const spigotFlangeTypeCode = rawSpigotFlangeTypeCode || mainFlangeTypeCode;
  const isTypeFromMain = !props.specs.spigotFlangeTypeCode;

  const rawSpigotFlangeConfig = props.specs.spigotFlangeConfig;
  const spigotFlangeConfig = rawSpigotFlangeConfig || "PE";

  const selectedStandard = props.masterData.flangeStandards?.find(
    (fs: FlangeStandardItem) => fs.id === spigotFlangeStandardId,
  );
  const isSabs1123 =
    selectedStandard?.code?.toUpperCase().includes("SABS") &&
    selectedStandard?.code?.includes("1123");
  const isBs4504 =
    selectedStandard?.code?.toUpperCase().includes("BS") &&
    selectedStandard?.code?.includes("4504");
  const showFlangeType = isSabs1123 || isBs4504;

  const rawPressureClasses = props.pressureClassesByStandard[spigotFlangeStandardId];
  const availablePressureClasses = spigotFlangeStandardId
    ? rawPressureClasses ||
      props.masterData.pressureClasses?.filter(
        (pc: PressureClassItem) =>
          pc.flangeStandardId === spigotFlangeStandardId ||
          pc.standardId === spigotFlangeStandardId,
      ) ||
      []
    : [];

  const rawNumberOfSpigots = props.specs.numberOfSpigots;
  const numberOfSpigots = rawNumberOfSpigots || 2;
  const rawSpigotBlankFlanges = props.specs.spigotBlankFlanges;
  const spigotBlankFlanges = rawSpigotBlankFlanges || [];

  const mainSelectClass =
    "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-green-500";
  const overrideSelectClass =
    "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-yellow-500";
  const defaultSelectClass =
    "w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-teal-300";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Standard
            {isStandardFromMain && <span className="ml-1 text-green-600 font-normal">(Main)</span>}
          </label>
          <select
            value={spigotFlangeStandardId || ""}
            onChange={(e) => {
              const newStandardId = e.target.value ? Number(e.target.value) : undefined;
              props.onUpdateEntry(props.entryId, {
                specs: {
                  ...props.entry.specs,
                  spigotFlangeStandardId: newStandardId,
                  spigotFlangePressureClassId: undefined,
                  spigotFlangeTypeCode: undefined,
                },
              });
            }}
            className={isStandardFromMain ? mainSelectClass : overrideSelectClass}
          >
            <option value="">Select...</option>
            {props.masterData.flangeStandards?.map((fs: FlangeStandardItem) => (
              <option key={fs.id} value={fs.id}>
                {fs.code?.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Class
            {isClassFromMain && <span className="ml-1 text-green-600 font-normal">(Main)</span>}
          </label>
          <select
            value={spigotPressureClassId || ""}
            onChange={(e) => {
              props.onUpdateEntry(props.entryId, {
                specs: {
                  ...props.entry.specs,
                  spigotFlangePressureClassId: e.target.value ? Number(e.target.value) : undefined,
                },
              });
            }}
            className={isClassFromMain ? mainSelectClass : overrideSelectClass}
          >
            <option value="">Select...</option>
            {availablePressureClasses.map((pc: PressureClassItem) => (
              <option key={pc.id} value={pc.id}>
                {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Type
            {isTypeFromMain && showFlangeType && (
              <span className="ml-1 text-green-600 font-normal">(Main)</span>
            )}
          </label>
          {showFlangeType ? (
            <select
              value={spigotFlangeTypeCode || ""}
              onChange={(e) => {
                const rawValue = e.target.value;
                props.onUpdateEntry(props.entryId, {
                  specs: {
                    ...props.entry.specs,
                    spigotFlangeTypeCode: rawValue || undefined,
                  },
                });
              }}
              className={isTypeFromMain ? mainSelectClass : overrideSelectClass}
            >
              <option value="">Select...</option>
              {(isSabs1123
                ? flangeTypesForStandardCode(props.allFlangeTypes, "SABS 1123") || []
                : flangeTypesForStandardCode(props.allFlangeTypes, "BS 4504") || []
              ).map((ft) => (
                <option key={ft.code} value={ft.code}>
                  {ft.name} ({ft.code})
                </option>
              ))}
            </select>
          ) : (
            <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500">
              N/A
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Spigot Config</label>
          <select
            value={spigotFlangeConfig}
            onChange={(e) => {
              props.onUpdateEntry(props.entryId, {
                specs: {
                  ...props.entry.specs,
                  spigotFlangeConfig: e.target.value,
                },
              });
            }}
            className={defaultSelectClass}
          >
            <option value="PE">PE - Plain End</option>
            <option value="FAE">FAE - Flanged All Ends</option>
            <option value="RF">R/F - Rotating Flange</option>
          </select>
        </div>
      </div>
      {spigotFlangeConfig !== "PE" && (
        <div className="mt-2 flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-gray-900">Blank Flanges:</span>
          {Array.from({ length: numberOfSpigots }, (_, i) => (
            <label key={i} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={spigotBlankFlanges.includes(i + 1)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const newBlanks = checked
                    ? [...spigotBlankFlanges, i + 1]
                    : spigotBlankFlanges.filter((s: number) => s !== i + 1);
                  props.onUpdateEntry(props.entryId, {
                    specs: {
                      ...props.entry.specs,
                      spigotBlankFlanges: newBlanks.sort((a: number, b: number) => a - b),
                    },
                  });
                }}
                className="w-3.5 h-3.5 text-teal-600 border-teal-400 rounded focus:ring-teal-500"
              />
              <span className="text-xs text-gray-800">S{i + 1}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}
