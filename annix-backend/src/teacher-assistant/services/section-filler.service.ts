import type {
  Assignment,
  AssignmentInput,
  AssignmentTask,
  PartialExemplar,
  RubricCriterion,
  TeacherNotes,
} from "@annix/product-data/teacher-assistant";
import { templateForSubject } from "@annix/product-data/teacher-assistant";
import { Injectable, Logger } from "@nestjs/common";
import { AiApp } from "../../ai-usage/entities/ai-usage-log.entity";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

const FILLER_SYSTEM_PROMPT = `You are an expert education designer filling in a missing section of an assignment.
Return STRICT JSON only — no prose, no markdown fences, no commentary.
Every string value must use straight double quotes, escape internal quotes as \\".
Match the requested shape EXACTLY. Do not add extra fields.`;

const SECTION_FILL_TIMEOUT_MS = 30_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface RubricResponse {
  rubric: RubricCriterion[];
}

interface TeacherNotesResponse {
  teacherNotes: TeacherNotes;
}

interface StringListResponse {
  items: string[];
}

interface ShellResponse {
  title: string;
  studentBrief: string;
  learningObjective: string;
  successCriteria: string[];
}

interface TasksResponse {
  tasks: AssignmentTask[];
}

interface ExtrasResponse {
  parentNote: string;
  studentAiPromptStarters: string[];
  partialExemplars: PartialExemplar[];
}

@Injectable()
export class SectionFillerService {
  private readonly logger = new Logger(SectionFillerService.name);

  constructor(private readonly aiChat: AiChatService) {}

  async fillMissingSections(
    assignment: Assignment,
    input: AssignmentInput,
  ): Promise<{ assignment: Assignment; filled: string[] }> {
    const wantsRubric = this.needsRubric(assignment);
    const wantsTeacherNotes = this.needsTeacherNotes(assignment);
    const wantsSuccessCriteria = this.needsSuccessCriteria(assignment);
    const wantsEvidenceChecklist = this.needsEvidenceChecklist(assignment);
    const wantsParentNote = this.needsParentNote(assignment);
    const wantsStudentAiPrompts = this.needsStudentAiPrompts(assignment) && input.allowAiUse;

    const [rubric, notes, criteria, evidence, parent, prompts] = await Promise.all([
      wantsRubric ? this.guarded("rubric", this.tryFillRubric(input)) : Promise.resolve(null),
      wantsTeacherNotes
        ? this.guarded("teacherNotes", this.tryFillTeacherNotes(input))
        : Promise.resolve(null),
      wantsSuccessCriteria
        ? this.guarded("successCriteria", this.tryFillStringList("successCriteria", input))
        : Promise.resolve(null),
      wantsEvidenceChecklist
        ? this.guarded("evidenceChecklist", this.tryFillStringList("evidenceChecklist", input))
        : Promise.resolve(null),
      wantsParentNote
        ? this.guarded("parentNote", this.tryFillParentNote(input))
        : Promise.resolve(null),
      wantsStudentAiPrompts
        ? this.guarded(
            "studentAiPromptStarters",
            this.tryFillStringList("studentAiPromptStarters", input),
          )
        : Promise.resolve(null),
    ]);

    const filled: string[] = [];
    let next = assignment;

    if (rubric && Array.isArray(rubric) && rubric.length >= 4) {
      next = { ...next, rubric };
      filled.push("rubric");
    }
    if (notes && typeof notes === "object" && !Array.isArray(notes)) {
      next = { ...next, teacherNotes: notes };
      filled.push("teacherNotes");
    }
    if (Array.isArray(criteria) && criteria.length > 0) {
      next = { ...next, successCriteria: criteria };
      filled.push("successCriteria");
    }
    if (Array.isArray(evidence) && evidence.length >= 3) {
      next = { ...next, evidenceChecklist: evidence };
      filled.push("evidenceChecklist");
    }
    if (typeof parent === "string" && parent.length > 0) {
      next = { ...next, parentNote: parent };
      filled.push("parentNote");
    }
    if (Array.isArray(prompts) && prompts.length > 0) {
      next = { ...next, studentAiPromptStarters: prompts };
      filled.push("studentAiPromptStarters");
    }

    if (filled.length > 0) {
      this.logger.log(
        `Filled missing sections for ${input.subject}/${input.topic}: ${filled.join(", ")}`,
      );
    }
    return { assignment: next, filled };
  }

