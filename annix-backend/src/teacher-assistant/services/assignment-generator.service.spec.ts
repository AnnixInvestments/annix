import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import type { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import type { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { AssignmentGeneratorService } from "./assignment-generator.service";

const validAssignment = (): Assignment => ({
  title: "Sky Investigator",
  subject: "geography",
  topic: "cloud types",
  ageBucket: "12-14",
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  studentBrief:
    "Investigate different cloud types by photographing the sky at different times. Compare your observations with AI's identification and explain where you agree or disagree.",
  learningObjective: "Identify five cloud types and link them to weather patterns.",
  successCriteria: [
    "Three sky photos with date/time/location",
    "Five cloud types identified",
    "AI critique table",
    "Reflection paragraph",
  ],
  tasks: [
    {
      step: 1,
      title: "Observe",
      studentInstruction:
        "Take three photos of the sky at different times of day. Record date, time, weather, and location for each photo on the worksheet.",
      requiredEvidence: ["photo", "date", "time", "weather"],
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
      reasoningPrompt: "Why this cloud type?",
      aiCritique: null,
      reflectionPrompt: "Hardest cloud to identify?",
    },
    {
      step: 3,
      title: "Critique AI",
      studentInstruction:
        "Ask an AI tool to identify the same five cloud types and compare. Note where AI was right, wrong, or too general for your local sky.",
      requiredEvidence: ["AI output", "comparison table"],
      reasoningPrompt: "Where did AI miss local context?",
      aiCritique: {
        promptToTry: "Identify these clouds.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI to your notes.",
        noteIssues: "Where did AI hallucinate?",
        improveWithPersonalInput: "Rewrite using your evidence.",
      },
      reflectionPrompt: "What did you change after seeing AI's answer?",
    },
    {
      step: 4,
      title: "Final poster",
      studentInstruction:
        "Build a poster combining your observations, identifications, AI critique, and reflection. Use your photos and sketches as evidence.",
      requiredEvidence: ["poster"],
      reasoningPrompt: "How does the poster prove your reasoning?",
      aiCritique: null,
      reflectionPrompt: "What surprised you most?",
    },
  ],
  aiUseRules: ["Compare AI with your evidence.", "Do not copy AI directly."],
  evidenceChecklist: ["Sky photos", "Cloud descriptions", "Comparison table", "Final poster"],
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
      excellent: "Explains clearly.",
      good: "Some explanation.",
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
    setupTime: "10 minutes prep.",
    materialsNeeded: ["camera", "worksheet", "poster paper"],
    commonMisconceptions: ["Confusing low and high clouds."],
    markingGuidance: "Focus on evidence over neatness.",
    supportOption: "3-cloud cheat sheet.",
    extensionOption: "Predict tomorrow's weather.",
  },
  parentNote: "Your child will photograph the sky this week.",
  studentAiPromptStarters: ["Identify this cloud", "How do cumulus form?", "What weather follows?"],
  partialExemplars: [
    {
      forCriterion: "Reasoning",
      strongElement: "Picked cumulus because puffy and below 2km.",
      weakElement: "Picked cumulus because AI said so.",
    },
  ],
  optionalWorkbookPages: [],
});

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

const stubMetrics = (): ExtractionMetricService =>
  ({
    time: <T>(_c: string, _o: string, fn: () => Promise<T>) => fn(),
    record: async () => {},
    stats: async () => ({ category: "", operation: "", averageMs: null, sampleSize: 0 }),
  }) as unknown as ExtractionMetricService;

interface StubbedAi {
  service: AiChatService;
  callCount: () => number;
}

const stubAiChat = (sequentialResponses: string[]): StubbedAi => {
  const queue = [...sequentialResponses];
  let calls = 0;
  const service = {
    chat: async () => {
      calls += 1;
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("No more stubbed responses");
      }
      return { content: next, providerUsed: "gemini" };
    },
  } as unknown as AiChatService;
  return { service, callCount: () => calls };
};

describe("AssignmentGeneratorService", () => {
  it("returns a valid assignment on first attempt", async () => {
    const ai = stubAiChat([JSON.stringify(validAssignment())]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.title).toBe("Sky Investigator");
    expect(result.tasks).toHaveLength(4);
  });

  it("retries when first attempt has too few tasks", async () => {
    const tooFewTasks = validAssignment();
    tooFewTasks.tasks = tooFewTasks.tasks.slice(0, 2);
    const ai = stubAiChat([JSON.stringify(tooFewTasks), JSON.stringify(validAssignment())]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.tasks).toHaveLength(4);
  });

  it("returns a fallback stub when no attempt has minimal structure", async () => {
    const broken = validAssignment();
    broken.title = "";
    const ai = stubAiChat([
      JSON.stringify(broken),
      JSON.stringify(broken),
      JSON.stringify(broken),
      JSON.stringify(broken),
    ]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.title.toLowerCase()).toContain(sampleInput.topic.toLowerCase());
    expect(result.title.toLowerCase()).toContain("starter");
    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.rubric.length).toBeGreaterThanOrEqual(4);
    expect(result.qualityWarnings?.[0]).toMatch(/Nix could not generate/i);
  });

  it("returns a fallback stub when every AI response is unparseable", async () => {
    const ai = stubAiChat([
      "this is not json at all",
      "still not json",
      "completely garbled response",
      "{ not valid",
    ]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.qualityWarnings?.length ?? 0).toBeGreaterThan(0);
  });

  it("returns cached assignment on repeat call with identical input", async () => {
    const ai = stubAiChat([JSON.stringify(validAssignment())]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const first = await service.generate(sampleInput);
    const second = await service.generate(sampleInput);
    expect(first).toBe(second);
  });

  it("strips markdown code fences from AI responses", async () => {
    const fenced = `\`\`\`json\n${JSON.stringify(validAssignment())}\n\`\`\``;
    const ai = stubAiChat([fenced]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.title).toBe("Sky Investigator");
  });

  it("rejects banned-phrase output then accepts a clean retry", async () => {
    const lazy = validAssignment();
    lazy.studentBrief = "Research the topic and write about clouds.";
    const ai = stubAiChat([JSON.stringify(lazy), JSON.stringify(validAssignment())]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.studentBrief).not.toContain("research the topic");
  });

  it("soft-accepts the best attempt with qualityWarnings when validation never passes", async () => {
    const flawed = validAssignment();
    flawed.studentBrief = "Research the topic and write about clouds.";
    const ai = stubAiChat([
      JSON.stringify(flawed),
      JSON.stringify(flawed),
      JSON.stringify(flawed),
      JSON.stringify(flawed),
    ]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.title).toBe(flawed.title);
    expect(result.qualityWarnings?.length ?? 0).toBeGreaterThan(0);
    expect(result.qualityWarnings?.some((w) => w.includes("research the topic"))).toBe(true);
  });

  it("auto-repairs missing rubric levels and empty requiredEvidence on soft-accept", async () => {
    const flawed = validAssignment();
    flawed.rubric[0].satisfactory = "";
    flawed.tasks[0].requiredEvidence = [];
    const ai = stubAiChat([
      JSON.stringify(flawed),
      JSON.stringify(flawed),
      JSON.stringify(flawed),
      JSON.stringify(flawed),
    ]);
    const service = new AssignmentGeneratorService(ai.service, stubMetrics());
    const result = await service.generate(sampleInput);
    expect(result.rubric[0].satisfactory).toBe("—");
    expect(result.tasks[0].requiredEvidence.length).toBeGreaterThan(0);
    expect(result.qualityWarnings?.length ?? 0).toBeGreaterThan(0);
  });
});
