export const SUBJECTS = ["geography", "science"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const AGE_BUCKETS = ["12-14", "14-16", "16-18"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

export const DURATIONS = ["1 day", "3 days", "1 week", "2 weeks"] as const;
export type Duration = (typeof DURATIONS)[number];

export const OUTPUT_TYPES = [
  "Poster",
  "Workbook page",
  "Report",
  "Lab worksheet",
  "Presentation",
] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];

export const DIFFICULTY_LEVELS = ["support", "standard", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFERENTIATION_OPTIONS = ["ESL", "Advanced", "IEP"] as const;
export type DifferentiationOption = (typeof DIFFERENTIATION_OPTIONS)[number];

export const RUBRIC_LEVELS = ["excellent", "good", "satisfactory", "needsWork"] as const;
export type RubricLevel = (typeof RUBRIC_LEVELS)[number];

export const ASSIGNMENT_SECTIONS = [
  "title",
  "studentBrief",
  "successCriteria",
  "tasks",
  "aiUseRules",
  "evidenceChecklist",
  "finalSubmissionRequirements",
  "rubric",
  "teacherNotes",
  "parentNote",
  "studentAiPromptStarters",
  "partialExemplars",
  "optionalWorkbookPages",
] as const;
export type AssignmentSection = (typeof ASSIGNMENT_SECTIONS)[number];
