"use client";

import { useState } from "react";
import type { CatalogAddOn, CatalogFeature, CatalogTier } from "@/app/lib/query/hooks";
import {
  useAdminLicensingCatalog,
  useSetAddOn,
  useSetTierFeatures,
  useSetTierPricing,
} from "@/app/lib/query/hooks";

const MODULE_KEY = "au-rubber";

function randFromCents(cents: number): string {
  return String(cents / 100);
}

function TierEditor(props: { moduleKey: string; tier: CatalogTier; features: CatalogFeature[] }) {
  const moduleKey = props.moduleKey;
  const tier = props.tier;
  const features = props.features;

  const setPricing = useSetTierPricing(moduleKey);
  const setFeatures = useSetTierFeatures(moduleKey);

  const [monthly, setMonthly] = useState(randFromCents(tier.monthlyPriceCents));
  const [annual, setAnnual] = useState(randFromCents(tier.annualPriceCents));
  const [seats, setSeats] = useState(String(tier.includedSeats));
  const [aiAllowance, setAiAllowance] = useState(String(tier.aiDocAllowance));
  const [visibility, setVisibility] = useState(tier.visibility);
  const [selected, setSelected] = useState<string[]>(tier.featureKeys);

  const savePricing = () => {
    setPricing.mutate({
      tierKey: tier.key,
      payload: {
        monthlyPriceCents: Math.round(Number(monthly) * 100),
        annualPriceCents: Math.round(Number(annual) * 100),
        includedSeats: Number(seats),
        aiDocAllowance: Number(aiAllowance),
        visibility,
      },
    });
  };

  const toggleFeature = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const saveFeatures = () => {
    setFeatures.mutate({ tierKey: tier.key, featureKeys: selected });
  };

  const pricingPending = setPricing.isPending;
  const featuresPending = setFeatures.isPending;
  const featuresError = setFeatures.isError;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-gray-500">Monthly (R)</span>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Annual (R)</span>
          <input
            type="number"
            value={annual}
            onChange={(e) => setAnnual(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Seats included</span>
          <input
            type="number"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">AI docs / month</span>
          <input
            type="number"
            value={aiAllowance}
            onChange={(e) => setAiAllowance(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col col-span-2">
          <span className="text-gray-500">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as CatalogTier["visibility"])}
            className="border rounded px-2 py-1"
          >
            <option value="public">public</option>
            <option value="hidden">hidden</option>
            <option value="contact-us">contact-us</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={savePricing}
        disabled={pricingPending}
        className="mt-3 px-3 py-1.5 rounded bg-yellow-500 text-white text-sm font-semibold disabled:opacity-50"
      >
        {pricingPending ? "Saving…" : "Save pricing"}
      </button>

      <div className="mt-5 border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Features in this tier</p>
        <ul className="space-y-1">
          {features.map((feature) => {
            const checked = selected.includes(feature.key);
            return (
              <li key={feature.key}>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(feature.key)}
                  />
                  {feature.label}
                </label>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={saveFeatures}
          disabled={featuresPending}
          className="mt-3 px-3 py-1.5 rounded bg-gray-800 text-white text-sm font-semibold disabled:opacity-50"
        >
          {featuresPending ? "Saving…" : "Save features"}
        </button>
        {featuresError ? (
          <p className="mt-2 text-sm text-red-600">
            Could not save — a feature's prerequisite may be missing from this tier.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AddOnEditor(props: { moduleKey: string; addOn: CatalogAddOn }) {
  const moduleKey = props.moduleKey;
  const addOn = props.addOn;
  const setAddOn = useSetAddOn(moduleKey);

  const [monthly, setMonthly] = useState(randFromCents(addOn.monthlyPriceCents));
  const [discountable, setDiscountable] = useState(addOn.discountable);

  const save = () => {
    setAddOn.mutate({
      addOnKey: addOn.key,
      payload: { monthlyPriceCents: Math.round(Number(monthly) * 100), discountable },
    });
  };

  const pending = setAddOn.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900">{addOn.label}</h3>
      <p className="text-sm text-gray-500">{addOn.description}</p>
      <div className="mt-3 flex items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-gray-500">Monthly (R)</span>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="border rounded px-2 py-1 w-32"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={discountable}
            onChange={(e) => setDiscountable(e.target.checked)}
          />
          Discountable
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-3 py-1.5 rounded bg-yellow-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLicensingPage() {
  const catalogQuery = useAdminLicensingCatalog(MODULE_KEY);
  const catalog = catalogQuery.data;
  const isLoading = catalogQuery.isLoading;
  const isError = catalogQuery.isError;

  if (isLoading) {
    return <div className="p-8 text-gray-600">Loading catalog…</div>;
  }

  if (isError || !catalog) {
    return <div className="p-8 text-gray-600">Could not load the licensing catalog.</div>;
  }

  const tiers = catalog.tiers;
  const features = catalog.features;
  const addOns = catalog.addOns;

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">AU Rubber pricing & tiers</h1>
      <p className="mt-1 text-gray-500 text-sm">
        Prices are VAT-inclusive (15%). Changes apply to the live pricing page immediately.
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {tiers.map((tier) => (
          <TierEditor key={tier.key} moduleKey={MODULE_KEY} tier={tier} features={features} />
        ))}
      </div>

      {addOns.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">Add-ons</h2>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {addOns.map((addOn) => (
              <AddOnEditor key={addOn.key} moduleKey={MODULE_KEY} addOn={addOn} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
