export type WizardStepId = "basics" | "outcomes" | "skills" | "salary" | "screening" | "review";

export interface WizardStepDefinition {
  id: WizardStepId;
  number: number;
  label: string;
  description: string;
}

export const WIZARD_STEPS: readonly WizardStepDefinition[] = [
  {
    id: "basics",
    number: 1,
    label: "Job Basics",
    description: "Title, location, employment type, work mode",
  },
  {
    id: "outcomes",
    number: 2,
    label: "Role Outcomes",
    description: "Purpose, responsibilities, what success looks like",
  },
  {
    id: "skills",
    number: 3,
    label: "Skills & Requirements",
    description: "Structured skills, certifications, experience",
  },
  {
    id: "salary",
    number: 4,
    label: "Salary & Benefits",
    description: "Range, commission, benefits",
  },
  {
    id: "screening",
    number: 5,
    label: "Screening Questions",
    description: "Filter questions for applicants",
  },
  {
    id: "review",
    number: 6,
    label: "Review & Publish",
    description: "Quality score, preview, go live",
  },
] as const;
