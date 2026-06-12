"use client";

import { isEqual } from "es-toolkit/compat";
import { useEffect, useRef, useState } from "react";
import { providerLabel } from "../provider-labels";

export const COUNTRY_LABELS: Record<string, string> = {
  za: "South Africa",
  gb: "United Kingdom",
  remote: "Remote / Global",
};

export function countryLabel(code: string): string {
  const label = COUNTRY_LABELS[code];
  return label ?? code.toUpperCase();
}

export interface SeekerFilterState {
  search: string;
  providers: string[];
  region: string;
  provinces: string[];
  cities: string[];
  category: string;
  minSalary: string;
}

interface SeekerJobFiltersProps {
  state: SeekerFilterState;
  applied: SeekerFilterState;
  onChange: (next: SeekerFilterState) => void;
  onApply: (next: SeekerFilterState) => void;
  providers: string[];
  regions: string[];
  provinces: string[];
  cities: string[];
  categories: Array<{ key: string; label: string }>;
}

const RESET_STATE: SeekerFilterState = {
  search: "",
  providers: [],
  region: "",
  provinces: [],
  cities: [],
  category: "",
  minSalary: "",
};

interface MultiSelectOption {
  value: string;
  label: string;
}

// Checkbox-dropdown so seekers can pick several provinces, cities or sources at
// once (test feedback #12, issue #344) — e.g. Mpumalanga + Gauteng, then
// Witbank, Ermelo, Johannesburg and Pretoria together.
function MultiSelectDropdown(props: {
  ariaLabel: string;
  placeholder: string;
  pluralLabel: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { selected, options, onChange } = props;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const firstSelected = selected[0];
  const firstSelectedOption = options.find((o) => o.value === firstSelected);
  const firstSelectedLabel = firstSelectedOption ? firstSelectedOption.label : firstSelected;
  const summary =
    selected.length === 0
      ? props.placeholder
      : selected.length === 1
        ? firstSelectedLabel
        : `${selected.length} ${props.pluralLabel}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={props.ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={props.disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 ${
          selected.length > 0 ? "text-gray-900" : "text-gray-500"
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-left text-xs font-medium text-orange-600 hover:bg-orange-50 border-b border-gray-100"
            >
              Clear selection
            </button>
          ) : null}
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No options available</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SeekerJobFilters(props: SeekerJobFiltersProps) {
  const state = props.state;
  const showRegion = props.regions.length > 1;

  const update = (patch: Partial<SeekerFilterState>) => {
    props.onChange({ ...state, ...patch });
  };

  const pendingChanges = !isEqual(state, props.applied);

  const filtersActive =
    state.search !== "" ||
    state.providers.length > 0 ||
    state.region !== "" ||
    state.provinces.length > 0 ||
    state.cities.length > 0 ||
    state.category !== "" ||
    state.minSalary !== "";

  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...state.provinces.map((p) => ({
      key: `province-${p}`,
      label: p,
      onRemove: () => update({ provinces: state.provinces.filter((v) => v !== p) }),
    })),
    ...state.cities.map((c) => ({
      key: `city-${c}`,
      label: c,
      onRemove: () => update({ cities: state.cities.filter((v) => v !== c) }),
    })),
    ...state.providers.map((p) => ({
      key: `provider-${p}`,
      label: providerLabel(p) ?? p,
      onRemove: () => update({ providers: state.providers.filter((v) => v !== p) }),
    })),
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onApply(state);
      }}
      className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
    >
      {filtersActive && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              props.onChange(RESET_STATE);
              props.onApply(RESET_STATE);
            }}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Reset all filters
          </button>
        </div>
      )}
      <input
        type="search"
        aria-label="Search jobs by title, company, or location"
        value={state.search}
        onChange={(e) => update({ search: e.target.value })}
        placeholder="Search by title, company, or location"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {showRegion ? (
          <select
            aria-label="Filter by country/region"
            value={state.region}
            onChange={(e) => update({ region: e.target.value, provinces: [], cities: [] })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All countries</option>
            {props.regions.map((code) => (
              <option key={code} value={code}>
                {countryLabel(code)}
              </option>
            ))}
          </select>
        ) : null}

        <MultiSelectDropdown
          ariaLabel="Filter by province"
          placeholder="All provinces"
          pluralLabel="provinces"
          options={props.provinces.map((p) => ({ value: p, label: p }))}
          selected={state.provinces}
          // Changing the province set invalidates the city list, so clear it —
          // same behaviour the old single-select had.
          onChange={(provinces) => update({ provinces, cities: [] })}
        />

        <MultiSelectDropdown
          ariaLabel="Filter by city"
          placeholder="All cities"
          pluralLabel="cities"
          options={props.cities.map((c) => ({ value: c, label: c }))}
          selected={state.cities}
          onChange={(cities) => update({ cities })}
          disabled={props.cities.length === 0}
        />

        <select
          aria-label="Filter by category"
          value={state.category}
          onChange={(e) => update({ category: e.target.value })}
          disabled={props.categories.length === 0}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">All categories</option>
          {props.categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <MultiSelectDropdown
          ariaLabel="Filter by source"
          placeholder="All sources"
          pluralLabel="sources"
          options={props.providers.map((p) => ({ value: p, label: providerLabel(p) ?? p }))}
          selected={state.providers}
          onChange={(providers) => update({ providers })}
          disabled={props.providers.length < 2}
        />

        <input
          type="number"
          aria-label="Minimum salary in Rand"
          inputMode="numeric"
          min={0}
          step={5000}
          value={state.minSalary}
          onChange={(e) => update({ minSalary: e.target.value })}
          placeholder="Min salary (R)"
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label} filter`}
                className="text-blue-500 hover:text-blue-700"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {pendingChanges ? (
          <span className="text-xs text-gray-500">Filters changed — press Search to apply</span>
        ) : null}
        <button
          type="submit"
          className={`px-5 py-2 text-sm font-medium rounded-lg text-white bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)] ${
            pendingChanges ? "ring-2 ring-offset-1 ring-[var(--brand-accent,#f97316)]" : ""
          }`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
