"use client";

import { useMemo } from "react";
import { BS_4504_PRESSURE_CLASSES, SABS_1123_PRESSURE_CLASSES } from "@/app/lib/config/rfq";
import { flangeTypesForStandardCode } from "@/app/lib/query/hooks";
import type { MasterData } from "@/app/lib/types/rfqTypes";

type FlangeStandardItem = NonNullable<MasterData["flangeStandards"]>[number];
type PressureClassItem = NonNullable<MasterData["pressureClasses"]>[number];

interface FlangeDropdownTripletProps {
  flangeStandardId: number | undefined;
  flangePressureClassId: number | undefined;
  flangeTypeCode: string | undefined;
  globalFlangeStandardId: number | undefined;
  globalFlangePressureClassId: number | undefined;
  globalFlangeTypeCode: string | undefined;
  flangeStandards: FlangeStandardItem[];
  pressureClasses: PressureClassItem[];
  pressureClassesByStandard: Record<number, PressureClassItem[]>;
  allFlangeTypes: Array<{
    id: number;
    code: string;
    name: string;
    abbreviation: string;
    description?: string;
    standardReference?: string;
  }>;
  workingPressureBar: number;
  onStandardChange: (standardId: number | undefined) => void;
  onPressureClassChange: (classId: number | undefined) => void;
  onFlangeTypeChange: (typeCode: string | undefined) => void;
  onLoadPressureClasses: (standardId: number) => void;
}

const BASE =
  "w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
const DEFAULT_CLS = `${BASE} border border-gray-300 dark:border-gray-600`;
const GLOBAL_CLS = `${BASE} border-2 border-green-500 dark:border-lime-400`;
const OVERRIDE_CLS = `${BASE} border-2 border-yellow-500 dark:border-yellow-400`;
const UNSUITABLE_CLS = `${BASE} border-2 border-red-500 dark:border-red-400`;

function statusClass(isUnsuitable: boolean, isFromGlobal: boolean, isOverride: boolean): string {
  if (isUnsuitable) return UNSUITABLE_CLS;
  if (isFromGlobal) return GLOBAL_CLS;
  if (isOverride) return OVERRIDE_CLS;
  return DEFAULT_CLS;
}

