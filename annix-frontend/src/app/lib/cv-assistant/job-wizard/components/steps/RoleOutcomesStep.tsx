"use client";

import { useToast } from "@/app/components/Toast";
import {
  cvAssistantApiClient,
  type JobPosting,
  type JobSuccessMetric,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { useNixCall } from "../../hooks/useNixCall";
import { arrOr, strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, textareaClass } from "../StepShell";

export interface RoleOutcomesStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

const filterMetrics = (metrics: JobSuccessMetric[], timeframe: JobSuccessMetric["timeframe"]) =>
  metrics.filter((m) => m.timeframe === timeframe);

export function RoleOutcomesStep({ draft, onChange }: RoleOutcomesStepProps) {
  const successMetrics = arrOr(draft.successMetrics);
  const companyContextDefault = strOr(draft.companyContext);
  const mainPurposeDefault = strOr(draft.mainPurpose);
  const descriptionDefault = strOr(draft.description);
  const threeMonthMetrics = filterMetrics(successMetrics, "3_months");
  const twelveMonthMetrics = filterMetrics(successMetrics, "12_months");
  const { showToast } = useToast();
  const nixDescription = useNixCall({
    operation: "description",
    label: "Nix is drafting your job description…",
    fn: (id: number) => cvAssistantApiClient.nixDescription(id),
  });
  const isDrafting = nixDescription.isPending;
  const handleDraft = () => {
    nixDescription.mutate(draft.id, {
      onSuccess: (data) => {
        onChange({ description: data.candidateFacingDescription });
        showToast("Nix drafted a description — review and tweak as needed.", "success");
      },
      onError: () => {
        showToast("Nix couldn't draft right now. Try again in a moment.", "error");
      },
    });
  };

  const updateMetric = (timeframe: JobSuccessMetric["timeframe"], index: number, value: string) => {
    const target = filterMetrics(successMetrics, timeframe);
    const others = successMetrics.filter((m) => m.timeframe !== timeframe);
    const updated = [...target];
    updated[index] = { ...updated[index], metric: value };
    onChange({ successMetrics: [...others, ...updated.filter((m) => m.metric.trim().length > 0)] });
  };

  const addMetric = (timeframe: JobSuccessMetric["timeframe"]) => {
    onChange({
      successMetrics: [
        ...successMetrics,
        { timeframe, metric: "", sortOrder: filterMetrics(successMetrics, timeframe).length },
      ],
    });
  };

  const removeMetric = (timeframe: JobSuccessMetric["timeframe"], index: number) => {
    const target = filterMetrics(successMetrics, timeframe);
    const others = successMetrics.filter((m) => m.timeframe !== timeframe);
    const remaining = target.filter((_, i) => i !== index);
    onChange({ successMetrics: [...others, ...remaining] });
  };

  return (
    <StepShell
      title="Role Outcomes"
      subtitle="Describe what this person will do and what success looks like. Phase 2 lets Nix turn these into a polished candidate-facing description."
    >
      <div className="space-y-2">
        <FieldLabel
          htmlFor="company-context"
          hint="One short paragraph about your team or company."
        >
          Company Context
        </FieldLabel>
        <textarea
          id="company-context"
          name="companyContext"
          className={textareaClass}
          placeholder="e.g. We're a fast-growing rubber-lining manufacturer based in Boksburg…"
          defaultValue={companyContextDefault}
          onBlur={(e) => onChange({ companyContext: e.target.value.trim() })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="main-purpose" hint="One sentence: why this role exists.">
          Main Purpose *
        </FieldLabel>
        <input
          id="main-purpose"
          name="mainPurpose"
          type="text"
          className={inputClass}
          placeholder="e.g. Drive new external sales for our industrial rubber products in Gauteng."
          defaultValue={mainPurposeDefault}
          onBlur={(e) => onChange({ mainPurpose: e.target.value.trim() })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="job-description" hint="Nix can draft this from the inputs above.">
            Description
          </FieldLabel>
          <button
            type="button"
            disabled={isDrafting}
            onClick={handleDraft}
            className="text-xs px-3 py-1.5 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
          >
            {isDrafting ? "Nix is drafting…" : "Help me write this"}
          </button>
        </div>
        <textarea
          key={descriptionDefault}
          id="job-description"
          name="description"
          className={textareaClass}
          placeholder="Responsibilities, requirements, and what success looks like…"
          defaultValue={descriptionDefault}
          onBlur={(e) => onChange({ description: e.target.value.trim() })}
        />
      </div>

      <SuccessMetricList
        title="Success in 3 months"
        timeframe="3_months"
        metrics={threeMonthMetrics}
        onUpdate={(i, v) => updateMetric("3_months", i, v)}
        onAdd={() => addMetric("3_months")}
        onRemove={(i) => removeMetric("3_months", i)}
      />

      <SuccessMetricList
        title="Success in 12 months"
        timeframe="12_months"
        metrics={twelveMonthMetrics}
        onUpdate={(i, v) => updateMetric("12_months", i, v)}
        onAdd={() => addMetric("12_months")}
        onRemove={(i) => removeMetric("12_months", i)}
      />
    </StepShell>
  );
}

function SuccessMetricList({
  title,
  metrics,
  onUpdate,
  onAdd,
  onRemove,
}: {
  title: string;
  timeframe: JobSuccessMetric["timeframe"];
  metrics: JobSuccessMetric[];
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[#1a1a40]">{title}</h3>
      <ul className="space-y-2">
        {metrics.map((metric, i) => (
          <li key={i} className="flex items-start gap-2">
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Closed first R250k of new business"
              defaultValue={metric.metric}
              onBlur={(e) => onUpdate(i, e.target.value.trim())}
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              aria-label="Remove outcome"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="text-sm font-semibold text-[#252560] hover:text-[#1a1a40]"
      >
        + Add outcome
      </button>
    </div>
  );
}
