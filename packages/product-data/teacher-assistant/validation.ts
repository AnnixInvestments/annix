import type { Assignment, AssignmentTask } from "./assignment";
import { containsBannedPhrase } from "./bannedPhrases";

export const MIN_TASKS = 4;
export const MIN_RUBRIC_CRITERIA = 4;
export const MIN_EVIDENCE_CHECKLIST = 3;
export const MIN_TASK_INSTRUCTION_CHARS = 80;
export const TASK_SIMILARITY_THRESHOLD = 0.8;

export interface ValidationFailure {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  failures: ValidationFailure[];
}

export function validateAssignment(assignment: Assignment): ValidationResult {
  const failures: ValidationFailure[] = [];

  if (!assignment.title?.trim()) {
    failures.push({ code: "missing_title", message: "Title is missing or empty.", field: "title" });
  }
  if (!assignment.studentBrief?.trim()) {
    failures.push({
      code: "missing_brief",
      message: "Student brief is missing or empty.",
      field: "studentBrief",
    });
  }
  if (!assignment.tasks || assignment.tasks.length < MIN_TASKS) {
    failures.push({
      code: "too_few_tasks",
      message: `Need at least ${MIN_TASKS} tasks; got ${assignment.tasks?.length ?? 0}.`,
      field: "tasks",
    });
  }
  if (!assignment.rubric || assignment.rubric.length < MIN_RUBRIC_CRITERIA) {
    failures.push({
      code: "too_few_rubric_criteria",
      message: `Need at least ${MIN_RUBRIC_CRITERIA} rubric criteria; got ${assignment.rubric?.length ?? 0}.`,
      field: "rubric",
    });
  }
  if (assignment.rubric) {
    assignment.rubric.forEach((criterion, index) => {
      const allLevelsFilled =
        Boolean(criterion.excellent?.trim()) &&
        Boolean(criterion.good?.trim()) &&
        Boolean(criterion.satisfactory?.trim()) &&
        Boolean(criterion.needsWork?.trim());
      if (!allLevelsFilled) {
        failures.push({
          code: "rubric_levels_incomplete",
          message: `Rubric criterion #${index + 1} ("${criterion.criterion}") is missing one or more levels.`,
          field: `rubric[${index}]`,
        });
      }
    });
  }
  if (
    !assignment.evidenceChecklist ||
    assignment.evidenceChecklist.length < MIN_EVIDENCE_CHECKLIST
  ) {
    failures.push({
      code: "too_few_evidence_items",
      message: `Need at least ${MIN_EVIDENCE_CHECKLIST} evidence-checklist items; got ${assignment.evidenceChecklist?.length ?? 0}.`,
      field: "evidenceChecklist",
    });
  }
  if (!assignment.teacherNotes) {
    failures.push({
      code: "missing_teacher_notes",
      message: "Teacher notes block is missing.",
      field: "teacherNotes",
    });
  }

  const banned = scanForBannedPhrases(assignment);
  failures.push(...banned);

  return { valid: failures.length === 0, failures };
}

function scanForBannedPhrases(assignment: Assignment): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const targets: { field: string; text: string }[] = [
    { field: "studentBrief", text: assignment.studentBrief ?? "" },
    ...assignment.tasks.flatMap((task, i) => [
      { field: `tasks[${i}].studentInstruction`, text: task.studentInstruction ?? "" },
      { field: `tasks[${i}].reasoningPrompt`, text: task.reasoningPrompt ?? "" },
      { field: `tasks[${i}].reflectionPrompt`, text: task.reflectionPrompt ?? "" },
    ]),
  ];
  targets.forEach(({ field, text }) => {
    const hit = containsBannedPhrase(text);
    if (hit) {
      failures.push({
        code: "banned_phrase",
        message: `Field ${field} contains banned lazy phrase: "${hit}".`,
        field,
      });
    }
  });
  return failures;
}

export function isTooFluffy(assignment: Assignment): ValidationResult {
  const failures: ValidationFailure[] = [];

  const tasks = assignment.tasks ?? [];
  if (tasks.length > 0) {
    const totalChars = tasks.reduce((sum, task) => sum + (task.studentInstruction?.length ?? 0), 0);
    const avgChars = totalChars / tasks.length;
    if (avgChars < MIN_TASK_INSTRUCTION_CHARS) {
      failures.push({
        code: "tasks_too_short",
        message: `Average task instruction length ${avgChars.toFixed(0)} chars; need ${MIN_TASK_INSTRUCTION_CHARS}+.`,
        field: "tasks",
      });
    }
    tasks.forEach((task, i) => {
      if (!task.requiredEvidence || task.requiredEvidence.length === 0) {
        failures.push({
          code: "task_evidence_empty",
          message: `Task #${i + 1} has empty requiredEvidence.`,
          field: `tasks[${i}].requiredEvidence`,
        });
      }
    });
    const duplicateIndexes = findNearDuplicateTaskPairs(tasks);
    duplicateIndexes.forEach(([a, b, ratio]) => {
      failures.push({
        code: "tasks_too_similar",
        message: `Tasks #${a + 1} and #${b + 1} are ${(ratio * 100).toFixed(0)}% similar — likely padding.`,
        field: `tasks[${a}]`,
      });
    });
  }

  return { valid: failures.length === 0, failures };
}

export function findNearDuplicateTaskPairs(tasks: AssignmentTask[]): [number, number, number][] {
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const ratio = similarityRatio(
        tasks[i].studentInstruction ?? "",
        tasks[j].studentInstruction ?? "",
      );
      if (ratio > TASK_SIMILARITY_THRESHOLD) {
        pairs.push([i, j, ratio]);
      }
    }
  }
  return pairs;
}

export function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

export const AI_SAFE_SIGNAL_KEYWORDS: Record<string, string[]> = {
  requiresPhotosOrMeasurements: ["photo", "measure", "measurement", "data point", "sketch"],
  requiresInterviewOrObservation: ["interview", "ask someone", "observe", "watch", "record"],
  requiresDraftsOrProcessEvidence: ["draft", "first attempt", "revision", "notes", "step by step"],
  requiresAiCritique: ["compare with ai", "ai output", "critique ai", "ai's answer", "ai response"],
  requiresReflection: ["reflect", "what changed", "what surprised", "i learned", "i was unsure"],
};

export function aiSafeSignalsHit(assignment: Assignment): string[] {
  const haystack = assignmentText(assignment).toLowerCase();
  return Object.entries(AI_SAFE_SIGNAL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => haystack.includes(k)))
    .map(([signal]) => signal);
}

function assignmentText(assignment: Assignment): string {
  const taskBlobs = (assignment.tasks ?? []).map((t) =>
    [
      t.title,
      t.studentInstruction,
      t.reasoningPrompt,
      t.aiCritique?.promptToTry ?? "",
      t.aiCritique?.compareToEvidence ?? "",
      t.aiCritique?.noteIssues ?? "",
      t.aiCritique?.improveWithPersonalInput ?? "",
      t.reflectionPrompt,
      ...(t.requiredEvidence ?? []),
    ].join(" "),
  );
  return [
    assignment.title,
    assignment.studentBrief,
    ...(assignment.successCriteria ?? []),
    ...taskBlobs,
    ...(assignment.aiUseRules ?? []),
    ...(assignment.evidenceChecklist ?? []),
    ...(assignment.finalSubmissionRequirements ?? []),
  ].join(" ");
}
