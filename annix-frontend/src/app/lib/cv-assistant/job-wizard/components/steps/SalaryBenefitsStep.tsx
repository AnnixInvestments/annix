"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  cvAssistantApiClient,
  type JobPosting,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { useCvSalaryInsights } from "@/app/lib/query/hooks";
import { useNixCall } from "../../hooks/useNixCall";
import { arrOr, strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, textareaClass } from "../StepShell";

export interface SalaryBenefitsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

type BenefitValueType = "percent" | "amount_zar" | null;
interface BenefitDefinition {
  key: string;
  label: string;
  valueType: BenefitValueType;
  hint?: string;
}

const BENEFITS_CATALOG: BenefitDefinition[] = [
  { key: "medical_aid", label: "Medical aid", valueType: "percent", hint: "Company %" },
  { key: "pension", label: "Pension fund", valueType: "percent", hint: "Company %" },
  { key: "provident", label: "Provident fund", valueType: "percent", hint: "Company %" },
  { key: "group_life", label: "Group life / risk cover", valueType: null },
  { key: "cell_allowance", label: "Cell phone allowance", valueType: "amount_zar" },
  { key: "travel_allowance", label: "Travel / fuel allowance", valueType: "amount_zar" },
  { key: "company_vehicle", label: "Company vehicle", valueType: null },
  { key: "thirteenth_cheque", label: "13th cheque", valueType: null },
  { key: "performance_bonus", label: "Performance bonus", valueType: null },
  { key: "hybrid_flexible", label: "Hybrid / flexible working", valueType: null },
  { key: "study_assistance", label: "Study assistance", valueType: null },
  { key: "wellness", label: "Wellness / EAP", valueType: null },
];

interface BenefitState {
  enabled: boolean;
  value: string;
}

interface ParsedBenefits {
  structured: Record<string, BenefitState>;
  other: string;
}

const parseBenefits = (entries: string[]): ParsedBenefits => {
  const structured: Record<string, BenefitState> = {};
  for (const def of BENEFITS_CATALOG) {
    structured[def.key] = { enabled: false, value: "" };
  }
  const remainder: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const def = BENEFITS_CATALOG.find((d) =>
      trimmed.toLowerCase().startsWith(d.label.toLowerCase()),
    );
    if (!def) {
      remainder.push(trimmed);
      continue;
    }
    const tail = trimmed.slice(def.label.length).trim();
    let value = "";
    if (tail.startsWith("(") && tail.endsWith(")")) {
      const inner = tail.slice(1, -1).trim();
      if (def.valueType === "percent") {
        const match = inner.match(/(\d+(?:\.\d+)?)/);
        value = match ? match[1] : "";
      } else if (def.valueType === "amount_zar") {
        const match = inner.match(/([\d\s,]+)/);
        value = match ? match[1].replace(/[\s,]/g, "") : "";
      }
    }
    structured[def.key] = { enabled: true, value };
  }

  return { structured, other: remainder.join(", ") };
};

const serializeBenefits = (structured: Record<string, BenefitState>, other: string): string[] => {
  const out: string[] = [];
  for (const def of BENEFITS_CATALOG) {
    const state = structured[def.key];
    if (!state.enabled) continue;
    const value = state.value.trim();
    if (def.valueType === "percent" && value) {
      out.push(`${def.label} (${value}% company contribution)`);
    } else if (def.valueType === "amount_zar" && value) {
      out.push(`${def.label} (R${value}/month)`);
    } else {
      out.push(def.label);
    }
  }
  const otherEntries = other
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...out, ...otherEntries];
};

