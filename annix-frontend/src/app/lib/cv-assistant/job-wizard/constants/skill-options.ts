import type { SkillImportance, SkillProficiency } from "@/app/lib/api/cvAssistantApi";

export const SKILL_IMPORTANCE_OPTIONS: ReadonlyArray<{ value: SkillImportance; label: string }> = [
  { value: "required", label: "Required" },
  { value: "preferred", label: "Preferred" },
] as const;

export const SKILL_PROFICIENCY_OPTIONS: ReadonlyArray<{
  value: SkillProficiency;
  label: string;
  description: string;
}> = [
  { value: "basic", label: "Basic", description: "Aware, learning, uses with guidance" },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Works independently in known cases",
  },
  { value: "advanced", label: "Advanced", description: "Solves complex problems, mentors others" },
  { value: "expert", label: "Expert", description: "Sets direction, recognised authority" },
] as const;

export const SCREENING_QUESTION_TYPE_OPTIONS = [
  { value: "yes_no", label: "Yes / No" },
  { value: "short_text", label: "Short text" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "numeric", label: "Numeric" },
] as const;
