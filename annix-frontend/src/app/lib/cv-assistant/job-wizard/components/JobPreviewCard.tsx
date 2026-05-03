"use client";

import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import { EMPLOYMENT_TYPE_OPTIONS } from "../constants/employment-types";
import { WORK_MODE_OPTIONS } from "../constants/work-modes";

export interface JobPreviewCardProps {
  draft: JobPosting | null;
  /** Nix-generated quick preview keyed off the title alone — appears
   *  before the user has filled in outcomes, so they can see how the
   *  role would read to a candidate. */
  titlePreview?: {
    samplePreview: string;
    sampleResponsibilities: string[];
    normalizedTitle: string;
  } | null;
}

const formatSalaryRange = (
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
): string | null => {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-ZA")}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} / month`;
  if (min != null) return `from ${fmt(min)} / month`;
  return `up to ${fmt(max as number)} / month`;
};

export function JobPreviewCard({ draft, titlePreview }: JobPreviewCardProps) {
  if (!draft) return null;

  const employmentType = draft.employmentType;
  const employmentMatch = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === employmentType);
  const employmentLabel = employmentMatch?.label;
  const workMode = draft.workMode;
  const workModeMatch = WORK_MODE_OPTIONS.find((o) => o.value === workMode);
  const workModeLabel = workModeMatch?.label;
  const salary = draft.salaryCurrency;
  const currency = salary || "ZAR";
  const salaryRange = formatSalaryRange(draft.salaryMin, draft.salaryMax, currency);
  const draftSkills = draft.skills;
  const skills = draftSkills || [];
  const draftMetrics = draft.successMetrics;
  const successMetrics = draftMetrics || [];
  const description = draft.description;
  const titleText = draft.title;
  const titleDisplay = titleText ? titleText : "Untitled role";

  return (
    <article className="bg-white rounded-xl shadow-md border border-[#252560]/30 p-6 space-y-4">
      <header>
        <p className="text-xs text-gray-500 uppercase tracking-widest">Candidate-facing preview</p>
        <h2 className="text-xl font-bold text-[#1a1a40] mt-1">{titleDisplay}</h2>
        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
          {draft.location && <span>{draft.location}</span>}
          {draft.province && <span>· {draft.province}</span>}
          {employmentLabel && <span>· {employmentLabel}</span>}
          {workModeLabel && <span>· {workModeLabel}</span>}
        </div>
        {salaryRange && <p className="text-sm font-semibold text-[#252560] mt-2">{salaryRange}</p>}
      </header>

      {description ? (
        <section className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
          {description}
        </section>
      ) : titlePreview?.samplePreview ? (
        <section className="space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">{titlePreview.samplePreview}</p>
          {titlePreview.sampleResponsibilities.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Typical responsibilities
              </p>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
                {titlePreview.sampleResponsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-[11px] text-gray-400 italic">
            Sample preview from Nix based on the title. Will be replaced once you write the
            description in step 2.
          </p>
        </section>
      ) : (
        <p className="text-sm text-gray-400 italic">
          Type a role title above and Nix will show how it would read to a candidate. Or fill in the
          role outcomes in step 2 to write the full description.
        </p>
      )}

      {successMetrics.length > 0 && (
        <section>
          <h3 className="font-semibold text-[#1a1a40] mb-2">What success looks like</h3>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
            {successMetrics.map((m) => (
              <li key={`${m.timeframe}-${m.metric}`}>
                <span className="font-medium">
                  {m.timeframe === "3_months" ? "By 3 months: " : "By 12 months: "}
                </span>
                {m.metric}
              </li>
            ))}
          </ul>
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <h3 className="font-semibold text-[#1a1a40] mb-2">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s.name}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  s.importance === "required"
                    ? "bg-[#252560] text-white"
                    : "bg-[#e0e0f5] text-[#252560]"
                }`}
              >
                {s.name}
                <span className="opacity-70 ml-1">· {s.proficiency}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
