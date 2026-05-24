"use client";

import { useState } from "react";
import { useLicensingCatalog } from "@/app/lib/query/hooks";

type BillingCycle = "monthly" | "annual";

function formatRand(cents: number): string {
  const rand = cents / 100;
  return `R${rand.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

export default function AuRubberPricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const catalogQuery = useLicensingCatalog("au-rubber");
  const catalog = catalogQuery.data;
  const isLoading = catalogQuery.isLoading;
  const isError = catalogQuery.isError;

  if (isLoading) {
    return <div className="p-8 text-gray-600">Loading pricing…</div>;
  }

  if (isError || !catalog) {
    return (
      <div className="p-8 text-gray-600">
        Pricing is unavailable right now — please try again shortly.
      </div>
    );
  }

  const tiers = catalog.tiers.filter((tier) => tier.visibility !== "hidden");
  const features = catalog.features;
  const addOns = catalog.addOns;
  const isAnnual = billing === "annual";

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AU Rubber plans</h1>
        <p className="mt-2 text-gray-600">
          All prices in ZAR and VAT-inclusive (15% VAT already included).
        </p>
        <div className="inline-flex mt-6 rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 text-sm font-semibold ${
              isAnnual ? "bg-white text-gray-700" : "bg-yellow-500 text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-4 py-2 text-sm font-semibold ${
              isAnnual ? "bg-yellow-500 text-white" : "bg-white text-gray-700"
            }`}
          >
            Annual (2 months free)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const priceCents = isAnnual ? tier.annualPriceCents : tier.monthlyPriceCents;
          const period = isAnnual ? "/year" : "/month";
          const seatsLabel = tier.includedSeats >= 999 ? "Unlimited" : `${tier.includedSeats}`;
          const aiLabel = tier.aiDocAllowance > 0 ? `${tier.aiDocAllowance} docs/mo` : "—";
          return (
            <div
              key={tier.key}
              className="flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900">{tier.name}</h2>
              <p className="mt-1 text-sm text-gray-500 min-h-[3rem]">{tier.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatRand(priceCents)}
                </span>
                <span className="text-gray-500">{period}</span>
              </div>
              <dl className="mt-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Users included</dt>
                  <dd className="font-semibold">{seatsLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>AI documents</dt>
                  <dd className="font-semibold">{aiLabel}</dd>
                </div>
              </dl>
              <ul className="mt-5 space-y-2 text-sm">
                {features.map((feature) => {
                  const included = tier.featureKeys.includes(feature.key);
                  const mark = included ? "✓" : "—";
                  const markClass = included ? "text-green-600" : "text-gray-300";
                  const textClass = included ? "text-gray-700" : "text-gray-400";
                  return (
                    <li key={feature.key} className="flex items-start gap-2">
                      <span className={`font-bold ${markClass}`}>{mark}</span>
                      <span className={textClass}>{feature.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {addOns.length > 0 ? (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Optional add-ons</h2>
          <p className="mt-1 text-sm text-gray-500">Billed monthly on top of your plan.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {addOns.map((addOn) => {
              const discountLabel = addOn.discountable ? "" : " · not discountable";
              return (
                <div
                  key={addOn.key}
                  className="rounded-xl border border-gray-200 bg-white p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{addOn.label}</h3>
                    <p className="text-sm text-gray-500">{addOn.description}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-bold text-gray-900">
                      {formatRand(addOn.monthlyPriceCents)}
                      <span className="text-gray-500 text-sm">/mo</span>
                    </div>
                    <div className="text-xs text-gray-400">VAT incl{discountLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