export function FlangeDropdownTriplet(props: FlangeDropdownTripletProps) {
  const {
    flangeStandardId,
    flangePressureClassId,
    flangeTypeCode,
    globalFlangeStandardId,
    globalFlangePressureClassId,
    globalFlangeTypeCode,
    flangeStandards,
    pressureClasses: allPressureClasses,
    pressureClassesByStandard,
    allFlangeTypes,
    workingPressureBar,
    onStandardChange,
    onPressureClassChange,
    onFlangeTypeChange,
    onLoadPressureClasses,
  } = props;

  const effectiveStandardId = flangeStandardId || globalFlangeStandardId;
  const effectiveClassId = flangePressureClassId || globalFlangePressureClassId;
  const effectiveTypeCode = flangeTypeCode || globalFlangeTypeCode;

  const selectedStandard = useMemo(
    () => flangeStandards?.find((fs) => fs.id === effectiveStandardId),
    [flangeStandards, effectiveStandardId],
  );

  const codeUpper = selectedStandard?.code?.toUpperCase() || "";
  const isSabs1123 =
    (codeUpper.includes("SABS") || codeUpper.includes("SANS")) && codeUpper.includes("1123");
  const isBs4504 = codeUpper.includes("BS") && codeUpper.includes("4504");
  const showFlangeType = isSabs1123 || isBs4504;

  const normalizedTypeCode = useMemo(() => {
    if (!effectiveTypeCode) return "";
    return effectiveTypeCode.replace(/^\//, "");
  }, [effectiveTypeCode]);

  const isStandardFromGlobal = !flangeStandardId && !!globalFlangeStandardId;
  const isStandardOverride =
    !!flangeStandardId && !!globalFlangeStandardId && flangeStandardId !== globalFlangeStandardId;

  const selectedClass = useMemo(
    () => allPressureClasses?.find((p) => p.id === effectiveClassId),
    [allPressureClasses, effectiveClassId],
  );

  const globalClass = useMemo(
    () => allPressureClasses?.find((p) => p.id === globalFlangePressureClassId),
    [allPressureClasses, globalFlangePressureClassId],
  );

  const effectiveBasePressure = selectedClass?.designation?.replace(/\/\d+$/, "") || "";
  const globalBasePressure = globalClass?.designation?.replace(/\/\d+$/, "") || "";
  const isClassFromGlobal =
    !!globalFlangePressureClassId && effectiveBasePressure === globalBasePressure;
  const isClassOverride =
    !!globalFlangePressureClassId && effectiveBasePressure !== globalBasePressure;

  const isTypeFromGlobal = !!globalFlangeTypeCode && effectiveTypeCode === globalFlangeTypeCode;
  const isTypeOverride = !!globalFlangeTypeCode && effectiveTypeCode !== globalFlangeTypeCode;

  const isPressureClassUnsuitable = useMemo(() => {
    if (!selectedStandard?.code || !selectedClass?.designation || workingPressureBar <= 0)
      return false;
    const code = selectedStandard.code.toUpperCase();
    const designation = selectedClass.designation.toUpperCase();
    const classValue = parseInt(designation.match(/\d+/)?.[0] || "0", 10);
    if (classValue === 0) return false;
    if ((code.includes("SABS") || code.includes("SANS")) && code.includes("1123")) {
      return classValue / 100 < workingPressureBar;
    }
    if (code.includes("BS") && code.includes("4504")) {
      return classValue < workingPressureBar;
    }
    return false;
  }, [selectedStandard?.code, selectedClass?.designation, workingPressureBar]);

  const filteredClasses = useMemo(() => {
    if (!effectiveStandardId) return [];
    const byStandard = pressureClassesByStandard[effectiveStandardId];
    if (byStandard && byStandard.length > 0) return byStandard;
    return (
      allPressureClasses?.filter(
        (pc) =>
          pc.flangeStandardId === effectiveStandardId || pc.standardId === effectiveStandardId,
      ) || []
    );
  }, [effectiveStandardId, pressureClassesByStandard, allPressureClasses]);

  const flangeTypes = useMemo(
    () =>
      showFlangeType
        ? flangeTypesForStandardCode(allFlangeTypes, isSabs1123 ? "SABS 1123" : "BS 4504") || []
        : [],
    [showFlangeType, allFlangeTypes, isSabs1123],
  );

  const resolveMatchingPc = (pcValue: string): PressureClassItem | undefined => {
    const equivalentValue = pcValue === "64" ? "63" : pcValue;
    const targetDesignation = normalizedTypeCode ? `${pcValue}/${normalizedTypeCode}` : null;
    return allPressureClasses?.find((mpc) => {
      if (targetDesignation && mpc.designation === targetDesignation) return true;
      return mpc.designation?.includes(pcValue) || mpc.designation?.includes(equivalentValue);
    });
  };

  const standardSelectClass = statusClass(false, isStandardFromGlobal, isStandardOverride);
  const classSelectClass = statusClass(
    isPressureClassUnsuitable,
    isClassFromGlobal,
    isClassOverride,
  );
  const typeSelectClass = statusClass(
    false,
    isTypeFromGlobal && showFlangeType,
    isTypeOverride && showFlangeType,
  );

  return (
    <>
      {/* Flange Standard */}
      <div>
        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Standard
          {isStandardFromGlobal && (
            <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
          )}
          {isStandardOverride && (
            <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
          )}
          <span
            className="ml-1 text-gray-400 font-normal cursor-help"
            title="Flange standard determines pressure class options and flange dimensions"
          >
            ?
          </span>
        </label>
        <select
          value={effectiveStandardId || ""}
          onChange={(e) => {
            const standardId = parseInt(e.target.value, 10) || undefined;
            onStandardChange(standardId);
            if (standardId) {
              onLoadPressureClasses(standardId);
            }
          }}
          className={standardSelectClass}
        >
          <option value="">Select...</option>
          {flangeStandards?.map((standard) => (
            <option key={standard.id} value={standard.id}>
              {standard.code}
            </option>
          ))}
        </select>
      </div>

      {/* Pressure Class */}
      <div>
        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {isSabs1123 ? "Class (kPa)" : "Class"}
          {isPressureClassUnsuitable && (
            <span className="ml-1 text-red-600 font-bold">(NOT SUITABLE)</span>
          )}
          {!isPressureClassUnsuitable && isClassFromGlobal && (
            <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
          )}
          {!isPressureClassUnsuitable && isClassOverride && (
            <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
          )}
          <span
            className="ml-1 text-gray-400 font-normal cursor-help"
            title="Flange pressure rating. Should match or exceed working pressure."
          >
            ?
          </span>
        </label>
        {showFlangeType ? (
          <select
            value={effectiveClassId || ""}
            onChange={(e) => onPressureClassChange(parseInt(e.target.value, 10) || undefined)}
            className={classSelectClass}
            onFocus={() => {
              if (effectiveStandardId && !pressureClassesByStandard[effectiveStandardId]) {
                onLoadPressureClasses(effectiveStandardId);
              }
            }}
          >
            <option value="">Select Class...</option>
            {(isSabs1123 ? SABS_1123_PRESSURE_CLASSES : BS_4504_PRESSURE_CLASSES).map((pc) => {
              const matchingPc = resolveMatchingPc(String(pc.value));
              if (!matchingPc) return null;
              return (
                <option key={matchingPc.id} value={matchingPc.id}>
                  {isSabs1123 ? pc.value : pc.label}
                </option>
              );
            })}
          </select>
        ) : (
          <select
            value={effectiveClassId || ""}
            onChange={(e) => onPressureClassChange(parseInt(e.target.value, 10) || undefined)}
            className={classSelectClass}
            onFocus={() => {
              if (effectiveStandardId && !pressureClassesByStandard[effectiveStandardId]) {
                onLoadPressureClasses(effectiveStandardId);
              }
            }}
          >
            <option value="">Select Class...</option>
            {filteredClasses.map((pc: PressureClassItem) => (
              <option key={pc.id} value={pc.id}>
                {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Flange Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Type
          {isTypeFromGlobal && showFlangeType && (
            <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
          )}
          {isTypeOverride && showFlangeType && (
            <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
          )}
        </label>
        {showFlangeType ? (
          <select
            value={effectiveTypeCode || ""}
            onChange={(e) => {
              const val = e.target.value;
              onFlangeTypeChange(val || undefined);
            }}
            className={typeSelectClass}
          >
            <option value="">Select...</option>
            {flangeTypes.map((ft) => (
              <option key={ft.code} value={ft.code} title={ft.description}>
                {ft.name} ({ft.code})
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            N/A
          </div>
        )}
      </div>
    </>
  );
}
