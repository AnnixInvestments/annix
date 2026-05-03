"use client";

import type { JobPosting, UpdateJobWizardPayload } from "@/app/lib/api/cvAssistantApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { EMPLOYMENT_TYPE_OPTIONS } from "../../constants/employment-types";
import { WORK_MODE_OPTIONS } from "../../constants/work-modes";
import { strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, selectClass } from "../StepShell";

export interface JobBasicsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

export function JobBasicsStep({ draft, onChange }: JobBasicsStepProps) {
  const titleDefault = draft.title === "Untitled draft" ? "" : strOr(draft.title);
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
          <input
            id="job-title"
            name="title"
            type="text"
            className={inputClass}
            placeholder="e.g. External Sales Representative"
            defaultValue={titleDefault}
            onBlur={(e) => onChange({ title: e.target.value.trim() })}
          />
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
