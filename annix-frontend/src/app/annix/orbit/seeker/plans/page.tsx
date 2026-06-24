"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { TierPlans } from "@/app/components/orbit/TierPlans";
import { useToast } from "@/app/components/Toast";
import { requestSeekerTour } from "@/app/lib/annix-orbit/seekerTourSignal";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCompleteOnboarding,
  useOrbitMyProfileStatus,
  useOrbitSeekerEntitlements,
  useOrbitSelectSeekerPlan,
  useOrbitTierPlans,
} from "@/app/lib/query/hooks";

export default function SeekerPlansPage() {
  const plansQuery = useOrbitTierPlans();
  const plansData = plansQuery.data;
  const plans = plansData ?? [];
  const isLoading = plansQuery.isLoading;
  const isPlansError = plansQuery.isError;
  const isRefetchingPlans = plansQuery.isFetching;

  const entitlementsQuery = useOrbitSeekerEntitlements();
  const entitlements = entitlementsQuery.data;
  const currentTier = entitlements ? entitlements.tier : null;

  const selectPlan = useOrbitSelectSeekerPlan();
  const pendingTier = selectPlan.variables;
  const selectingTier = selectPlan.isPending ? pendingTier : null;

  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();

  const router = useRouter();
  const statusQuery = useOrbitMyProfileStatus();
  const status = statusQuery.data;
  const inOnboarding = status ? status.onboardingComplete === false : false;
  const completeOnboarding = useOrbitCompleteOnboarding();
  const finishPalette = inOnboarding
    ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
    : "bg-violet-600 text-white hover:bg-violet-700";

  const plansTourRequestedRef = useRef(false);
  useEffect(() => {
    if (!inOnboarding || plansTourRequestedRef.current) {
      return;
    }
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") {
      return;
    }
    if (window.sessionStorage.getItem("seeker-plans-onboarding-shown")) {
      return;
    }
    plansTourRequestedRef.current = true;
    window.sessionStorage.setItem("seeker-plans-onboarding-shown", "1");
    requestSeekerTour("plans-onboarding");
  }, [inOnboarding]);

  const handleContinue = async () => {
    await completeOnboarding.mutateAsync().catch(() => {});
    router.push("/annix/orbit/seeker/dashboard");
  };

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
      onError: () =>
        alert({ message: "Couldn't switch plan. Please try again.", variant: "error" }),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-2xl">
        {inOnboarding ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Account setup · Step 2 of 2
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold text-white">Plans</h1>
        <p className="mt-2 text-sm text-white/70">
          Choose how far you want to go. Start free on Explorer, or switch to a higher plan any time
          for sharper matching, more Nix Job Finds and the full toolkit. It's free while Annix Orbit
          is in testing — billing comes later.
          {inOnboarding
            ? " This wraps up account setup — next, we'll help you build your profile."
            : ""}
        </p>
      </div>

      <div className="mt-8" data-nix-target="seeker-plans-tiers">
        {isLoading ? (
          <p className="text-sm text-white/60">Loading plans…</p>
        ) : isPlansError ? (
          <div className="max-w-md rounded-xl border border-white/15 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">We couldn't load the plans</p>
            <p className="mt-1 text-sm text-white/70">
              That's on us, not you — please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => plansQuery.refetch()}
              disabled={isRefetchingPlans}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent,#FF8A00)] px-4 py-2 text-sm font-semibold text-[#1a1a40] transition-colors hover:bg-[var(--brand-accent-light,#FF9C33)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefetchingPlans ? "Trying again…" : "Try again"}
            </button>
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-white/60">Plans are being set up. Please check back soon.</p>
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
        <button
          type="button"
          data-nix-target="seeker-plans-finish"
          onClick={handleContinue}
          disabled={completeOnboarding.isPending}
          className={`inline-flex items-center gap-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${finishPalette}`}
        >
          {inOnboarding
            ? "Finish setup — start building your profile →"
            : "Continue to your dashboard →"}
        </button>
      </div>
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
