"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useAdminLicensingCatalog, useCreateTierInvite } from "@/app/lib/query/hooks";

export function InviteToTierForm(props: { moduleKey: string }) {
  const moduleKey = props.moduleKey;
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const catalogQuery = useAdminLicensingCatalog(moduleKey);
  const createInvite = useCreateTierInvite();

  const catalog = catalogQuery.data;
  const tiers = catalog ? catalog.tiers : [];
  const defaultTier = catalog ? catalog.defaultTier : "";

  const [email, setEmail] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [freeDays, setFreeDays] = useState("14");

  const selectedTier = tierKey || defaultTier;
  const pending = createInvite.isPending;

  const submit = () => {
    const trimmed = email.trim();
    const days = Number(freeDays);
    if (!trimmed || !selectedTier || !Number.isFinite(days) || days <= 0) {
      showToast("Enter a valid email, tier, and number of free days.", "error");
      return;
    }
    createInvite.mutate(
      { moduleKey, email: trimmed, tierKey: selectedTier, freeDays: days },
      {
        onSuccess: () => {
          showToast(`Invite sent to ${trimmed}.`, "success");
          setEmail("");
        },
        onError: () => alert({ message: "Could not send the invite.", variant: "error" }),
      },
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {AlertDialog}
      <p className="text-sm text-gray-500">
        Invite a user by email to a plan with a free trial. They'll receive an email; the plan is
        applied to their account when billing/sign-up is wired (admins can grant it manually
        meanwhile).
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
        <label className="flex flex-col sm:col-span-2">
          <span className="text-gray-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Tier</span>
          <select
            value={selectedTier}
            onChange={(e) => setTierKey(e.target.value)}
            className="rounded border px-2 py-1"
          >
            {tiers.map((tier) => (
              <option key={tier.key} value={tier.key}>
                {tier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Free days</span>
          <input
            type="number"
            min={1}
            value={freeDays}
            onChange={(e) => setFreeDays(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending || tiers.length === 0}
        className="mt-3 rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </div>
  );
}
