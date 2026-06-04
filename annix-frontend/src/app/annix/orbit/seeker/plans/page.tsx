"use client";

import Link from "next/link";
import { TierPlans } from "@/app/components/orbit/TierPlans";
import { useToast } from "@/app/components/Toast";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitSeekerEntitlements,
  useOrbitSelectSeekerPlan,
  useOrbitTierPlans,
} from "@/app/lib/query/hooks";

export default function SeekerPlansPage() {
  const plansQuery = useOrbitTierPlans();
  const plansData = plansQuery.data;
  const plans = plansData ?? [];
  const isLoading = plansQuery.isLoading;

  const entitlementsQuery = useOrbitSeekerEntitlements();
  const entitlements = entitlementsQuery.data;
  const currentTier = entitlements ? entitlements.tier : null;

  const selectPlan = useOrbitSelectSeekerPlan();
  const pendingTier = selectPlan.variables;
  const selectingTier = selectPlan.isPending ? pendingTier : null;

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleSelectPlan = async (tier: string) => {
    const target = plans.find((plan) => plan.tier === tier);
    const planLabel = target ? target.label : "this plan";
    const confirmed = await confirm({
      title: `Switch to ${planLabel}?`,
      message:
        "Your plan changes right away. It's free while Annix Orbit is in testing — billing comes later.",
      confirmLabel: "Switch plan",
      variant: "info",
    });
    if (!confirmed) return;
    selectPlan.mutate(tier, {
      onSuccess: () => showToast(`You're now on ${planLabel}.`, "success"),
      onError: () => showToast("Couldn't switch plan. Please try again.", "error"),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose how far you want to go. Start free on Explorer, or switch to a higher plan any time
          for sharper matching, more Nix Job Finds and the full toolkit. It's free while Annix Orbit
          is in testing — billing comes later.
        </p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500">Plans are being set up. Please check back soon.</p>
        ) : (
          <TierPlans
            plans={plans}
            highlightTier={currentTier ?? "soft"}
            currentTier={currentTier}
            selectingTier={selectingTier}
            onSelectPlan={handleSelectPlan}
          />
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/annix/orbit/seeker/dashboard"
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Continue to your dashboard →
        </Link>
      </div>
      {ConfirmDialog}
    </div>
  );
}
