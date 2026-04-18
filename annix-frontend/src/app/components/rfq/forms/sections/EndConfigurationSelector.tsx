"use client";

import type {
  BendEndOption,
  FittingEndOption,
  PipeEndOption,
  ReducerEndOption,
} from "@/app/lib/config/rfq/pipeEndOptions";

type EndOption = PipeEndOption | BendEndOption | FittingEndOption | ReducerEndOption;

interface EndConfigurationSelectorProps {
  value: string;
  onChange: (config: string) => void;
  options: EndOption[];
  isFromGlobal?: boolean;
  isOverride?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

const BASE_CLASS =
  "w-full px-2 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
const BORDER_DEFAULT = `${BASE_CLASS} border border-gray-300 dark:border-gray-600`;
const BORDER_GLOBAL = `${BASE_CLASS} border-2 border-green-500 dark:border-lime-400`;
const BORDER_OVERRIDE = `${BASE_CLASS} border-2 border-yellow-500 dark:border-yellow-400`;

export function EndConfigurationSelector(props: EndConfigurationSelectorProps) {
  const {
    value,
    onChange,
    options,
    isFromGlobal = false,
    isOverride = false,
    label = "End Configuration",
    required = true,
    className,
  } = props;

  const selectClass =
    className || (isFromGlobal ? BORDER_GLOBAL : isOverride ? BORDER_OVERRIDE : BORDER_DEFAULT);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {label}
      </label>
      <select
        value={value || "PE"}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        required={required}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
