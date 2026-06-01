"use client";

import { useState } from "react";
import type { CatalogTier } from "@/app/lib/query/hooks";
import { useSetTierPricing } from "@/app/lib/query/hooks";

function randsFromCents(cents: number): string {
  return String(cents / 100);
}

export function AppTierEditor(props: { moduleKey: string; tier: CatalogTier }) {
  const moduleKey = props.moduleKey;
  const tier = props.tier;
  const setPricing = useSetTierPricing(moduleKey);

  const [name, setName] = useState(tier.name);
  const [monthly, setMonthly] = useState(randsFromCents(tier.monthlyPriceCents));
  const [annual, setAnnual] = useState(randsFromCents(tier.annualPriceCents));
  const [seats, setSeats] = useState(String(tier.includedSeats));
  const [visibility, setVisibility] = useState(tier.visibility);

  const save = () => {
    setPricing.mutate({
      tierKey: tier.key,
      payload: {
        name,
        monthlyPriceCents: Math.round(Number(monthly) * 100),
        annualPriceCents: Math.round(Number(annual) * 100),
        includedSeats: Number(seats),
        visibility,
      },
    });
  };

  const pending = setPricing.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2 flex flex-col">
          <span className="text-gray-500">Tier name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border px-2 py-1 font-semibold"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Monthly (R)</span>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Annual (R)</span>
          <input
            type="number"
            value={annual}
            onChange={(e) => setAnnual(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Seats included</span>
          <input
            type="number"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as CatalogTier["visibility"])}
            className="rounded border px-2 py-1"
          >
            <option value="public">public</option>
            <option value="hidden">hidden</option>
            <option value="contact-us">contact-us</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-3 rounded bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save tier"}
      </button>
    </div>
  );
}
