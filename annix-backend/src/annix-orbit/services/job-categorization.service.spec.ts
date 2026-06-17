import type { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type { JobAnalysisCacheRepository } from "../repositories/job-analysis-cache.repository";
import type { EscoNormalisationService } from "./esco-normalisation.service";
import { JobCategorizationService } from "./job-categorization.service";

function serviceWith(content: string | (() => Promise<{ content: string }>)): {
  service: JobCategorizationService;
  chat: jest.Mock;
} {
  const chat =
    typeof content === "string"
      ? jest.fn().mockResolvedValue({ content })
      : jest.fn().mockImplementation(content);
  const ai = { chat } as unknown as AiChatService;
  const cacheRepo = {
    findByKey: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
  } as unknown as JobAnalysisCacheRepository;
  const esco = {
    extractSkillsFromText: jest.fn().mockResolvedValue([]),
  } as unknown as EscoNormalisationService;
  return { service: new JobCategorizationService(ai, cacheRepo, esco), chat };
}

describe("JobCategorizationService.analyzeJob", () => {
  it("returns the category and cleaned skills from a valid response", async () => {
    const { service } = serviceWith(
      JSON.stringify({ category: "it-software", skills: ["SQL", " React ", "react", "x"] }),
    );
    const result = await service.analyzeJob({ title: "Developer", description: "Build apps" });
    expect(result.category).toBe("it-software");
    // lowercased, trimmed, deduped, single-char dropped
    expect(result.skills).toEqual(["sql", "react"]);
  });

  it("nulls an invalid category but keeps the skills", async () => {
    const { service } = serviceWith(JSON.stringify({ category: "not-a-key", skills: ["welding"] }));
    const result = await service.analyzeJob({ title: "Welder" });
    expect(result.category).toBeNull();
    expect(result.skills).toEqual(["welding"]);
  });

  it("never throws — returns empty on an AI failure", async () => {
    const { service } = serviceWith(async () => {
      throw new Error("boom");
    });
    const result = await service.analyzeJob({ title: "Anything" });
    expect(result).toEqual({ category: null, skills: [] });
  });

  it("skips the AI call entirely for an empty title", async () => {
    const { service, chat } = serviceWith("{}");
    const result = await service.analyzeJob({ title: "   " });
    expect(result).toEqual({ category: null, skills: [] });
    expect(chat).not.toHaveBeenCalled();
  });

  it("caps the skills list at 20", async () => {
    const many = Array.from({ length: 30 }, (_, i) => `skill${i}`);
    const { service } = serviceWith(JSON.stringify({ category: "it-software", skills: many }));
    const result = await service.analyzeJob({ title: "Title", description: "desc" });
    expect(result.skills).toHaveLength(20);
  });

  it("caches by title+description so repeats reuse one AI call", async () => {
    const { service, chat } = serviceWith(
      JSON.stringify({ category: "it-software", skills: ["sql"] }),
    );
    await service.analyzeJob({ title: "Dev", description: "desc" });
    await service.analyzeJob({ title: "Dev", description: "desc" });
    expect(chat).toHaveBeenCalledTimes(1);
  });
});
