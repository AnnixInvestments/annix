"use client";

import Link from "next/link";
import { TierPlans } from "@/app/components/orbit/TierPlans";
import { useOrbitTierPlans } from "@/app/lib/query/hooks";

export default function SeekerPlansPage() {
  const plansQuery = useOrbitTierPlans();
  const plans = plansQuery.data ?? [];
  const isLoading = plansQuery.isLoading;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose how far you want to go. Start free on Explorer, or upgrade for sharper matching,
          more Nix runs and the full toolkit. Billing is coming soon — for now you can see exactly
          what each plan includes.
        </p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500">Plans are being set up. Please check back soon.</p>
        ) : (
          <TierPlans plans={plans} highlightTier="soft" />
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
    </div>
  );
}
