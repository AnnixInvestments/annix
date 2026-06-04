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

/**
 * The repo-wide standard for date fields. Renders a native date input — which
 * carries the browser's calendar-picker icon — with consistent branded styling.
 * Use this for ANY date field instead of a bare <input type="date"> or a
 * free-text date box. Value in/out is a yyyy-MM-dd string (empty when cleared).
 */
export function DateInput(props: DateInputProps) {
  const inputValue = toInputValue(props.value);
  const extraClassName = props.className ? props.className : "";

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
      className={`w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-[var(--brand-navbar,#323288)] disabled:bg-gray-100 disabled:text-gray-400 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${extraClassName}`}
    />
  );
}
