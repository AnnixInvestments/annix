"use client";

import { useState } from "react";
import type {
  CreatePromoCodePayload,
  PromoBillingCycle,
  PromoCode,
  PromoDiscountType,
} from "@/app/lib/api/promoCodeAdminApi";
import { fromISO } from "@/app/lib/datetime";
import { useCreatePromoCode, useDeletePromoCode, usePromoCodes } from "@/app/lib/query/hooks";

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function discountLabel(code: PromoCode): string {
  if (code.discountType === "percentage") {
    return `${code.discountValue}%`;
  }
  return `R${(code.discountValue / 100).toLocaleString("en-ZA")}`;
}

function CreatePromoForm() {
  const createPromo = useCreatePromoCode();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<PromoDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [tiers, setTiers] = useState("");
  const [companies, setCompanies] = useState("");
  const [billingCycle, setBillingCycle] = useState<PromoBillingCycle>("any");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const pending = createPromo.isPending;
  const isError = createPromo.isError;

  const submit = () => {
    const rawValue = Number(discountValue);
    const value = discountType === "percentage" ? rawValue : Math.round(rawValue * 100);
    const companyIds = parseList(companies)
      .map((part) => Number(part))
      .filter((n) => !Number.isNaN(n));
    const payload: CreatePromoCodePayload = {
      code,
      description,
      moduleKey: "au-rubber",
      discountType,
      discountValue: value,
      appliesToTiers: parseList(tiers),
      assignedCompanyIds: companyIds,
      billingCycle,
    };
    const max = Number(maxRedemptions);
    if (maxRedemptions.trim().length > 0 && !Number.isNaN(max)) {
      payload.maxRedemptions = max;
    }
    if (validUntil.trim().length > 0) {
      const iso = fromISO(validUntil).toISO();
      if (iso) {
        payload.validUntil = iso;
      }
    }
    createPromo.mutate(payload, {
      onSuccess: () => {
        setCode("");
        setDescription("");
        setTiers("");
        setCompanies("");
        setMaxRedemptions("");
        setValidUntil("");
      },
    });
  };

  const valueLabel = discountType === "percentage" ? "Discount (%)" : "Discount (R)";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-900">New promo code</h2>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-gray-500">Code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="border rounded px-2 py-1 uppercase"
            placeholder="LAUNCH20"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Discount type</span>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as PromoDiscountType)}
            className="border rounded px-2 py-1"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">{valueLabel}</span>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">
            Applies to tiers (comma-separated keys, blank = all)
          </span>
          <input
            value={tiers}
            onChange={(e) => setTiers(e.target.value)}
            className="border rounded px-2 py-1"
            placeholder="operations, compliance"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Assigned company IDs (comma-separated, blank = any)</span>
          <input
            value={companies}
            onChange={(e) => setCompanies(e.target.value)}
            className="border rounded px-2 py-1"
            placeholder="12, 34"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Billing cycle</span>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as PromoBillingCycle)}
            className="border rounded px-2 py-1"
          >
            <option value="any">Any</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Max redemptions (blank = unlimited)</span>
          <input
            type="number"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Valid until (optional)</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending || code.trim().length === 0}
        className="mt-3 px-3 py-1.5 rounded bg-yellow-500 text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create code"}
      </button>
      {isError ? (
        <p className="mt-2 text-sm text-red-600">Could not create — the code may already exist.</p>
      ) : null}
    </div>
  );
}

export default function AdminPromoCodesPage() {
  const promosQuery = usePromoCodes();
  const deletePromo = useDeletePromoCode();
  const promos = promosQuery.data;
  const isLoading = promosQuery.isLoading;
  const isError = promosQuery.isError;

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Promo codes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Codes apply to the discountable subtotal only — web hosting is never discounted.
      </p>

      <div className="mt-6">
        <CreatePromoForm />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Existing codes</h2>
        {isLoading ? <p className="mt-2 text-gray-500">Loading…</p> : null}
        {isError ? <p className="mt-2 text-gray-500">Could not load promo codes.</p> : null}
        {promos && promos.length > 0 ? (
          <table className="mt-3 w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Code</th>
                <th>Discount</th>
                <th>Tiers</th>
                <th>Used</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => {
                const tierLabel =
                  promo.appliesToTiers.length > 0 ? promo.appliesToTiers.join(", ") : "all";
                const usedLabel =
                  promo.maxRedemptions === null
                    ? `${promo.timesRedeemed}`
                    : `${promo.timesRedeemed} / ${promo.maxRedemptions}`;
                return (
                  <tr key={promo.id} className="border-b">
                    <td className="py-2 font-mono font-semibold">{promo.code}</td>
                    <td>{discountLabel(promo)}</td>
                    <td className="text-gray-600">{tierLabel}</td>
                    <td>{usedLabel}</td>
                    <td>{promo.active ? "Yes" : "No"}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => deletePromo.mutate(promo.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {promos && promos.length === 0 ? (
          <p className="mt-2 text-gray-500">No promo codes yet.</p>
        ) : null}
      </div>
    </div>
  );
}
