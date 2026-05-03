import { describe, expect, it } from "vitest";
import type { Assignment } from "./assignment";
import {
  aiSafeSignalsHit,
  findNearDuplicateTaskPairs,
  isTooFluffy,
  similarityRatio,
  validateAssignment,
} from "./validation";

const baseAssignment = (): Assignment => ({
  title: "Sky Investigator",
  subject: "geography",
  topic: "cloud types",
  ageBucket: "12-14",
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  studentBrief:
    "Investigate different cloud types by taking photos of the sky at different times. You will compare your observations with AI's identification and explain where you agree or disagree.",
  learningObjective: "Identify five cloud types and link them to weather patterns.",
  successCriteria: [
    "Three sky photos with date/time/location",
    "Five cloud types correctly identified",
    "AI critique table",
    "Reflection paragraph",
  ],
  tasks: [
    {
      step: 1,
      title: "Observe",
      studentInstruction:
        "Take three photos of the sky at different times of day. Record date, time, weather conditions, and location for each photo on the worksheet.",
      requiredEvidence: ["photo", "date", "time", "weather", "location"],
      reasoningPrompt: "Why did you pick those times?",
      aiCritique: null,
      reflectionPrompt: "What changed in the sky between photos?",
    },
    {
      step: 2,
      title: "Identify",
      studentInstruction:
        "Choose five cloud types and record name, height, appearance, and the weather usually linked to each one. Sketch each cloud or attach a picture.",
      requiredEvidence: ["names", "heights", "sketches"],
      reasoningPrompt: "Why do you think this is the correct cloud type?",
      aiCritique: null,
      reflectionPrompt: "Which cloud was hardest to identify?",
    },
    {
      step: 3,
      title: "Critique AI",
      studentInstruction:
        "Ask an AI tool to identify the same five cloud types and compare your answers. Note where AI was right, wrong, or too general for your local sky.",
      requiredEvidence: ["AI output", "comparison table"],
      reasoningPrompt: "Where did AI miss local context?",
      aiCritique: {
        promptToTry: "Identify these cloud types from my photos and explain how each forms.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI identifications to your own observations.",
        noteIssues: "Where did AI hallucinate or oversimplify?",
        improveWithPersonalInput: "Rewrite AI explanation using your own observations.",
      },
      reflectionPrompt: "What did you change after seeing AI's answer?",
    },
    {
      step: 4,
      title: "Final poster",
      studentInstruction:
        "Build a poster combining your observations, identifications, AI critique, and reflection. Use your photos and sketches as evidence.",
      requiredEvidence: ["poster", "evidence appendix"],
      reasoningPrompt: "How does the poster prove your reasoning?",
      aiCritique: null,
      reflectionPrompt: "What surprised you most during this project?",
    },
  ],
  aiUseRules: [
    "Do not copy AI answers directly.",
    "Always compare AI with your own evidence.",
    "Note where AI is wrong or too general.",
  ],
  evidenceChecklist: [
    "Sky photos with time/date/location",
    "Names and descriptions of 5 cloud types",
    "Comparison table of own notes vs AI response",
    "Final poster",
  ],
  finalSubmissionRequirements: [
    "All raw evidence (photos, notes, drafts)",
    "Final polished poster",
    "Short reflection paragraph",
  ],
  rubric: [
    {
      criterion: "Observation",
      excellent: "Detailed real-world observations.",
      good: "Some observations with detail.",
      satisfactory: "Basic observations.",
      needsWork: "Little or no observation.",
    },
    {
      criterion: "Cloud knowledge",
      excellent: "Correctly explains types and heights.",
      good: "Mostly correct.",
      satisfactory: "Partly correct.",
      needsWork: "Incorrect.",
    },
    {
      criterion: "Reasoning",
      excellent: "Clearly explains choices.",
      good: "Some explanation.",
      satisfactory: "Limited explanation.",
      needsWork: "Little reasoning.",
    },
    {
      criterion: "AI comparison",
      excellent: "Critiques AI thoughtfully.",
      good: "Basic comparison.",
      satisfactory: "Notes one difference.",
      needsWork: "Copies AI without critique.",
    },
  ],
  teacherNotes: {
    setup: "Photo-based fieldwork; remind students to take photos at different weather points.",
    setupTime: "10 minutes prep + students gather photos at home",
    materialsNeeded: ["smartphone or camera", "printed worksheet", "poster paper"],
    commonMisconceptions: [
      "Confusing low and high clouds.",
      "Assuming fluffy clouds always mean good weather.",
    ],
    markingGuidance: "Focus on evidence and reasoning over neatness.",
    supportOption: "Provide a 3-cloud cheat sheet instead of 5.",
    extensionOption: "Predict weather for the next 2 days from cloud patterns.",
  },
  parentNote: "Your child will photograph the sky at different times this week.",
  studentAiPromptStarters: [
    "Identify the cloud type in this photo.",
    "What weather is usually linked to cumulus clouds?",
    "Explain how cirrus clouds form.",
  ],
  partialExemplars: [
    {
      forCriterion: "Reasoning",
      strongElement: "I picked cumulus because the cloud was puffy and below 2km.",
      weakElement: "I picked cumulus because AI said so.",
    },
  ],
  optionalWorkbookPages: [],
});

