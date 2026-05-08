"use client";

import { useEffect, useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import type { DocNumberSearchRow } from "@/app/lib/nix/api";
import { useDocNumberSearch } from "@/app/lib/query/hooks";

export interface DocNumberAutocompleteProps {
  value: string;
  onChange: (next: string) => void;
  onUseExisting: (row: DocNumberSearchRow) => void;
  mineId?: number | null;
  placeholder?: string;
  className?: string;
}

export function DocNumberAutocomplete(props: DocNumberAutocompleteProps) {
  const { value, onChange, onUseExisting, mineId, placeholder, className } = props;
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const mineIdParam = mineId === null || mineId === undefined ? null : mineId;
  const searchQuery = useDocNumberSearch(debouncedValue, {
    mineId: mineIdParam,
    limit: 8,
    enabled: debouncedValue.trim().length >= 2,
  });

  const matchesData = searchQuery.data;
  const matches = matchesData ? matchesData : [];
  const showMatches = isOpen && matches.length > 0 && debouncedValue.trim().length >= 2;
  const placeholderLabel = placeholder ? placeholder : "Doc number (e.g. LHU-0000-EP-2701-012-00)";
  const wrapperClass = className ? className : "";

  return (
    <div className={`relative ${wrapperClass}`}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholderLabel}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
      />
      {showMatches ? (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto">
          <p className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
            {matches.length} existing extraction{matches.length === 1 ? "" : "s"} match — use the
            existing instead of re-uploading?
          </p>
          <ul className="divide-y divide-gray-100">
            {matches.map((row) => {
              const captured = fromISO(row.createdAt).toFormat("dd MMM yyyy");
              const docNumberLabel = row.documentRevision
                ? `${row.documentNumber} rev ${row.documentRevision}`
                : row.documentNumber;
              return (
                <li key={row.extractionId}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onUseExisting(row);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50"
                  >
                    <span className="font-mono text-xs text-gray-900">{docNumberLabel}</span>
                    {row.documentTitle ? (
                      <span className="ml-2 text-xs text-gray-700">{row.documentTitle}</span>
                    ) : null}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {row.mineName ? (
                        <span className="text-emerald-700">⛏ {row.mineName}</span>
                      ) : (
                        <span className="text-amber-700">no mine</span>
                      )}
                      <span className="text-gray-400">·</span>
                      <span>{captured}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
