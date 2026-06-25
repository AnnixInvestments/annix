"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { TierPlans } from "@/app/components/orbit/TierPlans";
import { useToast } from "@/app/components/Toast";
import { requestSeekerTour } from "@/app/lib/annix-orbit/seekerTourSignal";
import type { SeekerPayableTier } from "@/app/lib/api/annixOrbitApi";
import { isApiError } from "@/app/lib/api/apiError";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCompleteOnboarding,
  useOrbitMyProfileStatus,
  useOrbitSeekerBillingStatus,
  useOrbitSeekerCancelSubscription,
  useOrbitSeekerCheckout,
  useOrbitSeekerEntitlements,
  useOrbitSelectSeekerPlan,
  useOrbitTierPlans,
} from "@/app/lib/query/hooks";

const PAYABLE_TIERS = new Set<string>(["medium", "hard"]);

const BILLING_STATUS_COPY: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
  trialing: { label: "Trial", tone: "border-sky-400/40 bg-sky-400/10 text-sky-200" },
  past_due: {
    label: "Payment overdue",
    tone: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  },
  none: { label: "Free plan", tone: "border-white/15 bg-white/5 text-white/70" },
};

function isPayableTier(tier: string): tier is SeekerPayableTier {
  return PAYABLE_TIERS.has(tier);
}

function SeekerPlansContent() {
  const plansQuery = useOrbitTierPlans();
  const plansData = plansQuery.data;
  const plans = plansData ?? [];
  const isLoading = plansQuery.isLoading;
  const isPlansError = plansQuery.isError;
  const isRefetchingPlans = plansQuery.isFetching;

  const entitlementsQuery = useOrbitSeekerEntitlements();
  const entitlements = entitlementsQuery.data;
  const currentTier = entitlements ? entitlements.tier : null;

  const billingQuery = useOrbitSeekerBillingStatus();
  const billing = billingQuery.data;
  const billingStatus = billing ? billing.billingStatus : "none";
  const paidUntil = billing ? billing.paidUntil : null;
  const subscription = billing ? billing.subscription : null;
  const hasActiveSubscription =
    subscription != null &&
    subscription.cancelledAt == null &&
    (billingStatus === "active" || billingStatus === "past_due");

  const selectPlan = useOrbitSelectSeekerPlan();
  const pendingSelectTier = selectPlan.variables;
  const selectingFreeTier = selectPlan.isPending ? pendingSelectTier : null;

  const checkout = useOrbitSeekerCheckout();
  const pendingCheckoutTier = checkout.variables;
  const checkoutTier = checkout.isPending ? pendingCheckoutTier : null;
  const selectingTier = selectingFreeTier ?? checkoutTier ?? null;

  const cancelSubscription = useOrbitSeekerCancelSubscription();

  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();

  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceParam = searchParams.get("reference");
  const trxrefParam = searchParams.get("trxref");
  const checkoutReference = referenceParam ?? trxrefParam;

  const statusQuery = useOrbitMyProfileStatus();
  const status = statusQuery.data;
  const inOnboarding = status ? status.onboardingComplete === false : false;
  const completeOnboarding = useOrbitCompleteOnboarding();
  const finishPalette = inOnboarding
    ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
    : "bg-violet-600 text-white hover:bg-violet-700";

  const billingRefetch = billingQuery.refetch;
  const entitlementsRefetch = entitlementsQuery.refetch;
  const returnHandledRef = useRef(false);
  useEffect(() => {
    if (!checkoutReference || returnHandledRef.current) {
      return;
    }
    returnHandledRef.current = true;
    billingRefetch();
    entitlementsRefetch();
  }, [checkoutReference, billingRefetch, entitlementsRefetch]);

  const activationToastShownRef = useRef(false);
  useEffect(() => {
    if (!checkoutReference || activationToastShownRef.current) {
      return;
    }
    if (billingStatus === "active") {
      activationToastShownRef.current = true;
      showToast("You're all set — your plan is now active.", "success");
    }
  }, [checkoutReference, billingStatus, showToast]);

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

  const handleSelectFreePlan = async (tier: string) => {
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

  const handleStartCheckout = (tier: SeekerPayableTier) => {
    checkout.mutate(tier, {
      onSuccess: (result) => {
        // eslint-disable-next-line no-restricted-syntax -- intentional full-page navigation to Paystack hosted checkout
        if (typeof window !== "undefined") {
          window.location.href = result.authorizationUrl;
        }
      },
      onError: (error) => {
        const billingUnavailable = isApiError(error) && error.status === 503;
        const message = billingUnavailable
          ? "Paid plans aren't available just yet — please check back soon."
          : "We couldn't start checkout. Please try again in a moment.";
        showToast(message, billingUnavailable ? "info" : "error");
      },
    });
  };

  const handleSelectPlan = (tier: string) => {
    if (isPayableTier(tier)) {
      handleStartCheckout(tier);
      return;
    }
    handleSelectFreePlan(tier);
  };

  const handleCancelSubscription = async () => {
    const keepUntil = paidUntil ? formatDateLongZA(paidUntil) : null;
    const message = keepUntil
      ? `Your subscription will end and won't renew. You keep full access until ${keepUntil}.`
      : "Your subscription will end and won't renew. You keep full access until the end of your current paid period.";
    const confirmed = await confirm({
      title: "Cancel your subscription?",
      message,
      confirmLabel: "Cancel subscription",
      cancelLabel: "Keep my plan",
      variant: "warning",
    });
    if (!confirmed) return;
    cancelSubscription.mutate(undefined, {
      onSuccess: () =>
        showToast("Your subscription won't renew. You keep access until the period ends.", "info"),
      onError: () =>
        alert({
          message: "Couldn't cancel your subscription. Please try again.",
          variant: "error",
        }),
    });
  };

  const statusCopyForStatus = BILLING_STATUS_COPY[billingStatus];
  const statusCopy = statusCopyForStatus ? statusCopyForStatus : BILLING_STATUS_COPY.none;
  const paidUntilLabel = paidUntil ? formatDateLongZA(paidUntil) : null;
  const subscriptionCancelled = subscription != null && subscription.cancelledAt != null;
  const showBillingPanel = billingStatus !== "none" || hasActiveSubscription;

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
          Choose how far you want to go. Start free on Explorer, or upgrade any time for sharper
          matching, more Nix Job Finds and the full toolkit.
          {inOnboarding
            ? " This wraps up account setup — next, we'll help you build your profile."
            : ""}
        </p>
      </div>

      {showBillingPanel ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-white/15 bg-white/5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-white">Your subscription</span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCopy.tone}`}
            >
              {statusCopy.label}
            </span>
          </div>
          {billingStatus === "past_due" ? (
            <p className="mt-2 text-sm text-amber-200/90">
              Your last payment didn't go through. Upgrade again below to keep your plan active.
            </p>
          ) : paidUntilLabel ? (
            <p className="mt-2 text-sm text-white/70">
              {subscriptionCancelled
                ? `Cancelled — your plan stays active until ${paidUntilLabel}.`
                : `Your plan renews on ${paidUntilLabel}.`}
            </p>
          ) : null}
          {hasActiveSubscription && !subscriptionCancelled ? (
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={cancelSubscription.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelSubscription.isPending ? "Cancelling…" : "Cancel subscription"}
            </button>
          ) : null}
        </div>
      ) : null}

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

export default function SeekerPlansPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-white/60">Loading plans…</p>}>
      <SeekerPlansContent />
    </Suspense>
  );
}
