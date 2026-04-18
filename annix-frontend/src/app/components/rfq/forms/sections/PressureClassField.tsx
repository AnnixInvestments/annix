"use client";

import { useMemo } from "react";
import { BS_4504_PRESSURE_CLASSES, SABS_1123_PRESSURE_CLASSES } from "@/app/lib/config/rfq";
import type { MasterData } from "@/app/lib/types/rfqTypes";

type PressureClassItem = NonNullable<MasterData["pressureClasses"]>[number];

interface PressureClassFieldProps {
  value: number | undefined;
  onChange: (classId: number | undefined) => void;
  flangeStandardCode: string;
  flangeTypeCode: string | undefined;
  isFromGlobal: boolean;
  isOverride: boolean;
  isUnsuitable: boolean;
  pressureClasses: PressureClassItem[];
  masterDataPressureClasses: PressureClassItem[];
  onFocus?: () => void;
}

const BASE_CLASS =
  "w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
const BORDER_DEFAULT = `${BASE_CLASS} border border-gray-300 dark:border-gray-600`;
const BORDER_GLOBAL = `${BASE_CLASS} border-2 border-green-500 dark:border-lime-400`;
const BORDER_OVERRIDE = `${BASE_CLASS} border-2 border-yellow-500 dark:border-yellow-400`;
const BORDER_UNSUITABLE = `${BASE_CLASS} border-2 border-red-500 dark:border-red-400`;

export function PressureClassField(props: PressureClassFieldProps) {
  const {
    value,
    onChange,
    flangeStandardCode,
    flangeTypeCode,
    isFromGlobal,
    isOverride,
    isUnsuitable,
    pressureClasses,
    masterDataPressureClasses,
    onFocus,
  } = props;

  const codeUpper = flangeStandardCode.toUpperCase();
  const isSabs1123 =
    (codeUpper.includes("SABS") || codeUpper.includes("SANS")) && codeUpper.includes("1123");
  const isBs4504 = codeUpper.includes("BS") && codeUpper.includes("4504");
  const hasThreeDropdowns = isSabs1123 || isBs4504;

  const normalizedTypeCode = useMemo(() => {
    if (!flangeTypeCode) return null;
    const trimmed = flangeTypeCode.replace(/^\//, "");
    return trimmed || null;
  }, [flangeTypeCode]);

  const selectClass = isUnsuitable
    ? BORDER_UNSUITABLE
    : isFromGlobal
      ? BORDER_GLOBAL
      : isOverride
        ? BORDER_OVERRIDE
        : BORDER_DEFAULT;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parsed = parseInt(e.target.value, 10);
    onChange(Number.isNaN(parsed) ? undefined : parsed);
  };

  const label = isSabs1123 ? "Class (kPa)" : "Class";

  const resolveMatchingPc = (pcValue: string): PressureClassItem | undefined => {
    const equivalentValue = pcValue === "64" ? "63" : pcValue;
    const targetDesignation = normalizedTypeCode ? `${pcValue}/${normalizedTypeCode}` : null;
    return masterDataPressureClasses.find((mpc) => {
      if (targetDesignation && mpc.designation === targetDesignation) return true;
      return mpc.designation?.includes(pcValue) || mpc.designation?.includes(equivalentValue);
    });
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {label}
        {isUnsuitable && <span className="ml-1 text-red-600 font-bold">(NOT SUITABLE)</span>}
        {!isUnsuitable && isFromGlobal && (
          <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
        )}
        {!isUnsuitable && isOverride && (
          <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
        )}
        <span
          className="ml-1 text-gray-400 font-normal cursor-help"
          title="Flange pressure rating. Should match or exceed working pressure."
        >
          ?
        </span>
      </label>
      {hasThreeDropdowns ? (
        <select
          value={value || ""}
          onChange={handleChange}
          className={selectClass}
          onFocus={onFocus}
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
          value={value || ""}
          onChange={handleChange}
          className={selectClass}
          onFocus={onFocus}
        >
          <option value="">Select Class...</option>
          {pressureClasses.map((pc) => {
            const displayDesignation = pc.designation?.replace(/\/\d+$/, "") || pc.designation;
            return (
              <option key={pc.id} value={pc.id}>
                {displayDesignation}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
