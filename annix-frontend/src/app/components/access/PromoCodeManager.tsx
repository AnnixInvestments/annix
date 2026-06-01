"use client";

import { useState } from "react";
import type {
  CreatePromoCodePayload,
  PromoCode,
  PromoDiscountDuration,
} from "@/app/lib/api/promoCodeAdminApi";
import { fromISO } from "@/app/lib/datetime";
import { useCreatePromoCode, useDeletePromoCode, usePromoCodes } from "@/app/lib/query/hooks";

type PromoKind = "percentage" | "fixed" | "free_period" | "free_tier_upgrade";

const PROMO_KIND_OPTIONS: { value: PromoKind; label: string }[] = [
  { value: "percentage", label: "Percentage discount" },
  { value: "fixed", label: "Fixed-amount discount" },
  { value: "free_period", label: "Free period" },
  { value: "free_tier_upgrade", label: "Free tier upgrade" },
];

function promoSummary(code: PromoCode): string {
  if (code.grantsTier) {
    const months = code.durationMonths;
    return months ? `Free "${code.grantsTier}" for ${months} mo` : `Free "${code.grantsTier}"`;
  }
  if (code.discountValue === 0 && code.discountDuration !== "first_payment") {
    const months = code.durationMonths;
    return months ? `${months} months free` : "Free (ongoing)";
  }
  if (code.discountType === "percentage") {
    return `${code.discountValue}% off`;
  }
  return `R${(code.discountValue / 100).toLocaleString("en-ZA")} off`;
}

export function PromoCodeManager(props: { moduleKey: string }) {
  const moduleKey = props.moduleKey;
  const promosQuery = usePromoCodes();
  const createPromo = useCreatePromoCode();
  const deletePromo = useDeletePromoCode();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<PromoKind>("percentage");
  const [amount, setAmount] = useState("10");
  const [durationMonths, setDurationMonths] = useState("1");
  const [forever, setForever] = useState(false);
  const [grantsTier, setGrantsTier] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const pending = createPromo.isPending;
  const isError = createPromo.isError;

  const allPromos = promosQuery.data;
  const promos = allPromos ? allPromos.filter((p) => p.moduleKey === moduleKey) : [];

  const submit = () => {
    const payload: CreatePromoCodePayload = {
      code,
      description,
      moduleKey,
      discountType: kind === "percentage" ? "percentage" : "fixed_amount",
      discountValue: 0,
    };

    if (kind === "percentage") {
      payload.discountValue = Number(amount);
      payload.discountDuration = "first_payment";
    } else if (kind === "fixed") {
      payload.discountValue = Math.round(Number(amount) * 100);
      payload.discountDuration = "first_payment";
    } else if (kind === "free_period") {
      payload.discountValue = 0;
      const duration: PromoDiscountDuration = forever ? "forever" : "n_months";
      payload.discountDuration = duration;
      if (!forever) {
        payload.durationMonths = Number(durationMonths);
      }
    } else {
      payload.discountValue = 0;
      payload.grantsTier = grantsTier.trim();
      const duration: PromoDiscountDuration = forever ? "forever" : "n_months";
      payload.discountDuration = duration;
      if (!forever) {
        payload.durationMonths = Number(durationMonths);
      }
    }

    const maxValue = Number(maxRedemptions);
    if (maxRedemptions.trim().length > 0 && !Number.isNaN(maxValue)) {
      payload.maxRedemptions = maxValue;
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
        setGrantsTier("");
        setMaxRedemptions("");
        setValidUntil("");
      },
    });
  };

  const showAmount = kind === "percentage" || kind === "fixed";
  const showDuration = kind === "free_period" || kind === "free_tier_upgrade";
  const amountLabel = kind === "percentage" ? "Discount (%)" : "Discount (R)";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-bold text-gray-900">New promo code</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <label className="flex flex-col">
            <span className="text-gray-500">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border px-2 py-1 uppercase"
              placeholder="LAUNCH20"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-500">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-500">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as PromoKind)}
              className="rounded border px-2 py-1"
            >
              {PROMO_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {showAmount ? (
            <label className="flex flex-col">
              <span className="text-gray-500">{amountLabel}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded border px-2 py-1"
              />
            </label>
          ) : null}
          {kind === "free_tier_upgrade" ? (
            <label className="flex flex-col">
              <span className="text-gray-500">Grants tier (key)</span>
              <input
                value={grantsTier}
                onChange={(e) => setGrantsTier(e.target.value)}
                className="rounded border px-2 py-1"
                placeholder="medium"
              />
            </label>
          ) : null}
          {showDuration ? (
            <label className="flex flex-col">
              <span className="text-gray-500">Free months (or tick ongoing)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  disabled={forever}
                  className="w-24 rounded border px-2 py-1 disabled:opacity-50"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={forever}
                    onChange={(e) => setForever(e.target.checked)}
                  />
                  ongoing
                </label>
              </div>
            </label>
          ) : null}
          <label className="flex flex-col">
            <span className="text-gray-500">Max redemptions (blank = unlimited)</span>
            <input
              type="number"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-500">Valid until (optional)</span>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || code.trim().length === 0}
          className="mt-3 rounded bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create code"}
        </button>
        {isError ? (
          <p className="mt-2 text-sm text-red-600">
            Could not create — the code may already exist.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900">Existing codes</h3>
        {promosQuery.isLoading ? <p className="mt-2 text-gray-500">Loading…</p> : null}
        {promos.length > 0 ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Code</th>
                <th>Promotion</th>
                <th>Used</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => {
                const usedLabel =
                  promo.maxRedemptions === null
                    ? `${promo.timesRedeemed}`
                    : `${promo.timesRedeemed} / ${promo.maxRedemptions}`;
                return (
                  <tr key={promo.id} className="border-b">
                    <td className="py-2 font-mono font-semibold">{promo.code}</td>
                    <td className="text-gray-600">{promoSummary(promo)}</td>
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
        ) : (
          <p className="mt-2 text-gray-500">No promo codes for this app yet.</p>
        )}
      </div>
    </div>
  );
}
