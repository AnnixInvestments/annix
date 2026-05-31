"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitTierCapability, OrbitTierFeatures } from "@/app/lib/api/adminApi";
import {
  useAdminOrbitSeekerMatchTier,
  useAdminOrbitTierCapabilities,
  useAdminSetOrbitSeekerMatchTier,
  useAdminUpdateOrbitTierCapability,
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
    label: "Heavy",
    description: "Pool strictly limited to the seeker's exact target categories.",
  },
];

const STRICTNESS_OPTIONS = ["soft", "medium", "hard"];

const FEATURE_COLUMNS: Array<{ key: keyof OrbitTierFeatures; label: string }> = [
  { key: "applyToJobs", label: "Apply to jobs" },
  { key: "viewSalaries", label: "View salaries" },
  { key: "nixCvBuilder", label: "Nix CV builder" },
  { key: "jobListingSite", label: "Job listing site" },
];

interface TierDraft {
  matchStrictness: string;
  maxJobResults: string;
  features: OrbitTierFeatures;
}

function toDraft(row: OrbitTierCapability): TierDraft {
  const maxResults = row.maxJobResults;
  return {
    matchStrictness: row.matchStrictness,
    maxJobResults: maxResults === null ? "" : String(maxResults),
    features: { ...row.features },
  };
}

export default function AdminOrbitSeekerTiersPage() {
  const { showToast } = useToast();

  const capabilitiesQuery = useAdminOrbitTierCapabilities();
  const updateCapability = useAdminUpdateOrbitTierCapability();
  const capabilitiesData = capabilitiesQuery.data;
  const capabilities = capabilitiesData ?? [];
  const isLoadingCapabilities = capabilitiesQuery.isLoading;

  const [drafts, setDrafts] = useState<Record<string, TierDraft>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);

  useEffect(() => {
    if (capabilities.length === 0) return;
    const next: Record<string, TierDraft> = {};
    capabilities.forEach((row: OrbitTierCapability) => {
      next[row.tier] = toDraft(row);
    });
    setDrafts(next);
  }, [capabilities]);

  const handleStrictnessChange = (tier: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      return { ...prev, [tier]: { ...current, matchStrictness: value } };
    });
  };

  const handleMaxResultsChange = (tier: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      return { ...prev, [tier]: { ...current, maxJobResults: value } };
    });
  };

  const handleFeatureToggle = (tier: string, feature: keyof OrbitTierFeatures) => {
    setDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      const nextFeatures = { ...current.features, [feature]: !current.features[feature] };
      return { ...prev, [tier]: { ...current, features: nextFeatures } };
    });
  };

  const handleSaveTier = async (tier: string) => {
    const draft = drafts[tier];
    if (!draft) return;
    const trimmed = draft.maxJobResults.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      showToast("Max job results must be a positive number or blank for unlimited.", "error");
      return;
    }
    setSavingTier(tier);
    try {
      await updateCapability.mutateAsync({
        tier,
        matchStrictness: draft.matchStrictness,
        maxJobResults: parsed,
        features: draft.features,
      });
      showToast(`Saved "${tier}" tier capabilities.`, "success");
    } catch {
      showToast("Could not save tier capabilities.", "error");
    } finally {
      setSavingTier(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/portal/orbit"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Orbit admin hub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Seeker tiers</h1>
          <p className="text-gray-600 mt-1 text-sm max-w-2xl">
            Define what each tier unlocks — match strictness, how many matched jobs a seeker sees,
            and which features are available. Billing will assign tiers automatically later; for now
            you can also override a single seeker below.
          </p>
        </div>
        <Link
          href="/admin/portal/orbit/job-market"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Job market →
        </Link>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tier capabilities</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            The rules every seeker on a tier inherits. Leave “Max jobs” blank for unlimited.
          </p>
        </div>

        {isLoadingCapabilities ? (
          <p className="text-sm text-gray-500">Loading tiers…</p>
        ) : capabilities.length === 0 ? (
          <p className="text-sm text-amber-700">
            No tier capabilities configured yet. Run the seed migration to create the default tiers.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Match strictness</th>
                  <th className="px-3 py-2 font-medium">Max jobs</th>
                  {FEATURE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium text-center">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {capabilities.map((row: OrbitTierCapability) => {
                  const draft = drafts[row.tier];
                  if (!draft) return null;
                  const isSaving = savingTier === row.tier;
                  return (
                    <tr key={row.tier} className="text-gray-900">
                      <td className="px-3 py-3 font-medium whitespace-nowrap">{row.label}</td>
                      <td className="px-3 py-3">
                        <select
                          value={draft.matchStrictness}
                          onChange={(e) => handleStrictnessChange(row.tier, e.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        >
                          {STRICTNESS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          value={draft.maxJobResults}
                          onChange={(e) => handleMaxResultsChange(row.tier, e.target.value)}
                          placeholder="∞"
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      {FEATURE_COLUMNS.map((col) => {
                        const checked = draft.features[col.key];
                        return (
                          <td key={col.key} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleFeatureToggle(row.tier, col.key)}
                              className="h-4 w-4"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveTier(row.tier)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SeekerOverrideSection />
    </div>
  );
}

function SeekerOverrideSection() {
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
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Override a single seeker</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          For testing — force one seeker onto a tier. Billing will drive this automatically later.
        </p>
      </div>

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
          No seeker candidate found for {appliedEmail}. They need a saved CV (and matching consent)
          first.
        </p>
      ) : null}

      {hasCandidate ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            <p>
              Current tier: <span className="font-semibold">{currentTier}</span> · {candidateCount}{" "}
              candidate record(s)
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
                    <span className="block text-sm font-medium text-gray-900">{option.label}</span>
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
    </section>
  );
}
