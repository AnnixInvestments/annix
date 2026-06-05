"use client";

import type { ChangeEvent } from "react";
import { fromISO } from "@/app/lib/datetime";

export interface DateInputProps {
  value: string | null;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  className?: string;
}

// Accept whatever string is stored (ISO date, a bare year, or free text from
// an AI read) and coerce to the yyyy-MM-dd a native date input understands.
// Anything unparseable falls back to empty so the user can pick a date.
function toInputValue(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = fromISO(value);
  if (parsed.isValid) {
    const iso = parsed.toISODate();
    return iso ? iso : "";
  }
  return "";
}

const DEFAULT_CLASS_NAME =
  "w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-[var(--brand-navbar,#323288)] disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-400";

/**
 * The repo-wide standard for date fields. Renders a native date input — which
 * carries the browser's calendar-picker icon — with a yyyy-MM-dd value
 * (empty when cleared) and value coercion for ISO dates / bare years / AI reads.
 *
 * Use this for ANY date field instead of a bare <input type="date"> or a
 * free-text date box. Styling: pass `className` to keep a surface's existing
 * look (the migration default — preserves per-app branding); omit it to get
 * the branded default styling. The calendar-picker cursor is always applied.
 */
export function DateInput(props: DateInputProps) {
  const inputValue = toInputValue(props.value);
  const providedClassName = props.className;
  const baseClassName = providedClassName ? providedClassName : DEFAULT_CLASS_NAME;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    props.onChange(event.target.value);
  };

  return (
    <input
      type="date"
      id={props.id}
      name={props.name}
      value={inputValue}
      min={props.min}
      max={props.max}
      disabled={props.disabled}
      required={props.required}
      aria-label={props.ariaLabel}
      onChange={handleChange}
      className={`${baseClassName} [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
    />
  );
}