  private async guarded<T>(label: string, work: Promise<T>): Promise<T | null> {
    try {
      return await withTimeout(work, SECTION_FILL_TIMEOUT_MS, `${label} fill`);
    } catch (error) {
      this.logger.warn(`${label} refill failed: ${this.errMsg(error)}`);
      return null;
    }
  }

  private needsRubric(a: Assignment): boolean {
    if (!Array.isArray(a.rubric) || a.rubric.length < 4) return true;
    return a.rubric.some(
      (r) =>
        !r?.excellent?.trim() ||
        !r?.good?.trim() ||
        !r?.satisfactory?.trim() ||
        !r?.needsWork?.trim() ||
        r.excellent.trim() === "—" ||
        r.good.trim() === "—" ||
        r.satisfactory.trim() === "—" ||
        r.needsWork.trim() === "—",
    );
  }

  private needsTeacherNotes(a: Assignment): boolean {
    const tn = a.teacherNotes;
    if (!tn) return true;
    const fillable =
      (tn.setup?.trim().length ?? 0) > 10 ||
      (tn.markingGuidance?.trim().length ?? 0) > 10 ||
      (tn.supportOption?.trim().length ?? 0) > 10;
    return !fillable;
  }

  private needsSuccessCriteria(a: Assignment): boolean {
    if (!Array.isArray(a.successCriteria) || a.successCriteria.length === 0) return true;
    return a.successCriteria.every((s) => /replace this/i.test(s));
  }

  private needsEvidenceChecklist(a: Assignment): boolean {
    if (!Array.isArray(a.evidenceChecklist) || a.evidenceChecklist.length < 3) return true;
    return a.evidenceChecklist.every((s) => /replace with/i.test(s));
  }

  private needsParentNote(a: Assignment): boolean {
    return !a.parentNote || a.parentNote.trim().length < 20;
  }

  private needsStudentAiPrompts(a: Assignment): boolean {
    return !Array.isArray(a.studentAiPromptStarters) || a.studentAiPromptStarters.length === 0;
  }

