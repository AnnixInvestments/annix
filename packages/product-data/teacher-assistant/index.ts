export type {
  Assignment,
  AssignmentInput,
  AssignmentTask,
  AssignmentTaskAiCritique,
  PartialExemplar,
  RubricCriterion,
  TeacherNotes,
  WorkbookPage,
} from "./assignment";
export type { BannedPhrase } from "./bannedPhrases";
export { BANNED_PHRASES, containsBannedPhrase } from "./bannedPhrases";
export type {
  AgeBucket,
  AssignmentSection,
  DifferentiationOption,
  DifficultyLevel,
  Duration,
  OutputType,
  RubricLevel,
  Subject,
} from "./enums";
export {
  AGE_BUCKETS,
  ASSIGNMENT_SECTIONS,
  DIFFERENTIATION_OPTIONS,
  DIFFICULTY_LEVELS,
  DURATIONS,
  OUTPUT_TYPES,
  RUBRIC_LEVELS,
  SUBJECTS,
} from "./enums";
export {
  buildRetryPrompt,
  buildSectionRegeneratePrompt,
  buildUserPrompt,
  SYSTEM_PROMPT,
} from "./prompts";
export type { SubjectTemplate } from "./subjectTemplates";
export { subjectTemplates, templateForSubject } from "./subjectTemplates";
export type { ValidationFailure, ValidationResult } from "./validation";
export {
  AI_SAFE_SIGNAL_KEYWORDS,
  aiSafeSignalsHit,
  findNearDuplicateTaskPairs,
  isTooFluffy,
  MIN_EVIDENCE_CHECKLIST,
  MIN_RUBRIC_CRITERIA,
  MIN_TASK_INSTRUCTION_CHARS,
  MIN_TASKS,
  similarityRatio,
  TASK_SIMILARITY_THRESHOLD,
  validateAssignment,
} from "./validation";
