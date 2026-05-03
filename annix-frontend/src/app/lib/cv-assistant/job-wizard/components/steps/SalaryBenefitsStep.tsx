"use client";

import { useToast } from "@/app/components/Toast";
import type { JobPosting, UpdateJobWizardPayload } from "@/app/lib/api/cvAssistantApi";
import { useCvNixSalaryGuidance } from "@/app/lib/query/hooks";
import { arrOr, strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, textareaClass } from "../StepShell";

export interface SalaryBenefitsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

export function SalaryBenefitsStep({ draft, onChange }: SalaryBenefitsStepProps) {
  const benefitsArray = arrOr(draft.benefits);
  const benefits = benefitsArray.join(", ");
  const minDefault = numToStr(draft.salaryMin);
  const maxDefault = numToStr(draft.salaryMax);
  const currencyDefault = strOr(draft.salaryCurrency, "ZAR");
  const commissionDefault = strOr(draft.commissionStructure);
  const { showToast } = useToast();
  const salaryGuidance = useCvNixSalaryGuidance();
  const guidanceData = salaryGuidance.data;
  const isGuiding = salaryGuidance.isPending;
  const handleGuidance = () => {
    salaryGuidance.mutate(draft.id, {
      onError: () => showToast("Couldn't fetch salary guidance. Try again.", "error"),
    });
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

      <div className="space-y-2">
        <FieldLabel
          htmlFor="commission-structure"
          hint="Optional. e.g. 10% of gross profit on closed deals, paid quarterly."
        >
          Commission / Variable Comp
        </FieldLabel>
        <textarea
          id="commission-structure"
          className={textareaClass}
          placeholder="Describe any commission, bonus or variable structure…"
          defaultValue={commissionDefault}
          onBlur={(e) => onChange({ commissionStructure: e.target.value.trim() })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel
          htmlFor="benefits"
          hint="Comma-separated. e.g. Medical aid, Pension, Cell phone allowance, Company vehicle."
        >
          Benefits
        </FieldLabel>
        <input
          id="benefits"
          type="text"
          className={inputClass}
          placeholder="Medical aid, Pension, Vehicle…"
          defaultValue={benefits}
          onBlur={(e) =>
            onChange({
              benefits: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
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
