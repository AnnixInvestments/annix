"use client";

import { useEffect, useRef, useState } from "react";
import { combinePhone, PHONE_COUNTRIES, splitPhone } from "./phoneCountries";

function flagUrl(iso: string): string {
  return `https://flagcdn.com/${iso.toLowerCase()}.svg`;
}

export function PhoneInput(props: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const initial = splitPhone(props.value);
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const propsValue = props.value;
  useEffect(() => {
    const combined = combinePhone(iso, national);
    if (propsValue !== combined) {
      const next = splitPhone(propsValue);
      setIso(next.iso);
      setNational(next.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsValue]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const node = containerRef.current;
      if (node && !node.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const country = PHONE_COUNTRIES.find((entry) => entry.iso === iso);
  const dial = country ? country.dial : "+27";
  const placeholder = props.placeholder ? props.placeholder : "82 123 4567";

  const emit = (nextIso: string, nextNational: string) => {
    props.onChange(combinePhone(nextIso, nextNational));
  };

  const selectCountry = (nextIso: string) => {
    setIso(nextIso);
    setOpen(false);
    setSearch("");
    emit(nextIso, national);
  };

  const updateNational = (raw: string) => {
    setNational(raw);
    emit(iso, raw);
  };

  const term = search.trim().toLowerCase();
  const filtered =
    term.length === 0
      ? PHONE_COUNTRIES
      : PHONE_COUNTRIES.filter((entry) => {
          const nameMatch = entry.name.toLowerCase().includes(term);
          const dialMatch = entry.dial.includes(term);
          return nameMatch || dialMatch;
        });

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
        >
          <span
            aria-hidden="true"
            className="w-5 h-3.5 rounded-sm bg-gray-200 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${flagUrl(iso)}')` }}
          />
          <span className="font-medium">{dial}</span>
          <span aria-hidden="true" className="text-gray-400">
            ▾
          </span>
        </button>
        <input
          id={props.id}
          type="tel"
          value={national}
          onChange={(e) => updateNational(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-[var(--brand-navbar-100,#e0e0f5)] focus:border-transparent"
        />
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 w-72 max-w-full bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.map((entry) => (
              <li key={entry.iso}>
                <button
                  type="button"
                  onClick={() => selectCountry(entry.iso)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <span
                    aria-hidden="true"
                    className="w-5 h-3.5 rounded-sm bg-gray-200 bg-cover bg-center bg-no-repeat shrink-0"
                    style={{ backgroundImage: `url('${flagUrl(entry.iso)}')` }}
                  />
                  <span className="flex-1 text-gray-700">{entry.name}</span>
                  <span className="text-gray-400">{entry.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