  private async tryFillRubric(input: AssignmentInput): Promise<RubricCriterion[] | null> {
    const prompt = [
      `Write a 4-criterion rubric for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty} difficulty).`,
      "Criteria suggestions: Observation, Reasoning, AI critique, Presentation (you can adjust).",
      "Each criterion needs all four levels: excellent, good, satisfactory, needsWork — each level must be ONE complete sentence describing what work at that level looks like.",
      "",
      `Return JSON: { "rubric": [{ "criterion": "...", "excellent": "...", "good": "...", "satisfactory": "...", "needsWork": "..." }, ...4 entries] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-rubric" },
    );
    const parsed = parseJsonFromAi<RubricResponse>(response.content);
    return Array.isArray(parsed.rubric) ? parsed.rubric : null;
  }

  private async tryFillTeacherNotes(input: AssignmentInput): Promise<TeacherNotes | null> {
    const prompt = [
      `Write the teacher notes for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty} difficulty, ${input.duration}, output: ${input.outputType}).`,
      "",
      `Return JSON: { "teacherNotes": { "setup": "1-2 sentences on how to introduce", "setupTime": "e.g. 15 minutes prep + materials gathered overnight", "materialsNeeded": ["3+ specific items"], "commonMisconceptions": ["2+ specific misconceptions students typically have on this topic"], "markingGuidance": "1-2 sentences on what to weight most heavily", "supportOption": "1 sentence on a scaffold for struggling learners", "extensionOption": "1 sentence on a stretch task for advanced learners" } }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-teacher-notes" },
    );
    const parsed = parseJsonFromAi<TeacherNotesResponse>(response.content);
    return parsed.teacherNotes ?? null;
  }

  private async tryFillStringList(
    field:
      | "successCriteria"
      | "evidenceChecklist"
      | "studentAiPromptStarters"
      | "aiUseRules"
      | "finalSubmissionRequirements",
    input: AssignmentInput,
  ): Promise<string[] | null> {
    const ask: Record<typeof field, string> = {
      successCriteria: `Write 4 success criteria — short statements describing what a student must show to succeed on a ${input.subject} assignment about "${input.topic}".`,
      evidenceChecklist: `Write 4 concrete evidence items the student must produce — specific artefacts (e.g. photos with metadata, comparison table, sketch) for a ${input.subject} assignment on "${input.topic}".`,
      studentAiPromptStarters: `Write 4 starter AI prompts a student could try when working on a ${input.subject} assignment about "${input.topic}". Each is one sentence the student would type into an AI tool.`,
      aiUseRules: `Write 4 AI-use rules for students on a ${input.subject} assignment about "${input.topic}". Each rule is one short sentence about how AI may be used and the evidence required (compare AI to own evidence, document the prompt, etc.).`,
      finalSubmissionRequirements: `Write 4 final submission requirements for a ${input.subject} assignment on "${input.topic}" with output type ${input.outputType}. Each is one short phrase describing a deliverable (e.g. final poster, evidence appendix, reflection paragraph).`,
    };
    const prompt = [
      ask[field],
      `Match the age (${input.ageBucket}) and difficulty (${input.difficulty}).`,
      "",
      `Return JSON: { "items": ["...", "...", "...", "..."] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-string-list" },
    );
    const parsed = parseJsonFromAi<StringListResponse>(response.content);
    return Array.isArray(parsed.items) ? parsed.items.filter((s) => s.trim().length > 0) : null;
  }

  private async tryFillParentNote(input: AssignmentInput): Promise<string | null> {
    const prompt = [
      `Write a 2-sentence parent note for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.duration}).`,
      `Plain language. Tell the parent what their child will be doing and what evidence they'll gather at home.`,
      "",
      `Return JSON: { "items": ["the two-sentence parent note as a single string"] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-parent-note" },
    );
    const parsed = parseJsonFromAi<StringListResponse>(response.content);
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items[0]?.trim() || null;
    }
    return null;
  }

  async buildBySection(input: AssignmentInput): Promise<Assignment> {
    this.logger.log(
      `buildBySection start: ${input.subject}/${input.topic} ages=${input.ageBucket} difficulty=${input.difficulty}`,
    );
    const [shell, tasks] = await Promise.all([
      this.guarded("shell", this.tryFillShell(input)),
      this.guarded("tasks", this.tryFillTasks(input)),
    ]);

    const [rubric, teacherNotes, aiUseRules, evidenceChecklist, finalSubmission, extras] =
      await Promise.all([
        this.guarded("rubric", this.tryFillRubric(input)),
        this.guarded("teacherNotes", this.tryFillTeacherNotes(input)),
        input.allowAiUse
          ? this.guarded("aiUseRules", this.tryFillStringList("aiUseRules", input))
          : Promise.resolve<string[]>(["AI use is not permitted for this assignment."]),
        this.guarded("evidenceChecklist", this.tryFillStringList("evidenceChecklist", input)),
        this.guarded(
          "finalSubmissionRequirements",
          this.tryFillStringList("finalSubmissionRequirements", input),
        ),
        this.guarded("extras", this.tryFillExtras(input)),
      ]);

    const warnings: string[] = [];
    const requireField = (label: string, value: unknown): void => {
      if (value === null || value === undefined) {
        warnings.push(`Nix could not produce ${label}; placeholder used — please review.`);
      }
    };

    requireField("a title", shell?.title);
    requireField("the student brief", shell?.studentBrief);
    requireField("tasks", tasks);
    requireField("a rubric", rubric);
    requireField("the teacher notes", teacherNotes);

    const safeShellTitle = shell?.title?.trim() || `${cap(input.topic)} — please review`;
    const safeBrief =
      shell?.studentBrief?.trim() ||
      `Investigate ${input.topic} using your own observations and evidence. Replace this brief with your own framing.`;
    const safeObjective = shell?.learningObjective?.trim() || input.learningObjective || "";
    const safeSuccessCriteria =
      Array.isArray(shell?.successCriteria) && shell.successCriteria.length > 0
        ? shell.successCriteria
        : ["Replace with the success criteria you want students to meet."];

    const safeTasks =
      Array.isArray(tasks) && tasks.length > 0
        ? tasks.map((task, i) => ({
            step: i + 1,
            title: task?.title?.trim() || `Step ${i + 1}`,
            studentInstruction:
              task?.studentInstruction?.trim() ||
              "Replace with the specific instruction you want students to follow.",
            requiredEvidence:
              Array.isArray(task?.requiredEvidence) && task.requiredEvidence.length > 0
                ? task.requiredEvidence
                : ["evidence — review and refine"],
            reasoningPrompt: task?.reasoningPrompt ?? "",
            aiCritique: task?.aiCritique ?? null,
            reflectionPrompt: task?.reflectionPrompt ?? "",
          }))
        : placeholderTasks(input);

    const safeRubric =
      Array.isArray(rubric) && rubric.length >= 4
        ? rubric.map((row) => ({
            criterion: row?.criterion?.trim() || "Criterion",
            excellent: row?.excellent?.trim() || "—",
            good: row?.good?.trim() || "—",
            satisfactory: row?.satisfactory?.trim() || "—",
            needsWork: row?.needsWork?.trim() || "—",
          }))
        : placeholderRubric();

    const safeTeacherNotes: TeacherNotes = teacherNotes ?? {
      setup: "Replace with your own setup notes.",
      setupTime: "—",
      materialsNeeded: [],
      commonMisconceptions: [],
      markingGuidance: "Replace with your own marking guidance.",
      supportOption: "Replace with a support option for struggling learners.",
      extensionOption: "Replace with an extension option for advanced learners.",
    };

    const safeAiUseRules =
      Array.isArray(aiUseRules) && aiUseRules.length > 0
        ? aiUseRules
        : input.allowAiUse
          ? [
              "Document any AI prompts you use and the AI output.",
              "Compare AI's answer to your own evidence.",
              "Note where AI is wrong or too general for your local context.",
            ]
          : ["AI use is not permitted for this assignment."];

    const safeEvidence =
      Array.isArray(evidenceChecklist) && evidenceChecklist.length >= 3
        ? evidenceChecklist
        : [
            "Replace with the evidence you want students to gather.",
            "Replace with secondary requirement.",
            "Replace with final submission requirement.",
          ];

    const safeFinalSubmission =
      Array.isArray(finalSubmission) && finalSubmission.length > 0
        ? finalSubmission
        : ["Final polished output", "Evidence appendix", "Reflection paragraph"];

    this.logger.log(
      `buildBySection done: shell=${shell ? "ok" : "stub"} tasks=${Array.isArray(tasks) ? tasks.length : 0} rubric=${Array.isArray(rubric) ? rubric.length : 0} teacherNotes=${teacherNotes ? "ok" : "stub"} extras=${extras ? "ok" : "stub"}; warnings=${warnings.length}`,
    );

    return {
      title: safeShellTitle,
      subject: input.subject,
      topic: input.topic,
      ageBucket: input.ageBucket,
      duration: input.duration,
      outputType: input.outputType,
      difficulty: input.difficulty,
      studentBrief: safeBrief,
      learningObjective: safeObjective,
      successCriteria: safeSuccessCriteria,
      tasks: safeTasks,
      aiUseRules: safeAiUseRules,
      evidenceChecklist: safeEvidence,
      finalSubmissionRequirements: safeFinalSubmission,
      rubric: safeRubric,
      teacherNotes: safeTeacherNotes,
      parentNote: extras?.parentNote?.trim() || "",
      studentAiPromptStarters:
        Array.isArray(extras?.studentAiPromptStarters) && extras.studentAiPromptStarters.length > 0
          ? extras.studentAiPromptStarters
          : [],
      partialExemplars: Array.isArray(extras?.partialExemplars) ? extras.partialExemplars : [],
      optionalWorkbookPages: [],
      qualityWarnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async tryFillShell(input: AssignmentInput): Promise<ShellResponse | null> {
    const template = templateForSubject(input.subject);
    const prompt = [
      `Write the OPENING of a process-based ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty}, ${input.duration}, output: ${input.outputType}).`,
      `Reasoning style for this subject: ${template.reasoningStyle}.`,
      input.learningObjective
        ? `Anchor on this learning objective: ${input.learningObjective}`
        : "",
      "",
      "Required:",
      "- title: catchy, age-appropriate, 4-10 words, often phrased as a question or detective challenge",
      "- studentBrief: 2-3 sentence engaging hook addressed to the student in active voice",
      "- learningObjective: one sentence starting with a measurable verb (Identify/Compare/Explain/Predict/Investigate/Design/Evaluate)",
      "- successCriteria: 4 short statements describing what the student must show",
      "",
      `Return JSON: { "title": "...", "studentBrief": "...", "learningObjective": "...", "successCriteria": ["...", "...", "...", "..."] }`,
    ]
      .filter(Boolean)
      .join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-shell" },
    );
    const parsed = parseJsonFromAi<ShellResponse>(response.content);
    if (!parsed.title || !parsed.studentBrief) return null;
    return parsed;
  }

  private async tryFillTasks(input: AssignmentInput): Promise<AssignmentTask[] | null> {
    const template = templateForSubject(input.subject);
    const aiCritiqueShape = input.allowAiUse
      ? `, "aiCritique": { "promptToTry": "...", "documentPromptAndOutput": true, "compareToEvidence": "...", "noteIssues": "...", "improveWithPersonalInput": "..." }`
      : `, "aiCritique": null`;
    const prompt = [
      `Write 4-5 tasks for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty}, ${input.duration}, output: ${input.outputType}).`,
      `Subject evidence types: ${template.evidenceTypes.join(", ")}.`,
      `Subject AI challenge: ${template.aiChallenge}.`,
      "",
      "Each task must:",
      "- Have a 1-3 word title (e.g. Observe, Identify, Critique AI, Build poster)",
      "- Have a studentInstruction of 2 full sentences (60+ chars) describing exactly what the student does",
      "- Have 2-5 specific concrete evidence items in requiredEvidence",
      "- Have a one-sentence reasoningPrompt asking why",
      "- Have a one-sentence reflectionPrompt asking what changed",
      input.allowAiUse
        ? "- Include the structured aiCritique sub-object on AT LEAST ONE task — the task that asks students to compare AI's answer to their evidence"
        : "- Set aiCritique: null on every task",
      "",
      "Tasks must be DISTINCT — no two tasks with similar instructions.",
      "",
      `Return JSON: { "tasks": [{ "step": 1, "title": "...", "studentInstruction": "...", "requiredEvidence": ["...", "..."], "reasoningPrompt": "...", "reflectionPrompt": "..."${aiCritiqueShape} }, ...] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-tasks" },
    );
    const parsed = parseJsonFromAi<TasksResponse>(response.content);
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length < 3) return null;
    return parsed.tasks;
  }

  private async tryFillExtras(input: AssignmentInput): Promise<ExtrasResponse | null> {
    const prompt = [
      `For a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty}):`,
      "",
      "1. parentNote: 2 sentences in plain language for parents — what their child will do and what evidence they'll gather at home",
      input.allowAiUse
        ? "2. studentAiPromptStarters: 4 starter AI prompts the student could try (one sentence each)"
        : "2. studentAiPromptStarters: empty array (AI use not permitted)",
      "3. partialExemplars: 2 exemplars showing strong vs weak student work for specific rubric criteria. Each is a partial example (one sentence each), not a full sample answer",
      "",
      `Return JSON: { "parentNote": "...", "studentAiPromptStarters": ["...", "...", "...", "..."], "partialExemplars": [{ "forCriterion": "...", "strongElement": "...", "weakElement": "..." }, ...] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
      undefined,
      { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-fill-extras" },
    );
    const parsed = parseJsonFromAi<ExtrasResponse>(response.content);
    return parsed;
  }

  private errMsg(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

function cap(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function placeholderRubric(): RubricCriterion[] {
  return ["Observation", "Reasoning", "AI critique", "Presentation"].map((criterion) => ({
    criterion,
    excellent: "—",
    good: "—",
    satisfactory: "—",
    needsWork: "—",
  }));
}

function placeholderTasks(input: AssignmentInput): AssignmentTask[] {
  return [
    {
      step: 1,
      title: "Observe",
      studentInstruction: `Gather first-hand evidence about ${input.topic}. Replace this with the specific observations you want students to make.`,
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
      studentInstruction: `Ask an AI tool about ${input.topic} and compare its answer to your own evidence.`,
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
}
