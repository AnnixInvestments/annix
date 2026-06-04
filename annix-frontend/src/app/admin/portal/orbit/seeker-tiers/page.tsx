"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type TierPlanPricing,
  TierPlans,
  type TierPlanView,
} from "@/app/components/orbit/TierPlans";
import { useToast } from "@/app/components/Toast";
import type { OrbitTierCapability, OrbitTierFeatures } from "@/app/lib/api/adminApi";
import {
  useAdminInviteSeekerTrial,
  useAdminOrbitSeekerMatchTier,
  useAdminOrbitTierCapabilities,
  useAdminSetOrbitSeekerMatchTier,
  useAdminUpdateOrbitTierCapability,
} from "@/app/lib/query/hooks";

const TIER_OPTIONS = [
  {
    key: "soft",
    label: "Explorer (free)",
    description: "Full job pool; small score boost for the seeker's target categories.",
  },
  {
    key: "medium",
    label: "Pathfinder",
    description: "Pool narrowed to target + adjacent categories; higher category boost.",
  },
  {
    key: "hard",
    label: "Trailblazer",
    description: "Pool strictly limited to the seeker's exact target categories.",
  },
];

const STRICTNESS_OPTIONS = ["soft", "medium", "hard"];

const FEATURE_COLUMNS: Array<{ key: keyof OrbitTierFeatures; label: string }> = [
  { key: "applyToJobs", label: "Apply to jobs" },
  { key: "viewSalaries", label: "View salaries" },
  { key: "nixCvBuilder", label: "Nix CV builder" },
  { key: "photoCredentialCapture", label: "Photo credential capture" },
  { key: "jobListingSite", label: "Job listing site" },
  { key: "multiChannelReminders", label: "SMS/WhatsApp reminders" },
];

// Suggested ZAR pricing, benchmarked against SA job-seeker tools
// (LinkedIn Premium ~R250/mo, PNet paid ~R150/mo, Careers24/Indeed free).
const SUGGESTED_PRICING: Record<string, TierPlanPricing> = {
  soft: { monthlyPrice: 0, perNixRun: 29, perCvBuild: 59 },
  medium: { monthlyPrice: 99, perNixRun: 19, perCvBuild: null },
  hard: { monthlyPrice: 199, perNixRun: null, perCvBuild: null },
};

// Included CV builds / month: free is pay-per-use, Pathfinder capped, Trailblazer unlimited.
const SUGGESTED_CV_BUILDS: Record<string, number | null> = {
  soft: 0,
  medium: 4,
  hard: null,
};

interface TierDraft {
  matchStrictness: string;
  maxJobResults: string;
  monthlyNixRuns: string;
  monthlyCvBuilds: string;
  features: OrbitTierFeatures;
}

