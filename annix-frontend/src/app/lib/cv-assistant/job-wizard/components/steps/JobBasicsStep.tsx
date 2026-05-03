"use client";

import { useEffect, useRef, useState } from "react";
import {
  cvAssistantApiClient,
  type JobPosting,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { EMPLOYMENT_TYPE_OPTIONS } from "../../constants/employment-types";
import { WORK_MODE_OPTIONS } from "../../constants/work-modes";
import { useNixCall } from "../../hooks/useNixCall";
import { strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, selectClass } from "../StepShell";

export interface TitlePreviewData {
  samplePreview: string;
  sampleResponsibilities: string[];
  normalizedTitle: string;
}

export interface JobBasicsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
  onTitlePreview?: (preview: TitlePreviewData | null) => void;
}

export function JobBasicsStep({ draft, onChange, onTitlePreview }: JobBasicsStepProps) {
  const titleDefault = draft.title === "Untitled draft" ? "" : strOr(draft.title);
  const titleSuggestions = useNixCall({
    operation: "title-suggestions",
    label: "Nix is normalising your title…",
    fn: ({ id, title }: { id: number; title?: string }) =>
      cvAssistantApiClient.nixTitleSuggestions(id, title),
    silent: true,
  });
  const suggestionsData = titleSuggestions.data;
  const isLoadingSuggestions = titleSuggestions.isPending;
  const [titleInput, setTitleInput] = useState(titleDefault);
  const titleSuggestionsMutate = titleSuggestions.mutate;
  const lastFetchedTitleRef = useRef<string>("");
  const draftId = draft.id;

  // Auto-fetch title preview from Nix as the title changes (debounced 800ms).
  // This populates the candidate-facing preview on the right so the company
  // user can see the difference between vague titles and sharp ones.
  useEffect(() => {
    const trimmed = titleInput.trim();
    if (trimmed.length < 3) return;
    if (trimmed === lastFetchedTitleRef.current) return;
    const timer = setTimeout(() => {
      lastFetchedTitleRef.current = trimmed;
      titleSuggestionsMutate({ id: draftId, title: trimmed });
    }, 800);
    return () => clearTimeout(timer);
  }, [titleInput, draftId, titleSuggestionsMutate]);

  // Propagate Nix's preview output upward so JobPreviewCard can render it.
  useEffect(() => {
    if (!onTitlePreview) return;
    if (suggestionsData?.samplePreview) {
      onTitlePreview({
        samplePreview: suggestionsData.samplePreview,
        sampleResponsibilities: suggestionsData.sampleResponsibilities,
        normalizedTitle: suggestionsData.normalizedTitle,
      });
    }
  }, [suggestionsData, onTitlePreview]);

  const industryDefault = strOr(draft.industry);
  const departmentDefault = strOr(draft.department);
  const seniorityDefault = strOr(draft.seniorityLevel);
  const employmentTypeDefault = strOr(draft.employmentType);
  const workModeDefault = strOr(draft.workMode);
  const locationDefault = strOr(draft.location);
  const provinceDefault = strOr(draft.province);

  return (
    <StepShell
      title="Job Basics"
      subtitle="Start with the role title and where it's based. Nix will normalise vague titles in Phase 2."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-2">
          <FieldLabel
            htmlFor="job-title"
            hint="Be specific. 'External Sales Representative' beats 'Sales'."
          >
            Job Title *
          </FieldLabel>
          <div className="flex gap-2">
            <input
              id="job-title"
              name="title"
              type="text"
              className={`${inputClass} flex-1`}
              placeholder="e.g. External Sales Representative"
              defaultValue={titleDefault}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={(e) => onChange({ title: e.target.value.trim() })}
            />
            <button
              type="button"
              disabled={isLoadingSuggestions || !titleInput.trim()}
              onClick={() => titleSuggestions.mutate({ id: draft.id, title: titleInput.trim() })}
              className="px-4 py-2 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
            >
              {isLoadingSuggestions ? "Asking Nix…" : "Ask Nix"}
            </button>
          </div>
          {suggestionsData ? (
            <NixTitleSuggestions
              suggestions={suggestionsData}
              onApply={(t) => {
                setTitleInput(t);
                onChange({ title: t, normalizedTitle: suggestionsData.normalizedTitle });
              }}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-industry">Industry</FieldLabel>
          <input
            id="job-industry"
            name="industry"
            type="text"
            className={inputClass}
            placeholder="e.g. Industrial supplies"
            defaultValue={industryDefault}
            onBlur={(e) => onChange({ industry: e.target.value.trim() })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-department">Department</FieldLabel>
          <input
            id="job-department"
            name="department"
            type="text"
            className={inputClass}
            placeholder="e.g. Sales / Operations"
            defaultValue={departmentDefault}
            onBlur={(e) => onChange({ department: e.target.value.trim() })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-seniority">Seniority</FieldLabel>
          <select
            id="job-seniority"
            name="seniorityLevel"
            className={selectClass}
            defaultValue={seniorityDefault}
            onChange={(e) => onChange({ seniorityLevel: e.target.value })}
          >
            <option value="">Choose seniority…</option>
            <option value="entry">Entry-level</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead / Principal</option>
            <option value="manager">Manager</option>
            <option value="executive">Executive</option>
          </select>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-employment-type">Employment Type *</FieldLabel>
          <select
            id="job-employment-type"
            name="employmentType"
            className={selectClass}
            defaultValue={employmentTypeDefault}
            onChange={(e) => {
              const raw = e.target.value;
              const next = raw ? (raw as UpdateJobWizardPayload["employmentType"]) : undefined;
              onChange({ employmentType: next });
            }}
          >
            <option value="">Choose type…</option>
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-work-mode">Work Mode</FieldLabel>
          <select
            id="job-work-mode"
            name="workMode"
            className={selectClass}
            defaultValue={workModeDefault}
            onChange={(e) => {
              const raw = e.target.value;
              const next = raw ? (raw as UpdateJobWizardPayload["workMode"]) : undefined;
              onChange({ workMode: next });
            }}
          >
            <option value="">Choose work mode…</option>
            {WORK_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-city">City / Town *</FieldLabel>
          <input
            id="job-city"
            name="location"
            type="text"
            autoComplete="address-level2"
            className={inputClass}
            placeholder="e.g. Johannesburg"
            defaultValue={locationDefault}
            onBlur={(e) => onChange({ location: e.target.value.trim() })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="job-province">Province *</FieldLabel>
          <select
            id="job-province"
            name="province"
            autoComplete="address-level1"
            className={selectClass}
            defaultValue={provinceDefault}
            onChange={(e) => {
              const raw = e.target.value;
              onChange({ province: raw ? raw : undefined });
            }}
          >
            <option value="">Choose province…</option>
            {SOUTH_AFRICAN_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
    </StepShell>
  );
}

interface NixTitleSuggestionsProps {
  suggestions: {
    normalizedTitle: string;
    suggestedTitles: string[];
    seniorityLevel: string | null;
    titleQualityScore: number;
    warning: string | null;
  };
  onApply: (title: string) => void;
}

function NixTitleSuggestions({ suggestions, onApply }: NixTitleSuggestionsProps) {
  const warning = suggestions.warning;
  const score = suggestions.titleQualityScore;
  const isStrong = score >= 70;
  const titles = suggestions.suggestedTitles;

  return (
    <div className="rounded-lg bg-[#f5f5fc] border border-[#e0e0f5] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Nix says</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isStrong ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          Title quality: {score}/100
        </span>
      </div>
      {warning ? <p className="text-sm text-amber-800">{warning}</p> : null}
      {titles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[#1a1a40] font-semibold">Pick a sharper title:</p>
          <div className="flex flex-wrap gap-2">
            {titles.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onApply(t)}
                className="text-sm px-3 py-1.5 bg-white border border-[#252560] text-[#252560] rounded-full hover:bg-[#252560] hover:text-white transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
