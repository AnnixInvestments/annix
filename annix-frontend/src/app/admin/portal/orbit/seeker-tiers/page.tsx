"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  useAdminOrbitSeekerMatchTier,
  useAdminSetOrbitSeekerMatchTier,
} from "@/app/lib/query/hooks";

const TIER_OPTIONS = [
  {
    key: "soft",
    label: "Soft (free)",
    description: "Full job pool; small score boost for the seeker's target categories.",
  },
  {
    key: "medium",
    label: "Medium",
    description: "Pool narrowed to target + adjacent categories; higher category boost.",
  },
  {
    key: "hard",
    label: "Hard",
    description: "Pool strictly limited to the seeker's exact target categories.",
  },
];

export default function AdminOrbitSeekerTiersPage() {
  const { showToast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [appliedEmail, setAppliedEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState("soft");

  const lookupQuery = useAdminOrbitSeekerMatchTier(appliedEmail);
  const setTierMutation = useAdminSetOrbitSeekerMatchTier();

  const lookupData = lookupQuery.data;
  const currentTier = lookupData ? lookupData.matchTier : null;
  const hasCandidate = lookupData ? lookupData.hasCandidate : false;
  const targetCategories = lookupData ? lookupData.targetCategories : [];
  const candidateCount = lookupData ? lookupData.candidateIds.length : 0;
  const isSaving = setTierMutation.isPending;
  const isLookingUp = lookupQuery.isLoading;
  const tierUnchanged = selectedTier === currentTier;

  useEffect(() => {
    if (currentTier) setSelectedTier(currentTier);
  }, [currentTier]);

  const handleLookup = () => {
    setAppliedEmail(emailInput.trim());
  };

  const handleSave = () => {
    const email = appliedEmail.trim();
    if (!email) return;
    setTierMutation.mutate(
      { email, tier: selectedTier },
      {
        onSuccess: (result) => {
          if (result.candidatesAffected > 0) {
            showToast(
              `Set tier to "${result.matchTier}" for ${result.candidatesAffected} candidate(s). The seeker should re-run "Help me Find a Job" to see the effect.`,
              "success",
            );
          } else {
            showToast("No candidate found for that email.", "error");
          }
        },
        onError: () => {
          showToast("Couldn't update the seeker's tier.", "error");
        },
      },
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/portal/orbit"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Orbit admin hub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Seeker match tiers</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Override a seeker's Nix matching strength for testing. Billing will drive this
            automatically later.
          </p>
        </div>
        <Link
          href="/admin/portal/orbit/job-market"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Job market →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <label className="block text-sm font-medium text-gray-700" htmlFor="seeker-email">
          Seeker email
        </label>
        <div className="flex gap-2">
          <input
            id="seeker-email"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup();
            }}
            placeholder="seeker@example.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleLookup}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Look up
          </button>
        </div>

        {appliedEmail && isLookingUp ? (
          <p className="text-sm text-gray-500">Looking up {appliedEmail}…</p>
        ) : null}

        {appliedEmail && !isLookingUp && !hasCandidate ? (
          <p className="text-sm text-amber-700">
            No seeker candidate found for {appliedEmail}. They need a saved CV (and matching
            consent) first.
          </p>
        ) : null}

        {hasCandidate ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              <p>
                Current tier: <span className="font-semibold">{currentTier}</span> ·{" "}
                {candidateCount} candidate record(s)
              </p>
              <p className="mt-1">
                Target categories:{" "}
                {targetCategories.length > 0 ? (
                  <span className="font-medium">{targetCategories.join(", ")}</span>
                ) : (
                  <span className="text-gray-400">none derived yet</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              {TIER_OPTIONS.map((option) => {
                const isSelected = selectedTier === option.key;
                return (
                  <label
                    key={option.key}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                      isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value={option.key}
                      checked={isSelected}
                      onChange={() => setSelectedTier(option.key)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-gray-500">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || tierUnchanged}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save tier"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
