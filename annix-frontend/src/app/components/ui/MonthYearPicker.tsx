"use client";

import { now } from "@/app/lib/datetime";

interface MonthYearPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  focusRingClassName?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthYearPicker(props: MonthYearPickerProps) {
  const rawFocusRingClassName = props.focusRingClassName;
  const focusRingClassName = rawFocusRingClassName || "focus:ring-blue-400";
  const currentYear = now().year;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const selectClass = `px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 ${focusRingClassName}`;

  return (
    <div className="flex items-center gap-2">
      <select
        value={props.month}
        onChange={(e) => props.onChange(props.year, Number(e.target.value))}
        className={selectClass}
      >
        {MONTHS.map((name, idx) => (
          <option key={idx + 1} value={idx + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={props.year}
        onChange={(e) => props.onChange(Number(e.target.value), props.month)}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
