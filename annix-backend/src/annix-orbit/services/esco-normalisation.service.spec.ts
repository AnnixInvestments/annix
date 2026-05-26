import { Test, TestingModule } from "@nestjs/testing";
import { CvEscoSkill } from "../entities/cv-esco-skill.entity";
import { CvEscoSkillRepository } from "../repositories/cv-esco-skill.repository";
import { EscoNormalisationService } from "./esco-normalisation.service";

function fakeSkill(id: number, preferred: string, alts: string[]): CvEscoSkill {
  return {
    id,
    escoUri: `http://data.europa.eu/esco/skill/${id}`,
    preferredLabel: preferred,
    altLabels: alts,
    description: null,
    createdAt: new Date(),
  };
}

describe("EscoNormalisationService", () => {
  let service: EscoNormalisationService;
  let repo: { findAll: jest.Mock };

  beforeEach(async () => {
    repo = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          fakeSkill(1, "PostgreSQL", ["Postgres", "psql", "Postgres database"]),
          fakeSkill(2, "JavaScript", ["JS", "ECMAScript"]),
          fakeSkill(3, "Business development manager", [
            "BDM",
            "sales representative",
            "sales rep",
          ]),
          fakeSkill(4, "Welding (coded)", ["coded welder", "red seal welder"]),
        ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EscoNormalisationService, { provide: CvEscoSkillRepository, useValue: repo }],
    }).compile();
    service = module.get(EscoNormalisationService);
    await service.invalidateCache();
  });

  it("maps an alt-label to the canonical preferred label", async () => {
    const result = await service.canonicalise("Postgres");
    expect(result.matched).toBe(true);
    expect(result.canonical).toBe("PostgreSQL");
    expect(result.alts).toContain("Postgres");
    expect(result.alts).toContain("psql");
  });

  it("maps the canonical label to itself (case-insensitive)", async () => {
    const result = await service.canonicalise("postgresql");
    expect(result.matched).toBe(true);
    expect(result.canonical).toBe("PostgreSQL");
  });

  it("returns matched=false for an unknown skill", async () => {
    const result = await service.canonicalise("Cobol-On-Cogs");
    expect(result.matched).toBe(false);
    expect(result.canonical).toBeNull();
    expect(result.alts).toEqual([]);
  });

  it("canonicaliseAll preserves input order", async () => {
    const results = await service.canonicaliseAll(["Postgres", "Cobol", "JS"]);
    expect(results).toHaveLength(3);
    expect(results[0].canonical).toBe("PostgreSQL");
    expect(results[1].matched).toBe(false);
    expect(results[2].canonical).toBe("JavaScript");
  });

  it("expandedSkillTokens deduplicates and includes raw + canonical + alts", async () => {
    const raws = ["Postgres", "JS"];
    const normalised = await service.canonicaliseAll(raws);
    const tokens = service.expandedSkillTokens(raws, normalised);
    expect(tokens).toContain("Postgres");
    expect(tokens).toContain("PostgreSQL");
    expect(tokens).toContain("psql");
    expect(tokens).toContain("JS");
    expect(tokens).toContain("JavaScript");
    expect(tokens).toContain("ECMAScript");
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("expandedSkillTokens returns the raw list when unknown skills are passed", async () => {
    const raws = ["Cobol-On-Cogs", "Brainfuck"];
    const normalised = await service.canonicaliseAll(raws);
    const tokens = service.expandedSkillTokens(raws, normalised);
    expect(tokens.sort()).toEqual(["Brainfuck", "Cobol-On-Cogs"]);
  });

  it("handles empty inputs gracefully", async () => {
    expect(await service.canonicaliseAll([])).toEqual([]);
    const result = await service.canonicalise("   ");
    expect(result.matched).toBe(false);
  });

  it("treats SA-labour-market synonyms (coded welder ↔ welding (coded))", async () => {
    const result = await service.canonicalise("coded welder");
    expect(result.matched).toBe(true);
    expect(result.canonical).toBe("Welding (coded)");
    expect(result.alts).toContain("red seal welder");
  });
});