export function SalaryBenefitsStep({ draft, onChange }: SalaryBenefitsStepProps) {
  const benefitsArray = arrOr(draft.benefits);
  const minDefault = numToStr(draft.salaryMin);
  const maxDefault = numToStr(draft.salaryMax);
  const currencyDefault = strOr(draft.salaryCurrency, "ZAR");
  const commissionDefault = strOr(draft.commissionStructure);
  const { showToast } = useToast();
  const salaryGuidance = useNixCall({
    operation: "salary-guidance",
    label: "Nix is benchmarking salary for this role…",
    fn: (id: number) => cvAssistantApiClient.nixSalaryGuidance(id),
  });
  const draftNormalizedTitle = draft.normalizedTitle;
  const draftTitle = draft.title;
  const benchmarkTitle = draftNormalizedTitle ? draftNormalizedTitle : draftTitle;
  const draftProvince = draft.province;
  const insights = useCvSalaryInsights({
    normalizedTitle: benchmarkTitle,
    province: draftProvince ? draftProvince : null,
  });
  const insightsData = insights.data;
  const guidanceData = salaryGuidance.data;
  const isGuiding = salaryGuidance.isPending;
  const handleGuidance = () => {
    salaryGuidance.mutate(draft.id, {
      onError: () => showToast("Couldn't fetch salary guidance. Try again.", "error"),
    });
  };

  const [commissionEnabled, setCommissionEnabled] = useState(commissionDefault.length > 0);
  const [benefitsState, setBenefitsState] = useState(() => parseBenefits(benefitsArray).structured);
  const [otherBenefits, setOtherBenefits] = useState(() => parseBenefits(benefitsArray).other);

  const persistBenefits = (nextStructured: Record<string, BenefitState>, nextOther: string) => {
    onChange({ benefits: serializeBenefits(nextStructured, nextOther) });
  };

  const toggleBenefit = (key: string) => {
    setBenefitsState((prev) => {
      const next = { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } };
      persistBenefits(next, otherBenefits);
      return next;
    });
  };

  const updateBenefitValue = (key: string, value: string) => {
    setBenefitsState((prev) => {
      const next = { ...prev, [key]: { ...prev[key], value } };
      persistBenefits(next, otherBenefits);
      return next;
    });
  };

  const handleOtherBlur = (value: string) => {
    setOtherBenefits(value);
    persistBenefits(benefitsState, value);
  };

  const handleCommissionToggle = () => {
    const next = !commissionEnabled;
    setCommissionEnabled(next);
    if (!next) {
      onChange({ commissionStructure: "" });
    }
  };

  return (
    <StepShell
      title="Salary & Benefits"
      subtitle="Set the band, commission and benefits. Phase 5 wires Nix into Adzuna SA market data so you'll see live percentile insights here."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <FieldLabel htmlFor="salary-min">Salary min (per month)</FieldLabel>
          <input
            id="salary-min"
            type="number"
            min={0}
            className={inputClass}
            defaultValue={minDefault}
            onBlur={(e) =>
              onChange({ salaryMin: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="salary-max">Salary max (per month)</FieldLabel>
          <input
            id="salary-max"
            type="number"
            min={0}
            className={inputClass}
            defaultValue={maxDefault}
            onBlur={(e) =>
              onChange({ salaryMax: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="salary-currency">Currency</FieldLabel>
          <input
            id="salary-currency"
            type="text"
            maxLength={3}
            className={inputClass}
            defaultValue={currencyDefault}
            onBlur={(e) =>
              onChange({ salaryCurrency: e.target.value.trim().toUpperCase() || "ZAR" })
            }
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-start gap-3">
          <input
            id="commission-enabled"
            type="checkbox"
            checked={commissionEnabled}
            onChange={handleCommissionToggle}
            className="mt-1 h-4 w-4 text-[#252560] border-gray-300 rounded focus:ring-[#252560]"
          />
          <label htmlFor="commission-enabled" className="cursor-pointer">
            <span className="text-sm font-semibold text-[#1a1a40]">
              Commission / variable comp is offered
            </span>
            <p className="text-xs text-gray-600 mt-0.5">
              Tick this if part of the package is performance-linked. The base salary band above
              should reflect the lower base — Nix's salary intelligence accounts for the trade-off
              between base and commission when benchmarking.
            </p>
          </label>
        </div>

        {commissionEnabled ? (
          <div className="space-y-2 pl-7">
            <FieldLabel
              htmlFor="commission-structure"
              hint="e.g. 10% of gross profit on closed deals, paid quarterly. OTE R45 000/month at 100% target."
            >
              Commission structure
            </FieldLabel>
            <textarea
              key={`comm-${commissionDefault}`}
              id="commission-structure"
              className={textareaClass}
              placeholder="Describe the commission, bonus or variable structure, including any on-target earnings (OTE)…"
              defaultValue={commissionDefault}
              onBlur={(e) => onChange({ commissionStructure: e.target.value.trim() })}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <h3 className="font-semibold text-[#1a1a40]">Benefits</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Tick everything offered. For medical aid and retirement funds, add the company
            contribution % so candidates can compare like-for-like.
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFITS_CATALOG.map((def) => {
            const state = benefitsState[def.key];
            return (
              <li key={def.key} className="bg-[#f5f5fc] border border-[#e0e0f5] rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={() => toggleBenefit(def.key)}
                    className="h-4 w-4 text-[#252560] border-gray-300 rounded focus:ring-[#252560]"
                  />
                  <span className="text-sm font-medium text-[#1a1a40]">{def.label}</span>
                </label>
                {state.enabled && def.valueType ? (
                  <div className="mt-2 pl-6 flex items-center gap-2">
                    {def.valueType === "amount_zar" ? (
                      <span className="text-xs text-gray-500">R</span>
                    ) : null}
                    <input
                      type="number"
                      min={0}
                      step={def.valueType === "percent" ? 0.5 : 100}
                      placeholder={def.valueType === "percent" ? "e.g. 50" : "e.g. 1500"}
                      value={state.value}
                      onChange={(e) => updateBenefitValue(def.key, e.target.value)}
                      className="flex-1 max-w-[140px] px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#252560]"
                    />
                    <span className="text-xs text-gray-500">
                      {def.valueType === "percent" ? "% company" : "/ month"}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="other-benefits"
            hint="Comma-separated. Anything not in the list above."
          >
            Other benefits
          </FieldLabel>
          <input
            key={`other-${otherBenefits}`}
            id="other-benefits"
            type="text"
            className={inputClass}
            placeholder="e.g. Stock options, Sabbatical, Free parking"
            defaultValue={otherBenefits}
            onBlur={(e) => handleOtherBlur(e.target.value.trim())}
          />
        </div>
      </div>

      <div className="rounded-lg bg-[#f5f5fc] border border-[#e0e0f5] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[#1a1a40]">Salary intelligence (Nix)</p>
          <button
            type="button"
            onClick={handleGuidance}
            disabled={isGuiding}
            className="text-xs px-3 py-1.5 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
          >
            {isGuiding ? "Nix thinking…" : guidanceData ? "Refresh" : "Ask Nix"}
          </button>
        </div>
        {insightsData && insightsData.sampleSize >= 5 ? (
          <BenchmarkInsightsCard data={insightsData} currency={currencyDefault} />
        ) : null}
        {guidanceData ? (
          <SalaryGuidanceCard
            data={guidanceData}
            currency={currencyDefault}
            onApply={() => {
              onChange({
                salaryMin: guidanceData.suggestedMin,
                salaryMax: guidanceData.suggestedMax,
              });
              showToast("Applied Nix's suggested band.", "success");
            }}
          />
        ) : (
          <p className="text-sm text-gray-600">
            Nix can recommend a competitive monthly band using SA labour-market knowledge. Phase 5b
            will swap this for a live Adzuna SA cache.
          </p>
        )}
      </div>
    </StepShell>
  );
}

interface SalaryGuidanceCardProps {
  data: {
    suggestedMin: number;
    suggestedMax: number;
    marketMedian: number;
    competitiveness: "low" | "medium" | "strong";
    confidence: number;
    warnings: string[];
    explanation: string;
  };
  currency: string;
  onApply: () => void;
}

function SalaryGuidanceCard({ data, currency, onApply }: SalaryGuidanceCardProps) {
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-ZA")}`;
  const competitivenessColor =
    data.competitiveness === "strong"
      ? "bg-emerald-100 text-emerald-800"
      : data.competitiveness === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  const confidencePct = Math.round(data.confidence * 100);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded p-2 border border-[#e0e0f5]">
          <div className="text-xs text-gray-500">Suggested min</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.suggestedMin)}</div>
        </div>
        <div className="bg-white rounded p-2 border border-[#e0e0f5]">
          <div className="text-xs text-gray-500">Market median</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.marketMedian)}</div>
        </div>
        <div className="bg-white rounded p-2 border border-[#e0e0f5]">
          <div className="text-xs text-gray-500">Suggested max</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.suggestedMax)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-semibold ${competitivenessColor}`}>
          {data.competitiveness} competitiveness
        </span>
        <span className="text-gray-500">Nix confidence {confidencePct}%</span>
      </div>
      <p className="text-sm text-gray-700">{data.explanation}</p>
      {data.warnings.length > 0 ? (
        <ul className="list-disc pl-5 space-y-0.5 text-sm text-amber-800">
          {data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onApply}
        className="text-xs px-3 py-1.5 bg-[#252560] text-white font-semibold rounded-lg hover:bg-[#1a1a40] transition-all"
      >
        Apply this band
      </button>
    </div>
  );
}

interface BenchmarkInsightsCardProps {
  data: {
    p25?: number | null;
    p50?: number | null;
    p75?: number | null;
    sampleSize: number;
    confidence?: number;
    source: string | null;
    attribution: string | null;
  };
  currency: string;
}

function BenchmarkInsightsCard({ data, currency }: BenchmarkInsightsCardProps) {
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : `${currency} ${n.toLocaleString("en-ZA")}`;
  const attribution = data.attribution;
  const confidencePct = data.confidence != null ? Math.round(data.confidence * 100) : null;
  return (
    <div className="rounded-lg bg-white border border-emerald-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
          Live SA market benchmark
        </span>
        <span className="text-xs text-gray-500">
          n={data.sampleSize}
          {confidencePct != null ? ` · ${confidencePct}% confidence` : null}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#f5f5fc] rounded p-2">
          <div className="text-xs text-gray-500">25th pct</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.p25)}</div>
        </div>
        <div className="bg-[#f5f5fc] rounded p-2">
          <div className="text-xs text-gray-500">Median</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.p50)}</div>
        </div>
        <div className="bg-[#f5f5fc] rounded p-2">
          <div className="text-xs text-gray-500">75th pct</div>
          <div className="text-sm font-semibold text-[#1a1a40]">{fmt(data.p75)}</div>
        </div>
      </div>
      {attribution ? <p className="text-[11px] text-gray-500 italic">{attribution}</p> : null}
    </div>
  );
}
