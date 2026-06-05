"use client";

import Link from "next/link";
import { EeDisclosureManager } from "@/app/annix/orbit/components/EeDisclosureManager";
import { useOrbitMyProfileStatus } from "@/app/lib/query/hooks";

export default function SeekerEeAttributesPage() {
  const statusQuery = useOrbitMyProfileStatus();
  const status = statusQuery.data;
  const inOnboarding = status ? status.onboardingComplete === false : false;

  return (
    <div className="space-y-6">
      {inOnboarding && (
        <div className="rounded-xl border border-[#e0e0f5] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7373c2]">
            Step 1 of 2
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">A little about you (optional)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Sharing your Employment Equity details is completely voluntary. It helps employers meet
            fair-hiring goals, but you can continue without it.
          </p>
        </div>
      )}

      <EeDisclosureManager />

      {inOnboarding && (
        <div className="flex justify-end">
          <Link
            href="/annix/orbit/seeker/plans"
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Continue to plans →
          </Link>
        </div>
      )}
    </div>
  );
}
