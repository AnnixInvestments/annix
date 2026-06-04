"use client";

import { Check, X } from "lucide-react";
import { HelpHint } from "@/app/components/ui/HelpHint";

export interface TierPlanFeatures {
  applyToJobs: boolean;
  viewSalaries: boolean;
  nixCvBuilder: boolean;
  jobListingSite: boolean;
  multiChannelReminders?: boolean;
  photoCredentialCapture?: boolean;
}

export interface TierPlanPricing {
  monthlyPrice: number | null;
  perNixRun: number | null;
  perCvBuild: number | null;
}

export interface TierPlanView {
  tier: string;
  label: string;
  maxJobResults: number | null;
  monthlyNixRuns: number | null;
  monthlyCvBuilds: number | null;
  features: TierPlanFeatures;
  pricing: TierPlanPricing | null;
}

type PricingField = keyof TierPlanPricing;

const FEATURE_ROWS: Array<{ key: keyof TierPlanFeatures; label: string; help: string }> = [
  {
    key: "applyToJobs",
    label: "Apply to jobs",
    help: "Apply to listed jobs directly from Annix Orbit.",
  },
  {
    key: "viewSalaries",
    label: "View salary ranges (if applicable)",
    help: "See a job's advertised salary range, when the employer has published one.",
  },
  {
    key: "nixCvBuilder",
    label: "Nix CV builder",
    help: "Let Nix write and polish a professional CV for you from your profile.",
  },
  {
    key: "photoCredentialCapture",
    label: "Photo credential capture",
    help: "Photograph a certificate or licence and Nix reads, names and files it for you.",
  },
  {
    key: "jobListingSite",
    label: "Job listing site access",
    help: "Browse and search the full open job board — not just your AI-matched recommendations.",
  },
  {
    key: "multiChannelReminders",
    label: "SMS / WhatsApp reminders",
    help: "Interview and deadline reminders by SMS and WhatsApp, not only email.",
  },
];

const LIMIT_HELP = {
  matchedJobs: "The number of jobs Nix keeps matched to your profile at any time.",
  nixJobFinds:
    "Each time you ask Nix to actively search and surface fresh jobs for you. Resets every month.",
  cvBuilds: "How many CVs Nix will generate or rebuild for you each month.",
};

const EMPTY_PRICING: TierPlanPricing = {
  monthlyPrice: null,
  perNixRun: null,
  perCvBuild: null,
};

function limitLabel(value: number | null, unit: string): string {
  if (value === null) {
    return `Unlimited ${unit}`;
  }
  return `${value} ${unit}`;
}

function cvBuildLabel(value: number | null): string | null {
  if (value === null) {
    return "Unlimited CV builds";
  }
  if (value === 0) {
    return null;
  }
  return `${value} CV builds / month`;
}

function PriceField(props: {
  label: string;
  prefix: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const text = props.value === null ? "" : String(props.value);
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-gray-500">{props.label}</span>
      <span className="flex items-center gap-1">
        <span className="text-gray-400">{props.prefix}</span>
        <input
          type="number"
          min={0}
          value={text}
          onChange={(event) => {
            const raw = event.target.value.trim();
            props.onChange(raw === "" ? null : Number(raw));
          }}
          placeholder="—"
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
        />
      </span>
    </label>
  );
}

