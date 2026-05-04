import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import type { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import type { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { AssignmentGeneratorService } from "./assignment-generator.service";
import type { SectionFillerService } from "./section-filler.service";

const sampleInput: AssignmentInput = {
  subject: "geography",
  topic: "cloud types",
  ageBucket: "12-14",
  studentAge: 13,
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  differentiation: [],
  learningObjective: null,
  allowAiUse: true,
};

const validAssignment = (): Assignment => ({
  title: "Sky Investigator",
  subject: "geography",
  topic: "cloud types",
  ageBucket: "12-14",
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  studentBrief: "Investigate cloud types using your own observations of the sky.",
  learningObjective: "Identify five cloud types and link them to weather patterns.",
  successCriteria: ["Three sky photos", "Five clouds named", "AI critique table", "Reflection"],
  tasks: [
    {
      step: 1,
      title: "Observe",
      studentInstruction:
        "Take three photos of the sky at different times. Record date, time, weather.",
      requiredEvidence: ["photo", "date", "time"],
      reasoningPrompt: "Why those times?",
      aiCritique: null,
      reflectionPrompt: "What surprised you?",
    },
    {
      step: 2,
      title: "Identify",
      studentInstruction:
        "Name five cloud types from your photos with height and weather link. Sketch each.",
      requiredEvidence: ["names", "heights", "sketches"],
      reasoningPrompt: "How did you decide?",
      aiCritique: null,
      reflectionPrompt: "Hardest one?",
    },
    {
      step: 3,
      title: "Critique AI",
      studentInstruction:
        "Ask AI for the same identifications. Compare and note where AI was wrong or too general.",
      requiredEvidence: ["AI prompt", "AI output", "comparison table"],
      reasoningPrompt: "Where did AI miss local context?",
      aiCritique: {
        promptToTry: "Identify these clouds.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare to your notes.",
        noteIssues: "AI hallucinations.",
        improveWithPersonalInput: "Rewrite with your evidence.",
      },
      reflectionPrompt: "What did you change?",
    },
    {
      step: 4,
      title: "Final poster",
      studentInstruction:
        "Build a poster combining your observations, identifications, AI critique, and reflection.",
      requiredEvidence: ["poster"],
      reasoningPrompt: "How does the poster prove your reasoning?",
      aiCritique: null,
      reflectionPrompt: "Most surprising thing?",
    },
  ],
  aiUseRules: ["Do not copy AI directly.", "Compare AI with evidence.", "Note where AI is wrong."],
  evidenceChecklist: ["Photos", "Cloud descriptions", "AI comparison", "Final poster"],
  finalSubmissionRequirements: ["Raw evidence", "Final poster", "Reflection"],
  rubric: [
    {
      criterion: "Observation",
      excellent: "Detailed.",
      good: "Some detail.",
      satisfactory: "Basic.",
      needsWork: "None.",
    },
    {
      criterion: "Knowledge",
      excellent: "Correct.",
      good: "Mostly correct.",
      satisfactory: "Partly correct.",
      needsWork: "Incorrect.",
    },
    {
      criterion: "Reasoning",
      excellent: "Clear.",
      good: "Some.",
      satisfactory: "Limited.",
      needsWork: "None.",
    },
    {
      criterion: "AI critique",
      excellent: "Thoughtful.",
      good: "Basic.",
      satisfactory: "One difference.",
      needsWork: "None.",
    },
  ],
  teacherNotes: {
    setup: "Photo-based fieldwork.",
    setupTime: "10 min prep.",
    materialsNeeded: ["camera", "worksheet"],
    commonMisconceptions: ["Confusing low and high clouds."],
    markingGuidance: "Reward evidence.",
    supportOption: "3-cloud cheat sheet.",
    extensionOption: "Predict tomorrow's weather.",
  },
  parentNote: "Your child will photograph the sky.",
  studentAiPromptStarters: ["Identify this cloud."],
  partialExemplars: [
    {
      forCriterion: "Reasoning",
      strongElement: "I picked cumulus because puffy and below 2km.",
      weakElement: "AI said cumulus.",
    },
  ],
  optionalWorkbookPages: [],
});

const stubMetrics = (): ExtractionMetricService =>
  ({
    time: <T>(_c: string, _o: string, fn: () => Promise<T>) => fn(),
    record: async () => {},
    stats: async () => ({ category: "", operation: "", averageMs: null, sampleSize: 0 }),
  }) as unknown as ExtractionMetricService;

const stubAiChat = (): AiChatService =>
  ({
    chat: async () => {
      throw new Error(
        "AiChatService.chat should not be called when SectionFillerService is stubbed",
      );
    },
  }) as unknown as AiChatService;

interface FillerStub {
  service: SectionFillerService;
  buildCallCount: () => number;
}

const stubSectionFiller = (responses: (Assignment | (() => Promise<Assignment>))[]): FillerStub => {
  const queue = [...responses];
  let calls = 0;
  const service = {
    fillMissingSections: async (a: Assignment) => ({ assignment: a, filled: [] }),
    buildBySection: async (_input: AssignmentInput): Promise<Assignment> => {
      calls += 1;
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("No more stubbed buildBySection responses");
      }
      return typeof next === "function" ? next() : next;
    },
  } as unknown as SectionFillerService;
  return { service, buildCallCount: () => calls };
};

describe("AssignmentGeneratorService", () => {
  it("returns whatever buildBySection produces", async () => {
    const filler = stubSectionFiller([validAssignment()]);
    const service = new AssignmentGeneratorService(stubAiChat(), stubMetrics(), filler.service);
    const result = await service.generate(sampleInput);
    expect(result.title).toBe("Sky Investigator");
    expect(result.tasks.length).toBe(4);
    expect(result.rubric.length).toBe(4);
  });

  it("caches a clean result and returns it on subsequent calls", async () => {
    const filler = stubSectionFiller([validAssignment()]);
    const service = new AssignmentGeneratorService(stubAiChat(), stubMetrics(), filler.service);
    const first = await service.generate(sampleInput);
    const second = await service.generate(sampleInput);
    expect(first).toBe(second);
    expect(filler.buildCallCount()).toBe(1);
  });

  it("does NOT cache results that carry quality warnings — next call retries", async () => {
    const flawed = validAssignment();
    flawed.qualityWarnings = ["Nix could not produce a rubric; placeholder used."];
    const fixed = validAssignment();
    const filler = stubSectionFiller([flawed, fixed]);
    const service = new AssignmentGeneratorService(stubAiChat(), stubMetrics(), filler.service);
    const first = await service.generate(sampleInput);
    expect(first.qualityWarnings?.length ?? 0).toBeGreaterThan(0);
    const second = await service.generate(sampleInput);
    expect(second.qualityWarnings ?? []).toHaveLength(0);
    expect(filler.buildCallCount()).toBe(2);
  });

  it("returns a fallback scaffold when buildBySection throws", async () => {
    const filler = stubSectionFiller([() => Promise.reject(new Error("Gemini network failure"))]);
    const service = new AssignmentGeneratorService(stubAiChat(), stubMetrics(), filler.service);
    const result = await service.generate(sampleInput);
    expect(result.title.toLowerCase()).toContain(sampleInput.topic.toLowerCase());
    expect(result.qualityWarnings?.[0]).toMatch(/took too long|could not generate/i);
  });
});
