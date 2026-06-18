"use client";

import * as Popover from "@radix-ui/react-popover";
import * as React from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
  searchTerms?: string[];
}

interface MultiSelectProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  emptyText?: string;
}

const defaultMatches = (option: MultiSelectOption, searchTerm: string): boolean => {
  const term = searchTerm.toLowerCase();
  if (option.label.toLowerCase().includes(term)) return true;
  if (option.value.toLowerCase().includes(term)) return true;
  const sublabel = option.sublabel;
  if (sublabel?.toLowerCase().includes(term)) return true;
  const terms = option.searchTerms;
  if (terms?.some((t) => t.toLowerCase().includes(term))) return true;
  return false;
};

export function MultiSelect(props: MultiSelectProps) {
  const placeholderProp = props.placeholder;
  const searchPlaceholderProp = props.searchPlaceholder;
  const emptyTextProp = props.emptyText;
  const classNameProp = props.className;
  const placeholder = placeholderProp ?? "Select…";
  const searchPlaceholder = searchPlaceholderProp ?? "Search…";
  const emptyText = emptyTextProp ?? "No results found";
  const className = classNameProp ?? "";
  const options = props.options;
  const values = props.values;
  const onChange = props.onChange;
  const disabled = props.disabled === true;

  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearchTerm("");
      globalThis.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  };

  const filteredOptions = React.useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return options;
    return options.filter((option) => defaultMatches(option, trimmed));
  }, [options, searchTerm]);

  const selectableOptions = React.useMemo(
    () => options.filter((option) => option.disabled !== true),
    [options],
  );

  const selectedSet = React.useMemo(() => new Set(values), [values]);

  const toggleValue = (value: string) => {
    const next = selectedSet.has(value) ? values.filter((v) => v !== value) : [...values, value];
    onChange(next);
  };

  const selectAll = () => {
    onChange(selectableOptions.map((option) => option.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedCount = values.length;
  const triggerLabel = selectedCount === 0 ? placeholder : `${selectedCount} selected`;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={props.id}
          type="button"
          disabled={disabled}
          className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-left ${className}`}
        >
          <span
            className={
              selectedCount > 0
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500"
            }
          >
            {triggerLabel}
          </span>
          <ChevronDownIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[9999] w-[var(--radix-popover-trigger-width)] max-h-96 overflow-hidden"
          sideOffset={4}
          align="start"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
            />
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="font-medium text-[var(--brand-navbar,#323288)] hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-400 dark:text-gray-500">{selectedCount} selected</span>
              <button
                type="button"
                onClick={clearAll}
                className="font-medium text-gray-500 dark:text-gray-400 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value);
                const isDisabled = option.disabled === true;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleValue(option.value)}
                    className={`flex items-start gap-2 w-full px-2 py-2 text-sm rounded text-left ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "bg-[var(--brand-navbar,#323288)] border-[var(--brand-navbar,#323288)] text-white"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900"
                      }`}
                    >
                      {isSelected && <CheckIcon />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-gray-900 dark:text-gray-100">
                          {option.label}
                        </span>
                        {option.badge && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            {option.badge}
                          </span>
                        )}
                      </span>
                      {option.sublabel && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type { MultiSelectProps };
