import { createHash } from "node:crypto";
import {
  type Assignment,
  type AssignmentInput,
  type AssignmentSection,
  buildRetryPrompt,
  buildSectionRegeneratePrompt,
  buildUserPrompt,
  isTooFluffy,
  SYSTEM_PROMPT,
  type ValidationFailure,
  validateAssignment,
} from "@annix/product-data/teacher-assistant";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

const METRIC_CATEGORY = "teacher-assistant-generate";
const MAX_RETRIES = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;
const RAW_AI_RESPONSE_LOG_CHARS = 600;

interface CacheEntry {
  assignment: Assignment;
  storedAt: number;
}

@Injectable()
export class AssignmentGeneratorService {
  private readonly logger = new Logger(AssignmentGeneratorService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly aiChat: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async generate(input: AssignmentInput): Promise<Assignment> {
    const cacheKey = this.cacheKeyFor(input);
    const cached = this.cachedAssignment(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${input.subject}/${input.topic}`);
      return cached;
    }

    const result = await this.metrics.time(METRIC_CATEGORY, input.subject, () =>
      this.generateWithRetries(input),
    );

    this.cache.set(cacheKey, { assignment: result, storedAt: Date.now() });
    return result;
  }

  async regenerateSection(
    input: AssignmentInput,
    section: AssignmentSection,
    existingAssignment: Assignment,
  ): Promise<Assignment> {
    const prompt = buildSectionRegeneratePrompt(input, section, JSON.stringify(existingAssignment));
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      SYSTEM_PROMPT,
      "gemini",
    );
    const partial = parseJsonFromAi<Partial<Assignment>>(response.content);
    const merged: Assignment = {
      ...existingAssignment,
      ...partial,
    };
    const validation = validateAssignment(merged);
    if (!validation.valid) {
      this.logger.warn(
        `Section regenerate produced invalid assignment: ${this.summariseFailures(validation.failures)}`,
      );
      throw new BadRequestException({
        message: "Section regeneration failed validation.",
        failures: validation.failures,
      });
    }
    return merged;
  }

  private async generateWithRetries(input: AssignmentInput): Promise<Assignment> {
    let attempt = 0;
    let lastFailures: ValidationFailure[] = [];
    let lastFluffyFailures: ValidationFailure[] = [];
    let lastRawResponse = "";
    let bestAssignment: Assignment | null = null;
    let bestFailureCount = Number.POSITIVE_INFINITY;
    let bestFailures: ValidationFailure[] = [];

    while (attempt <= MAX_RETRIES) {
      const prompt =
        attempt === 0
          ? buildUserPrompt(input)
          : buildRetryPrompt(input, [
              ...lastFailures.map((f) => f.message),
              ...lastFluffyFailures.map((f) => f.message),
            ]);

      const response = await this.aiChat.chat(
        [{ role: "user", content: prompt }],
        SYSTEM_PROMPT,
        "gemini",
      );
      lastRawResponse = response.content;

      let assignment: Assignment;
      try {
        assignment = parseJsonFromAi<Assignment>(response.content);
      } catch (error) {
        lastFailures = [
          {
            code: "invalid_json",
            message: error instanceof Error ? error.message : String(error),
          },
        ];
        this.logger.warn(`Attempt ${attempt + 1} JSON parse failed: ${lastFailures[0].message}`);
        attempt += 1;
        continue;
      }

      const validation = validateAssignment(assignment);
      const fluffy = isTooFluffy(assignment);

      if (validation.valid && fluffy.valid) {
        return assignment;
      }

      lastFailures = validation.failures;
      lastFluffyFailures = fluffy.failures;
      const combined = [...validation.failures, ...fluffy.failures];

      if (combined.length < bestFailureCount && hasMinimalStructure(assignment)) {
        bestAssignment = assignment;
        bestFailures = combined;
        bestFailureCount = combined.length;
      }

      this.logger.warn(`Attempt ${attempt + 1} failed: ${this.summariseFailures(combined)}`);
      attempt += 1;
    }

    if (bestAssignment) {
      this.logger.warn(
        `Soft-accepting best attempt for ${input.subject}/${input.topic} with ${bestFailureCount} warning(s): ${this.summariseFailures(bestFailures)}`,
      );
      return autoRepair(bestAssignment, bestFailures);
    }

    const allFailures = [...lastFailures, ...lastFluffyFailures];
    this.logger.error(
      `Generation exhausted ${MAX_RETRIES + 1} attempts for ${input.subject}/${input.topic} with no parseable structure. Returning fallback scaffold. Final failures: ${this.summariseFailures(allFailures)}`,
    );
    if (lastRawResponse) {
      this.logger.error(
        `Last raw AI response (truncated to ${RAW_AI_RESPONSE_LOG_CHARS} chars): ${lastRawResponse.slice(0, RAW_AI_RESPONSE_LOG_CHARS)}`,
      );
    }
    return buildFallbackStub(input, allFailures);
  }

  private summariseFailures(failures: ValidationFailure[]): string {
    return failures.map((f) => `[${f.code}] ${f.message}`).join("; ");
  }

  private cacheKeyFor(input: AssignmentInput): string {
    const canonical = JSON.stringify({
      subject: input.subject,
      topic: input.topic.toLowerCase().trim(),
      ageBucket: input.ageBucket,
      studentAge: input.studentAge,
      duration: input.duration,
      outputType: input.outputType,
      difficulty: input.difficulty,
      differentiation: [...input.differentiation].sort(),
      learningObjective: input.learningObjective?.trim() ?? null,
      allowAiUse: input.allowAiUse,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  private cachedAssignment(key: string): Assignment | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.assignment;
  }
}

function hasMinimalStructure(assignment: Assignment): boolean {
  return (
    typeof assignment.title === "string" &&
    assignment.title.trim().length > 0 &&
    Array.isArray(assignment.tasks) &&
    assignment.tasks.length >= 1 &&
    Array.isArray(assignment.rubric) &&
    assignment.rubric.length >= 1
  );
}

function autoRepair(assignment: Assignment, failures: ValidationFailure[]): Assignment {
  const repairedRubric = (assignment.rubric ?? []).map((row) => ({
    criterion: row.criterion ?? "Criterion",
    excellent: row.excellent?.trim() || "—",
    good: row.good?.trim() || "—",
    satisfactory: row.satisfactory?.trim() || "—",
    needsWork: row.needsWork?.trim() || "—",
  }));
  const repairedTasks = (assignment.tasks ?? []).map((task, i) => ({
    ...task,
    step: i + 1,
    requiredEvidence:
      task.requiredEvidence && task.requiredEvidence.length > 0
        ? task.requiredEvidence
        : ["evidence — review and refine"],
  }));
  return {
    ...assignment,
    title: assignment.title?.trim() || "Untitled assignment",
    studentBrief: assignment.studentBrief ?? "",
    successCriteria: assignment.successCriteria ?? [],
    aiUseRules: assignment.aiUseRules ?? [],
    evidenceChecklist: assignment.evidenceChecklist ?? [],
    finalSubmissionRequirements: assignment.finalSubmissionRequirements ?? [],
    studentAiPromptStarters: assignment.studentAiPromptStarters ?? [],
    partialExemplars: assignment.partialExemplars ?? [],
    optionalWorkbookPages: assignment.optionalWorkbookPages ?? [],
    teacherNotes: assignment.teacherNotes ?? {
      setup: "",
      setupTime: "",
      materialsNeeded: [],
      commonMisconceptions: [],
      markingGuidance: "",
      supportOption: "",
      extensionOption: "",
    },
    parentNote: assignment.parentNote ?? "",
    learningObjective: assignment.learningObjective ?? "",
    tasks: repairedTasks,
    rubric: repairedRubric,
    qualityWarnings: failures.map((f) => f.message),
  };
}

function buildFallbackStub(input: AssignmentInput, failures: ValidationFailure[]): Assignment {
  const niceTopic = input.topic.charAt(0).toUpperCase() + input.topic.slice(1);
  const placeholderRubric = ["Observation", "Reasoning", "AI critique", "Presentation"].map(
    (criterion) => ({
      criterion,
      excellent: "—",
      good: "—",
      satisfactory: "—",
      needsWork: "—",
    }),
  );
  const placeholderTasks = [
    {
      step: 1,
      title: "Observe",
      studentInstruction: `Gather first-hand evidence about ${input.topic} — photos, measurements, or local examples. Replace this instruction with the specific observations you want students to make.`,
      requiredEvidence: ["evidence — review and refine"],
      reasoningPrompt: "Why did you pick this evidence?",
      aiCritique: null,
      reflectionPrompt: "What surprised you?",
    },
    {
      step: 2,
      title: "Identify or measure",
      studentInstruction: `Apply key concepts about ${input.topic} to your own evidence. Replace this with the specific identifications or measurements you want students to make.`,
      requiredEvidence: ["evidence — review and refine"],
      reasoningPrompt: "How did you decide?",
      aiCritique: null,
      reflectionPrompt: "What was hardest to identify?",
    },
    {
      step: 3,
      title: "Critique an AI answer",
      studentInstruction: `Ask an AI tool about ${input.topic} and compare its answer to your own evidence. Note where AI was helpful and where it was wrong.`,
      requiredEvidence: ["AI prompt used", "AI output", "comparison notes"],
      reasoningPrompt: "Where did AI miss local context?",
      aiCritique: input.allowAiUse
        ? {
            promptToTry: `Explain ${input.topic} in 3 sentences for a ${input.ageBucket} learner.`,
            documentPromptAndOutput: true,
            compareToEvidence: "Compare AI's answer to your own evidence.",
            noteIssues: "Where did AI hallucinate, oversimplify, or generalise?",
            improveWithPersonalInput: "Rewrite AI's answer using your own evidence.",
          }
        : null,
      reflectionPrompt: "What did you change after seeing AI's answer?",
    },
  ];

  const stubFailures: ValidationFailure[] = [
    {
      code: "fallback_stub",
      message:
        "Nix could not generate a complete assignment. We have provided a starter scaffold — please replace each section with your own content before sharing with students.",
    },
    ...failures,
  ];

  return {
    title: `${niceTopic} — starter assignment (please review)`,
    subject: input.subject,
    topic: input.topic,
    ageBucket: input.ageBucket,
    duration: input.duration,
    outputType: input.outputType,
    difficulty: input.difficulty,
    studentBrief: `This is a starter scaffold for an assignment on ${input.topic}. Replace each section with your own content. Nix could not produce a full draft this time — try again in a few seconds, or use this as a starting point.`,
    learningObjective: input.learningObjective ?? "",
    successCriteria: ["Replace this with the success criteria you want students to meet."],
    tasks: placeholderTasks,
    aiUseRules: input.allowAiUse
      ? [
          "Document any AI prompts you use and the AI output.",
          "Compare AI's answer to your own evidence.",
          "Note where AI is wrong or too general for your local context.",
        ]
      : ["AI use is not permitted for this assignment."],
    evidenceChecklist: [
      "Replace with the evidence you want students to gather.",
      "Replace with secondary requirement.",
      "Replace with final submission requirement.",
    ],
    finalSubmissionRequirements: [
      "Final polished output",
      "Evidence appendix",
      "Reflection paragraph",
    ],
    rubric: placeholderRubric,
    teacherNotes: {
      setup: "Replace with your own setup notes.",
      setupTime: "—",
      materialsNeeded: [],
      commonMisconceptions: [],
      markingGuidance: "Replace with your own marking guidance.",
      supportOption: "Replace with a support option for struggling learners.",
      extensionOption: "Replace with an extension option for advanced learners.",
    },
    parentNote: "",
    studentAiPromptStarters: [],
    partialExemplars: [],
    optionalWorkbookPages: [],
    qualityWarnings: stubFailures.map((f) => f.message),
  };
}
