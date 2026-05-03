import type {
  AgeBucket,
  DifferentiationOption,
  DifficultyLevel,
  Duration,
  OutputType,
  Subject,
} from "./enums";

export interface AssignmentTaskAiCritique {
  promptToTry: string;
  documentPromptAndOutput: boolean;
  compareToEvidence: string;
  noteIssues: string;
  improveWithPersonalInput: string;
}

export interface AssignmentTask {
  step: number;
  title: string;
  studentInstruction: string;
  requiredEvidence: string[];
  reasoningPrompt: string;
  aiCritique: AssignmentTaskAiCritique | null;
  reflectionPrompt: string;
}

export interface RubricCriterion {
  criterion: string;
  excellent: string;
  good: string;
  satisfactory: string;
  needsWork: string;
}

export interface TeacherNotes {
  setup: string;
  setupTime: string;
  materialsNeeded: string[];
  commonMisconceptions: string[];
  markingGuidance: string;
  supportOption: string;
  extensionOption: string;
}

export interface PartialExemplar {
  forCriterion: string;
  strongElement: string;
  weakElement: string;
}

export interface WorkbookPage {
  pageTitle: string;
  content: string;
  imagePromptHint: string;
}

export interface AssignmentInput {
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  studentAge: number;
  duration: Duration;
  outputType: OutputType;
  difficulty: DifficultyLevel;
  differentiation: DifferentiationOption[];
  learningObjective: string | null;
  allowAiUse: boolean;
}

export interface Assignment {
  title: string;
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  duration: Duration;
  outputType: OutputType;
  difficulty: DifficultyLevel;
  studentBrief: string;
  learningObjective: string;
  successCriteria: string[];
  tasks: AssignmentTask[];
  aiUseRules: string[];
  evidenceChecklist: string[];
  finalSubmissionRequirements: string[];
  rubric: RubricCriterion[];
  teacherNotes: TeacherNotes;
  parentNote: string;
  studentAiPromptStarters: string[];
  partialExemplars: PartialExemplar[];
  optionalWorkbookPages: WorkbookPage[];
}
