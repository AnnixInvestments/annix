"use client";

import { Select, type SelectOptionGroup } from "@/app/components/ui/Select";

interface MaterialSpecificationSectionProps {
  value: string;
  onChange: (specId: number | undefined) => void;
  groupedOptions: SelectOptionGroup[];
  isFromGlobal: boolean;
  isOverride: boolean;
  isUnsuitable: boolean;
  className?: string;
  id?: string;
}

const BASE_CLASS =
  "w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
const BORDER_DEFAULT = `${BASE_CLASS} border border-gray-300 dark:border-gray-600`;
const BORDER_GLOBAL = `${BASE_CLASS} border-2 border-green-500 dark:border-lime-400`;
const BORDER_OVERRIDE = `${BASE_CLASS} border-2 border-yellow-500 dark:border-yellow-400`;
const BORDER_UNSUITABLE = `${BASE_CLASS} border-2 border-red-500 dark:border-red-400`;

export function MaterialSpecificationSection(props: MaterialSpecificationSectionProps) {
  const { value, onChange, groupedOptions, isFromGlobal, isOverride, isUnsuitable, id } = props;

  const selectClass = isUnsuitable
    ? BORDER_UNSUITABLE
    : isFromGlobal
      ? BORDER_GLOBAL
      : isOverride
        ? BORDER_OVERRIDE
        : BORDER_DEFAULT;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Steel Specification
        {isUnsuitable && (
          <span className="text-red-600 text-xs ml-2 font-bold">(NOT SUITABLE)</span>
        )}
        {!isUnsuitable && isFromGlobal && (
          <span className="text-green-600 text-xs ml-2">(From Specs Page)</span>
        )}
        {!isUnsuitable && isOverride && (
          <span className="text-yellow-600 text-xs ml-2">(Override)</span>
        )}
      </label>
      <Select
        id={id}
        value={value}
        className={selectClass}
        onChange={(val) => {
          const parsed = parseInt(val, 10);
          onChange(Number.isNaN(parsed) ? undefined : parsed);
        }}
        options={[]}
        groupedOptions={groupedOptions}
        placeholder="Select Steel Spec"
      />
    </div>
  );
}