function toDraft(row: OrbitTierCapability): TierDraft {
  const maxResults = row.maxJobResults;
  const nixRuns = row.monthlyNixRuns;
  const cvBuilds = row.monthlyCvBuilds;
  return {
    matchStrictness: row.matchStrictness,
    maxJobResults: maxResults === null ? "" : String(maxResults),
    monthlyNixRuns: nixRuns === null ? "" : String(nixRuns),
    monthlyCvBuilds: cvBuilds == null ? "" : String(cvBuilds),
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
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, TierPlanPricing>>({});
  const [savingPricingTier, setSavingPricingTier] = useState<string | null>(null);

  useEffect(() => {
    if (capabilities.length === 0) return;
    const next: Record<string, TierDraft> = {};
    const nextPricing: Record<string, TierPlanPricing> = {};
    capabilities.forEach((row: OrbitTierCapability) => {
      next[row.tier] = toDraft(row);
      const rawCvBuilds: number | null | undefined = row.monthlyCvBuilds;
      if (rawCvBuilds === undefined) {
        const suggestedCv = SUGGESTED_CV_BUILDS[row.tier];
        next[row.tier].monthlyCvBuilds = suggestedCv == null ? "" : String(suggestedCv);
      }
      const stored = row.pricing;
      const hasStored =
        stored != null &&
        (stored.monthlyPrice !== null || stored.perNixRun !== null || stored.perCvBuild !== null);
      if (stored && hasStored) {
        nextPricing[row.tier] = {
          monthlyPrice: stored.monthlyPrice,
          perNixRun: stored.perNixRun,
          perCvBuild: stored.perCvBuild,
        };
      } else {
        const suggested = SUGGESTED_PRICING[row.tier];
        nextPricing[row.tier] = suggested
          ? { ...suggested }
          : { monthlyPrice: null, perNixRun: null, perCvBuild: null };
      }
    });
    setDrafts(next);
    setPricingDrafts(nextPricing);
  }, [capabilities]);

  const handlePriceChange = (tier: string, field: keyof TierPlanPricing, value: number | null) => {
    setPricingDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      return { ...prev, [tier]: { ...current, [field]: value } };
    });
  };

  const handleSavePricing = async (tier: string) => {
    const pricing = pricingDrafts[tier];
    if (!pricing) return;
    setSavingPricingTier(tier);
    try {
      await updateCapability.mutateAsync({ tier, pricing });
      showToast("Saved pricing.", "success");
    } catch {
      showToast("Could not save pricing.", "error");
    } finally {
      setSavingPricingTier(null);
    }
  };

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

  const handleNixRunsChange = (tier: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      return { ...prev, [tier]: { ...current, monthlyNixRuns: value } };
    });
  };

  const handleCvBuildsChange = (tier: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[tier];
      if (!current) return prev;
      return { ...prev, [tier]: { ...current, monthlyCvBuilds: value } };
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
    const nixTrimmed = draft.monthlyNixRuns.trim();
    const nixParsed = nixTrimmed === "" ? null : Number(nixTrimmed);
    if (nixParsed !== null && (!Number.isFinite(nixParsed) || nixParsed < 0)) {
      showToast("Nix runs / month must be a positive number or blank for unlimited.", "error");
      return;
    }
    const cvTrimmed = draft.monthlyCvBuilds.trim();
    const cvParsed = cvTrimmed === "" ? null : Number(cvTrimmed);
    if (cvParsed !== null && (!Number.isFinite(cvParsed) || cvParsed < 0)) {
      showToast("CV builds / month must be a positive number or blank for unlimited.", "error");
      return;
    }
    setSavingTier(tier);
    try {
      await updateCapability.mutateAsync({
        tier,
        matchStrictness: draft.matchStrictness,
        maxJobResults: parsed,
        monthlyNixRuns: nixParsed,
        monthlyCvBuilds: cvParsed,
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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
            The rules every seeker on a tier inherits. “Max Nix matches” caps how many ranked job
            matches a seeker on this tier sees (the “Nix matches” count on Browse Jobs). Leave it
            blank for unlimited.
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
                  <th className="px-2 py-2 font-medium">Tier</th>
                  <th className="px-2 py-2 font-medium">Match strictness</th>
                  <th className="px-2 py-2 font-medium">Max Nix matches</th>
                  <th className="px-2 py-2 font-medium">Nix runs / month</th>
                  <th className="px-2 py-2 font-medium">CV builds / month</th>
                  {FEATURE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium text-center">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {capabilities.map((row: OrbitTierCapability) => {
                  const draft = drafts[row.tier];
                  if (!draft) return null;
                  const isSaving = savingTier === row.tier;
                  const tierOption = TIER_OPTIONS.find((option) => option.key === row.tier);
                  const displayLabel = tierOption ? tierOption.label : row.label;
                  return (
                    <tr key={row.tier} className="text-gray-900">
                      <td className="px-2 py-3 font-medium whitespace-nowrap">{displayLabel}</td>
                      <td className="px-2 py-3">
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
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min={0}
                          value={draft.maxJobResults}
                          onChange={(e) => handleMaxResultsChange(row.tier, e.target.value)}
                          placeholder="∞"
                          className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min={0}
                          value={draft.monthlyNixRuns}
                          onChange={(e) => handleNixRunsChange(row.tier, e.target.value)}
                          placeholder="∞"
                          className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          min={0}
                          value={draft.monthlyCvBuilds}
                          onChange={(e) => handleCvBuildsChange(row.tier, e.target.value)}
                          placeholder="∞"
                          className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      {FEATURE_COLUMNS.map((col) => {
                        const checked = draft.features[col.key] === true;
                        return (
                          <td key={col.key} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleFeatureToggle(row.tier, col.key)}
                              className="h-4 w-4"
                            />
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-right">
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

        {!isLoadingCapabilities && capabilities.length > 0 ? (
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">How seekers see it</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                This is the live plans view seekers see. Ticking a capability above updates it here;
                set the monthly and pay-as-you-go prices below, then Save pricing.
              </p>
            </div>
            <TierPlans
              editable
              plans={capabilities.map((row: OrbitTierCapability): TierPlanView => {
                const draft = drafts[row.tier];
                const tierOption = TIER_OPTIONS.find((option) => option.key === row.tier);
                const label = tierOption ? tierOption.label : row.label;
                const maxText = draft ? draft.maxJobResults.trim() : "";
                const nixText = draft ? draft.monthlyNixRuns.trim() : "";
                const cvText = draft ? draft.monthlyCvBuilds.trim() : "";
                return {
                  tier: row.tier,
                  label,
                  maxJobResults: draft
                    ? maxText === ""
                      ? null
                      : Number(maxText)
                    : row.maxJobResults,
                  monthlyNixRuns: draft
                    ? nixText === ""
                      ? null
                      : Number(nixText)
                    : row.monthlyNixRuns,
                  monthlyCvBuilds: draft
                    ? cvText === ""
                      ? null
                      : Number(cvText)
                    : row.monthlyCvBuilds,
                  features: draft ? draft.features : row.features,
                  pricing: row.pricing,
                };
              })}
              pricingDrafts={pricingDrafts}
              savingTier={savingPricingTier}
              onPriceChange={handlePriceChange}
              onSavePricing={handleSavePricing}
            />
          </div>
        ) : null}
      </section>

      <SeekerOverrideSection />

      <InviteSeekerTrialSection />
    </div>
  );
}

const TRIAL_TIER_OPTIONS = [
  { key: "soft", label: "Explorer (free)" },
  { key: "medium", label: "Pathfinder" },
  { key: "hard", label: "Trailblazer" },
];

function InviteSeekerTrialSection() {
  const { showToast } = useToast();
  const inviteMutation = useAdminInviteSeekerTrial();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("medium");
  const [freeDays, setFreeDays] = useState("14");

  const isSaving = inviteMutation.isPending;

  const handleInvite = () => {
    const trimmed = email.trim();
    const days = Number(freeDays);
    if (!trimmed || !Number.isFinite(days) || days <= 0) {
      showToast("Enter a valid email and number of free days.", "error");
      return;
    }
    inviteMutation.mutate(
      { email: trimmed, tier, freeDays: days },
      {
        onSuccess: (result) => {
          if (result.candidatesAffected > 0) {
            showToast(
              `Granted "${tier}" free for ${days} days to ${result.candidatesAffected} candidate(s).`,
              "success",
            );
            setEmail("");
          } else {
            showToast(
              "No seeker account found for that email yet — they'll get the tier once they sign up and upload a CV.",
              "info",
            );
          }
        },
        onError: () => showToast("Could not grant the trial.", "error"),
      },
    );
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Invite a seeker (free trial)</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Grant a seeker free access to a tier for a number of days. After the trial they revert to
          their normal tier (billing comes later).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
        <label className="flex flex-col sm:col-span-2">
          <span className="text-gray-500">Seeker email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seeker@example.com"
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1"
          >
            {TRIAL_TIER_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
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
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleInvite}
        disabled={isSaving}
        className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
      >
        {isSaving ? "Granting…" : "Grant free trial"}
      </button>
    </section>
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
