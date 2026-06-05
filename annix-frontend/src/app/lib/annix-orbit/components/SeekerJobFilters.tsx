"use client";

import { providerLabel } from "../provider-labels";

export interface SeekerFilterState {
  search: string;
  provider: string;
  province: string;
  city: string;
  category: string;
  minSalary: string;
}

interface SeekerJobFiltersProps {
  state: SeekerFilterState;
  onChange: (next: SeekerFilterState) => void;
  providers: string[];
  provinces: string[];
  cities: string[];
  categories: Array<{ key: string; label: string }>;
}

export function SeekerJobFilters(props: SeekerJobFiltersProps) {
  const state = props.state;
  const cityOptions = props.cities;

  const update = (patch: Partial<SeekerFilterState>) => {
    props.onChange({ ...state, ...patch });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <input
        type="search"
        aria-label="Search jobs by title, company, or location"
        value={state.search}
        onChange={(e) => update({ search: e.target.value })}
        placeholder="Search by title, company, or location"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          aria-label="Filter by province"
          value={state.province}
          onChange={(e) => update({ province: e.target.value, city: "" })}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All provinces</option>
          {props.provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by city"
          value={state.city}
          onChange={(e) => update({ city: e.target.value })}
          disabled={cityOptions.length === 0}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">All cities</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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

        <select
          aria-label="Filter by source"
          value={state.provider}
          onChange={(e) => update({ provider: e.target.value })}
          disabled={props.providers.length < 2}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="all">All sources</option>
          {props.providers.map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
            </option>
          ))}
        </select>

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
    </div>
  );
}