describe("validateAssignment", () => {
  it("accepts a well-formed assignment", () => {
    const result = validateAssignment(baseAssignment());
    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("rejects when title is missing", () => {
    const a = baseAssignment();
    a.title = "";
    const result = validateAssignment(a);
    expect(result.valid).toBe(false);
    expect(result.failures.some((f) => f.code === "missing_title")).toBe(true);
  });

  it("rejects when there are too few tasks", () => {
    const a = baseAssignment();
    a.tasks = a.tasks.slice(0, 2);
    const result = validateAssignment(a);
    expect(result.failures.some((f) => f.code === "too_few_tasks")).toBe(true);
  });

  it("rejects when a rubric criterion is missing a level", () => {
    const a = baseAssignment();
    a.rubric[0].satisfactory = "";
    const result = validateAssignment(a);
    expect(result.failures.some((f) => f.code === "rubric_levels_incomplete")).toBe(true);
  });

  it("rejects banned phrases in student brief", () => {
    const a = baseAssignment();
    a.studentBrief = "Research the topic and write about clouds in your own words.";
    const result = validateAssignment(a);
    expect(result.failures.some((f) => f.code === "banned_phrase")).toBe(true);
  });

  it("rejects banned phrases inside a task instruction", () => {
    const a = baseAssignment();
    a.tasks[0].studentInstruction = "Use the internet to research the topic of clouds.";
    const result = validateAssignment(a);
    expect(result.failures.some((f) => f.code === "banned_phrase")).toBe(true);
  });
});

describe("isTooFluffy", () => {
  it("accepts an assignment with substantive tasks", () => {
    const result = isTooFluffy(baseAssignment());
    expect(result.valid).toBe(true);
  });

  it("rejects when average task instruction is too short", () => {
    const a = baseAssignment();
    a.tasks.forEach((t) => {
      t.studentInstruction = "Do it.";
    });
    const result = isTooFluffy(a);
    expect(result.failures.some((f) => f.code === "tasks_too_short")).toBe(true);
  });

  it("rejects when a task has empty requiredEvidence", () => {
    const a = baseAssignment();
    a.tasks[0].requiredEvidence = [];
    const result = isTooFluffy(a);
    expect(result.failures.some((f) => f.code === "task_evidence_empty")).toBe(true);
  });

  it("rejects near-duplicate tasks", () => {
    const a = baseAssignment();
    a.tasks[1].studentInstruction = a.tasks[0].studentInstruction;
    const result = isTooFluffy(a);
    expect(result.failures.some((f) => f.code === "tasks_too_similar")).toBe(true);
  });
});

describe("similarityRatio", () => {
  it("returns 1 for identical strings", () => {
    expect(similarityRatio("hello world", "hello world")).toBe(1);
  });
  it("returns 0 for completely different short strings", () => {
    expect(similarityRatio("abc", "xyz")).toBe(0);
  });
  it("returns >0.8 for near-duplicates", () => {
    expect(
      similarityRatio("the quick brown fox jumps", "the quick brown fox leaps"),
    ).toBeGreaterThan(0.8);
  });
});

describe("findNearDuplicateTaskPairs", () => {
  it("flags two near-identical tasks", () => {
    const a = baseAssignment();
    a.tasks[1].studentInstruction = a.tasks[0].studentInstruction;
    expect(findNearDuplicateTaskPairs(a.tasks).length).toBeGreaterThan(0);
  });
  it("does not flag distinct tasks", () => {
    expect(findNearDuplicateTaskPairs(baseAssignment().tasks)).toHaveLength(0);
  });
});

describe("aiSafeSignalsHit", () => {
  it("returns at least 3 signals on a well-formed assignment", () => {
    const signals = aiSafeSignalsHit(baseAssignment());
    expect(signals.length).toBeGreaterThanOrEqual(3);
  });
  it("returns no signals for a vacuous assignment", () => {
    const a = baseAssignment();
    a.title = "";
    a.studentBrief = "";
    a.tasks.forEach((t) => {
      t.title = "";
      t.studentInstruction = "";
      t.reasoningPrompt = "";
      t.reflectionPrompt = "";
      t.requiredEvidence = [];
      t.aiCritique = null;
    });
    a.successCriteria = [];
    a.aiUseRules = [];
    a.evidenceChecklist = [];
    a.finalSubmissionRequirements = [];
    const signals = aiSafeSignalsHit(a);
    expect(signals).toHaveLength(0);
  });
});
