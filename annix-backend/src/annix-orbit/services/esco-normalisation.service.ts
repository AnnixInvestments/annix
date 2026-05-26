import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CvEscoSkillRepository } from "../repositories/cv-esco-skill.repository";

export interface NormalisedSkill {
  raw: string;
  canonical: string | null;
  alts: string[];
  matched: boolean;
}

@Injectable()
export class EscoNormalisationService implements OnModuleInit {
  private readonly logger = new Logger(EscoNormalisationService.name);
  private cache: Map<string, { canonical: string; alts: string[] }> | null = null;
  private cachePopulatedAt = 0;
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly repo: CvEscoSkillRepository) {}

  async onModuleInit(): Promise<void> {
    void this.populateCache().catch((err) => {
      this.logger.warn(
        `ESCO cache warmup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  async canonicalise(rawSkill: string): Promise<NormalisedSkill> {
    const trimmed = rawSkill.trim();
    if (trimmed.length === 0) {
      return { raw: rawSkill, canonical: null, alts: [], matched: false };
    }
    const cache = await this.cacheOrLoad();
    const hit = cache.get(trimmed.toLowerCase());
    if (hit) {
      return { raw: rawSkill, canonical: hit.canonical, alts: hit.alts, matched: true };
    }
    return { raw: rawSkill, canonical: null, alts: [], matched: false };
  }

  async canonicaliseAll(rawSkills: string[]): Promise<NormalisedSkill[]> {
    if (rawSkills.length === 0) return [];
    const cache = await this.cacheOrLoad();
    return rawSkills.map((raw) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return { raw, canonical: null, alts: [], matched: false };
      }
      const hit = cache.get(trimmed.toLowerCase());
      if (hit) {
        return { raw, canonical: hit.canonical, alts: hit.alts, matched: true };
      }
      return { raw, canonical: null, alts: [], matched: false };
    });
  }

  expandedSkillTokens(rawSkills: string[], normalised: NormalisedSkill[]): string[] {
    if (rawSkills.length !== normalised.length) {
      return rawSkills;
    }
    const out = new Set<string>();
    normalised.forEach((entry) => {
      out.add(entry.raw);
      if (entry.canonical) out.add(entry.canonical);
      entry.alts.forEach((alt) => out.add(alt));
    });
    return [...out];
  }

  async invalidateCache(): Promise<void> {
    this.cache = null;
    this.cachePopulatedAt = 0;
  }

  private async cacheOrLoad(): Promise<Map<string, { canonical: string; alts: string[] }>> {
    if (this.cache && Date.now() - this.cachePopulatedAt < this.CACHE_TTL_MS) {
      return this.cache;
    }
    return this.populateCache();
  }

  private async populateCache(): Promise<Map<string, { canonical: string; alts: string[] }>> {
    const rows = await this.repo.findAll();
    const map = new Map<string, { canonical: string; alts: string[] }>();
    for (const row of rows) {
      const canonical = row.preferredLabel;
      const alts = Array.isArray(row.altLabels) ? row.altLabels : [];
      const allLabels = [canonical, ...alts];
      for (const label of allLabels) {
        if (!label) continue;
        const key = label.toLowerCase().trim();
        if (key.length === 0) continue;
        if (!map.has(key)) {
          map.set(key, { canonical, alts });
        }
      }
    }
    this.cache = map;
    this.cachePopulatedAt = Date.now();
    if (rows.length > 0) {
      this.logger.log(`ESCO normalisation cache loaded: ${rows.length} skills, ${map.size} labels`);
    }
    return map;
  }
}
