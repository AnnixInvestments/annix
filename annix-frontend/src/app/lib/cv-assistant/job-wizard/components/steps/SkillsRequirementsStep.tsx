"use client";

import { useToast } from "@/app/components/Toast";
import {
  cvAssistantApiClient,
  type JobPosting,
  type JobSkill,
  type SkillImportance,
  type SkillProficiency,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { SKILL_IMPORTANCE_OPTIONS, SKILL_PROFICIENCY_OPTIONS } from "../../constants/skill-options";
import { useNixCall } from "../../hooks/useNixCall";
import { arrOr, strOr } from "../../utils/value-helpers";
import { FieldLabel, inputClass, StepShell, selectClass, textareaClass } from "../StepShell";

export interface SkillsRequirementsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

const blankSkill = (): JobSkill => ({
  name: "",
  importance: "required",
  proficiency: "intermediate",
});

export function SkillsRequirementsStep({ draft, onChange }: SkillsRequirementsStepProps) {
  const skills = arrOr(draft.skills);
  const certsArray = arrOr(draft.requiredCertifications);
  const certs = certsArray.join(", ");
  const minExperienceDefault =
    draft.minExperienceYears === null || draft.minExperienceYears === undefined
      ? ""
      : String(draft.minExperienceYears);
  const requiredEducationDefault = strOr(draft.requiredEducation);

  const updateSkill = (index: number, patch: Partial<JobSkill>) => {
    const updated = skills.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ skills: updated });
  };

  const addSkill = () => onChange({ skills: [...skills, blankSkill()] });

  const removeSkill = (index: number) => onChange({ skills: skills.filter((_, i) => i !== index) });

  const { showToast } = useToast();
  const skillSuggestions = useNixCall({
    operation: "skill-suggestions",
    label: "Nix is suggesting skills for this role…",
    fn: (id: number) => cvAssistantApiClient.nixSkillSuggestions(id),
  });
  const isSuggesting = skillSuggestions.isPending;
  const handleSuggest = () => {
    skillSuggestions.mutate(draft.id, {
      onSuccess: (data) => {
        const suggested: JobSkill[] = data.skills.map((s) => ({
          name: s.name,
          importance: s.importance,
          proficiency: s.proficiency,
          yearsExperience: s.yearsExperience,
          evidenceRequired: s.evidenceRequired,
        }));
        const merged: JobSkill[] = [...skills];
        for (const s of suggested) {
          const lowerName = s.name.toLowerCase();
          const dupe = merged.some((existing) => existing.name.toLowerCase() === lowerName);
          if (!dupe) merged.push(s);
        }
        onChange({ skills: merged });
        showToast(`Nix added ${suggested.length} skill suggestions.`, "success");
      },
      onError: () => {
        showToast("Nix couldn't suggest skills right now. Try again.", "error");
      },
    });
  };

  return (
    <StepShell
      title="Skills & Requirements"
      subtitle="Structured skills make Nix's matching dramatically better. Phase 2 will suggest a starter set from your title and outcomes."
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1a1a40]">Required & Preferred Skills</h3>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="text-xs px-3 py-1.5 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
          >
            {isSuggesting ? "Nix thinking…" : "Suggest skills"}
          </button>
        </div>
        {skills.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No skills yet. Click <strong>Suggest skills</strong> to have Nix propose a starter set
            from your title and outcomes.
          </p>
        )}
        <ul className="space-y-3">
          {skills.map((skill, i) => (
            <li key={`${i}-${skill.name}`} className="bg-[#f5f5fc] p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <input
                  type="text"
                  placeholder="Skill name (e.g. B2B Sales)"
                  className={`${inputClass} md:col-span-6`}
                  defaultValue={skill.name}
                  onBlur={(e) => updateSkill(i, { name: e.target.value.trim() })}
                />
                <select
                  className={`${selectClass} md:col-span-3`}
                  defaultValue={skill.importance}
                  onChange={(e) =>
                    updateSkill(i, { importance: e.target.value as SkillImportance })
                  }
                >
                  {SKILL_IMPORTANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className={`${selectClass} md:col-span-3`}
                  defaultValue={skill.proficiency}
                  onChange={(e) =>
                    updateSkill(i, { proficiency: e.target.value as SkillProficiency })
                  }
                >
                  {SKILL_PROFICIENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <SkillEvidenceRow
                skill={skill}
                onYears={(value) => updateSkill(i, { yearsExperience: value })}
                onEvidence={(value) => updateSkill(i, { evidenceRequired: value })}
                onRemove={() => removeSkill(i)}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addSkill}
          className="text-sm font-semibold text-[#252560] hover:text-[#1a1a40]"
        >
          + Add skill
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel htmlFor="min-experience">Minimum years of experience</FieldLabel>
          <input
            id="min-experience"
            type="number"
            min={0}
            max={60}
            className={inputClass}
            defaultValue={minExperienceDefault}
            onBlur={(e) => {
              const raw = e.target.value;
              onChange({ minExperienceYears: raw ? Number(raw) : undefined });
            }}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="required-education">Required Education</FieldLabel>
          <input
            id="required-education"
            type="text"
            className={inputClass}
            placeholder="e.g. Matric, NQF6 in Engineering"
            defaultValue={requiredEducationDefault}
            onBlur={(e) => onChange({ requiredEducation: e.target.value.trim() })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel
          htmlFor="required-certifications"
          hint="Comma-separated for now. A structured form arrives in a later phase."
        >
          Required Certifications
        </FieldLabel>
        <input
          id="required-certifications"
          type="text"
          className={inputClass}
          placeholder="e.g. ECSA Pr Eng, CompTIA Security+"
          defaultValue={certs}
          onBlur={(e) =>
            onChange({
              requiredCertifications: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </StepShell>
  );
}

interface SkillEvidenceRowProps {
  skill: JobSkill;
  onYears: (value: number | null) => void;
  onEvidence: (value: string | null) => void;
  onRemove: () => void;
}

function SkillEvidenceRow({ skill, onYears, onEvidence, onRemove }: SkillEvidenceRowProps) {
  const yearsValue = skill.yearsExperience;
  const yearsDefault = yearsValue === null || yearsValue === undefined ? "" : String(yearsValue);
  const evidenceValue = skill.evidenceRequired;
  const evidenceDefault = evidenceValue ? evidenceValue : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
      <div className="md:col-span-2">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          Years
        </label>
        <input
          type="number"
          min={0}
          max={60}
          placeholder="0"
          className={inputClass}
          defaultValue={yearsDefault}
          onBlur={(e) => {
            const raw = e.target.value;
            onYears(raw ? Number(raw) : null);
          }}
        />
      </div>
      <div className="md:col-span-9">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">
          Evidence required (optional)
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Demonstrate a closed deal worth R250k+ in industrial sales"
          className={`${textareaClass} min-h-[56px] resize-y whitespace-pre-wrap`}
          defaultValue={evidenceDefault}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            onEvidence(trimmed ? trimmed : null);
          }}
        />
      </div>
      <div className="md:col-span-1 flex md:items-end md:h-full md:pb-1">
        <button
          type="button"
          onClick={onRemove}
          className="w-full md:w-auto px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg shrink-0"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
