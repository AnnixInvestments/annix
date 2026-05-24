"use client";

import { useState } from "react";

// Parse a numeric text input to a non-negative number (blank/invalid → 0).
function num(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatMoney(value: number, currency: string): string {
  const rounded = Math.round(value);
  return `${currency} ${rounded.toLocaleString()}`;
}

/**
 * Pure, deterministic study cost + affordability calculator (#304 Phase 1).
 * No backend — the learner enters their own figures; we show the total cost
 * over the study period vs available funds and the resulting gap/surplus.
 */
export default function FuturePathCostCalculator() {
  const [currency, setCurrency] = useState("ZAR");
  const [studyYears, setStudyYears] = useState("3");
  const [tuition, setTuition] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [flights, setFlights] = useState("");
  const [other, setOther] = useState("");
  const [visa, setVisa] = useState("");
  const [savings, setSavings] = useState("");
  const [contribution, setContribution] = useState("");

  const roundedYears = Math.round(num(studyYears));
  const years = roundedYears >= 1 ? roundedYears : 1;
  const perYear = num(tuition) + num(accommodation) + num(flights) + num(other);
  const totalCost = perYear * years + num(visa);
  const availableFunds = num(savings) + num(contribution) * years;
  const gap = totalCost - availableFunds;
  const affordable = gap <= 0;
  const currencyLabel = currency.trim() || "ZAR";

  const field = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    placeholder?: string,
  ) => (
    <label className="text-sm">
      <span className="block text-gray-600 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
    </label>
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-900 mb-1">Cost &amp; affordability</h2>
      <p className="text-xs text-gray-500 mb-3">
        Estimate the full cost of studying and whether your funds cover it. Figures are yours —
        nothing is stored. Per-year costs are multiplied by the study length; visa/permits are
        once-off.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Currency</span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 4))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        {field("Study length (years)", studyYears, setStudyYears)}
        {field("Tuition / year", tuition, setTuition)}
        {field("Accommodation / year", accommodation, setAccommodation)}
        {field("Flights / travel / year", flights, setFlights)}
        {field("Other / hidden / year", other, setOther)}
        {field("Visa & permits (once-off)", visa, setVisa)}
        {field("Savings available", savings, setSavings)}
        {field("Family contribution / year", contribution, setContribution)}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Total cost ({years} yr)</p>
          <p className="font-semibold">{formatMoney(totalCost, currencyLabel)}</p>
        </div>
        <div className="rounded bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Available funds</p>
          <p className="font-semibold">{formatMoney(availableFunds, currencyLabel)}</p>
        </div>
        <div
          className={`rounded border p-3 ${affordable ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
        >
          <p className="text-xs text-gray-500">{affordable ? "Surplus" : "Funding gap"}</p>
          <p className={`font-semibold ${affordable ? "text-green-800" : "text-amber-800"}`}>
            {formatMoney(Math.abs(gap), currencyLabel)}
          </p>
        </div>
      </div>
      {!affordable ? (
        <p className="mt-2 text-xs text-amber-700">
          There's a shortfall — look at scholarships/bursaries above, or ask the mentor about
          funding and lower-cost pathways.
        </p>
      ) : null}
    </section>
  );
}
