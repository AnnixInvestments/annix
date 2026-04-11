"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ComboBoxOption {
  id: number;
  label: string;
  sublabel?: string | null;
  searchTokens?: string[];
}

interface ComboBoxProps {
  value: number | "";
  options: ComboBoxOption[];
  onChange: (id: number | "") => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function ComboBox(props: ComboBoxProps) {
  const valueProp = props.value;
  const optionsProp = props.options;
  const onChangeProp = props.onChange;
  const placeholderProp = props.placeholder;
  const placeholderText = placeholderProp == null ? "Type to search…" : placeholderProp;
  const emptyLabelProp = props.emptyLabel;
  const emptyLabelText = emptyLabelProp == null ? "No matches" : emptyLabelProp;
  const disabled = props.disabled === true;

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = useMemo<ComboBoxOption | null>(() => {
    if (valueProp === "") {
      return null;
    }
    const found = optionsProp.find((o) => o.id === valueProp);
    return found == null ? null : found;
  }, [valueProp, optionsProp]);

  const filtered = useMemo<ComboBoxOption[]>(() => {
    const trimmed = search.trim().toLowerCase();
    if (trimmed === "") {
      return optionsProp;
    }
    return optionsProp.filter((o) => {
      const label = o.label == null ? "" : o.label.toLowerCase();
      const sublabel = o.sublabel == null ? "" : o.sublabel.toLowerCase();
      if (label.includes(trimmed) || sublabel.includes(trimmed)) {
        return true;
      }
      const tokens = o.searchTokens;
      if (tokens != null) {
        for (const token of tokens) {
          if (token?.toLowerCase().includes(trimmed)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [search, optionsProp]);

  const handleSelect = (option: ComboBoxOption) => {
    onChangeProp(option.id);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChangeProp("");
    setSearch("");
  };

  const displayValue = (() => {
    if (isOpen) {
      return search;
    }
    if (selectedOption == null) {
      return "";
    }
    return selectedOption.label;
  })();

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={displayValue}
        disabled={disabled}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholderText}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
      {selectedOption != null && !isOpen && !disabled ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Clear selection"
        >
          ×
        </button>
      ) : null}
      {isOpen ? (
        <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg z-20">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyLabelText}</div>
          ) : (
            filtered.map((o) => {
              const sublabel = o.sublabel;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900 truncate">{o.label}</div>
                  {sublabel != null && sublabel !== "" ? (
                    <div className="text-xs text-gray-500 truncate">{sublabel}</div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
