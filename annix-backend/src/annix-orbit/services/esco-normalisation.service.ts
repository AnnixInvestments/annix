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

  // Rule-based skills extraction: scan free text for ESCO skill labels/aliases
  // (1–4 word phrases) and return the matched canonical skills. Lets callers skip
  // an LLM analysis when a job's skills are already unambiguous in its text.
  // Longest phrase at each position wins so "project management" beats "project".
  async extractSkillsFromText(text: string, max: number): Promise<string[]> {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0);
    if (tokens.length === 0) return [];
    const cache = await this.cacheOrLoad();
    if (cache.size === 0) return [];

    const maxNgram = 4;
    const found = new Set<string>();
    for (let i = 0; i < tokens.length && found.size < max; i += 1) {
      for (let n = Math.min(maxNgram, tokens.length - i); n >= 1; n -= 1) {
        const hit = cache.get(tokens.slice(i, i + n).join(" "));
        if (hit) {
          found.add(hit.canonical.toLowerCase().trim());
          break;
        }
      }
    }
    return [...found].slice(0, max);
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
