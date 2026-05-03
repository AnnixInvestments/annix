"use client";

import type { JobPosting, UpdateJobWizardPayload } from "@/app/lib/api/cvAssistantApi";
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

      <div className="rounded-lg bg-[#f5f5fc] border border-[#e0e0f5] p-4 text-sm text-gray-600">
        <p className="font-semibold text-[#1a1a40]">Salary intelligence — coming soon</p>
        <p className="mt-1">
          In Phase 5, Nix will pull live SA market data (Adzuna) and tell you whether your range is
          below median, in line, or above market for this title and province.
        </p>
      </div>
    </StepShell>
  );
}