export function TierPlans(props: {
  plans: TierPlanView[];
  editable?: boolean;
  highlightTier?: string;
  pricingDrafts?: Record<string, TierPlanPricing>;
  savingTier?: string | null;
  currentTier?: string | null;
  selectingTier?: string | null;
  onPriceChange?: (tier: string, field: PricingField, value: number | null) => void;
  onSavePricing?: (tier: string) => void;
  onSelectPlan?: (tier: string) => void;
}) {
  const editable = props.editable === true;
  const plans = props.plans;
  const drafts = props.pricingDrafts;
  const onSelectPlan = props.onSelectPlan;
  const currentTier = props.currentTier;
  const currentIndex = currentTier ? plans.findIndex((plan) => plan.tier === currentTier) : -1;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, planIndex) => {
        const storedPricing = plan.pricing ? plan.pricing : EMPTY_PRICING;
        const draft = drafts ? drafts[plan.tier] : undefined;
        const pricing = editable && draft ? draft : storedPricing;
        const monthly = pricing.monthlyPrice;
        const isFree = monthly === null || monthly === 0;
        const highlighted = props.highlightTier === plan.tier;
        const isSaving = props.savingTier === plan.tier;
        const isCurrentPlan = plan.tier === currentTier;
        const isSelectingPlan = props.selectingTier === plan.tier;
        const planCtaLabel = isCurrentPlan
          ? "Current plan"
          : currentIndex < 0
            ? "Choose this plan"
            : planIndex > currentIndex
              ? "Upgrade to this plan"
              : "Downgrade to this plan";
        const cvBuildLine = cvBuildLabel(plan.monthlyCvBuilds);
        const includedRows = FEATURE_ROWS.filter((row) => plan.features[row.key] === true);
        const excludedRows = FEATURE_ROWS.filter((row) => plan.features[row.key] !== true);
        const orderedRows = [...includedRows, ...excludedRows];
        const usageItems = [
          {
            label: "Extra Nix Job Find",
            value: storedPricing.perNixRun,
            help: "When your monthly Nix Job Finds run out, each additional one costs this.",
          },
          {
            label: "Nix CV builder",
            value: storedPricing.perCvBuild,
            help: "If your plan doesn't include CV builds, each CV Nix builds costs this.",
          },
        ].filter((item) => item.value !== null && item.value > 0);
        return (
          <div
            key={plan.tier}
            className={
              highlighted
                ? "flex flex-col rounded-2xl border-2 border-violet-500 bg-white p-5 shadow-sm"
                : "flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            }
          >
            <div className="text-lg font-semibold text-gray-900">{plan.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">
                {isFree ? "Free" : `R${monthly}`}
              </span>
              {isFree ? null : <span className="text-sm text-gray-500">/ month</span>}
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <span>{limitLabel(plan.maxJobResults, "matched jobs")}</span>
                <HelpHint label="Matched jobs" text={LIMIT_HELP.matchedJobs} />
              </div>
              <div className="flex items-center gap-1.5">
                <span>{limitLabel(plan.monthlyNixRuns, "Nix Job Finds / month")}</span>
                <HelpHint label="Nix Job Finds" text={LIMIT_HELP.nixJobFinds} />
              </div>
              {cvBuildLine ? (
                <div className="flex items-center gap-1.5">
                  <span>{cvBuildLine}</span>
                  <HelpHint label="CV builds" text={LIMIT_HELP.cvBuilds} />
                </div>
              ) : null}
            </div>

            <ul className="mt-4 space-y-2">
              {orderedRows.map((row) => {
                const included = plan.features[row.key] === true;
                return (
                  <li key={row.key} className="flex items-center gap-2 text-sm">
                    {included ? (
                      <Check className="h-4 w-4 shrink-0 text-violet-600" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-gray-300" />
                    )}
                    <span className={included ? "text-gray-800" : "text-gray-400 line-through"}>
                      {row.label}
                    </span>
                    <HelpHint label={row.label} text={row.help} />
                  </li>
                );
              })}
            </ul>

            {editable && draft && props.onPriceChange && props.onSavePricing ? (
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pricing (admin)
                </div>
                <PriceField
                  label="Monthly"
                  prefix="R"
                  value={draft.monthlyPrice}
                  onChange={(value) => props.onPriceChange?.(plan.tier, "monthlyPrice", value)}
                />
                <PriceField
                  label="Per extra Nix Job Find"
                  prefix="R"
                  value={draft.perNixRun}
                  onChange={(value) => props.onPriceChange?.(plan.tier, "perNixRun", value)}
                />
                <PriceField
                  label="Per Nix CV builder use"
                  prefix="R"
                  value={draft.perCvBuild}
                  onChange={(value) => props.onPriceChange?.(plan.tier, "perCvBuild", value)}
                />
                <button
                  type="button"
                  onClick={() => props.onSavePricing?.(plan.tier)}
                  disabled={isSaving}
                  className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save pricing"}
                </button>
              </div>
            ) : usageItems.length > 0 ? (
              <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm text-gray-600">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pay-as-you-go
                </div>
                {usageItems.map((item) => {
                  const priced = item.value;
                  return (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span>
                        {item.label}: R{priced}
                      </span>
                      <HelpHint label={item.label} text={item.help} />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {onSelectPlan ? (
              <button
                type="button"
                disabled={isCurrentPlan || isSelectingPlan}
                onClick={() => onSelectPlan(plan.tier)}
                className={
                  isCurrentPlan
                    ? "mt-auto cursor-default rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 pt-2 text-sm font-semibold text-violet-700"
                    : "mt-auto rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                }
              >
                {isSelectingPlan ? "Switching…" : planCtaLabel}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
