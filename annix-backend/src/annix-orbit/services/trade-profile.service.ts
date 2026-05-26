import {
  type Availability,
  type Commodity,
  emptyTradeProfile,
  type TradeKey,
  type TradeProfile,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { Candidate } from "../entities/candidate.entity";
import { CandidateRepository } from "../repositories/candidate.repository";

@Injectable()
export class TradeProfileService {
  private readonly logger = new Logger(TradeProfileService.name);

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly aiChatService: AiChatService,
  ) {}

  async forSeeker(
    email: string | null,
  ): Promise<{ profile: TradeProfile; candidateIds: number[] }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return { profile: emptyTradeProfile(), candidateIds: [] };
    }
    const target = candidates[0];
    const profile = target.tradeProfile ?? emptyTradeProfile();
    return { profile, candidateIds: candidates.map((c) => c.id) };
  }

  async upsertForSeeker(
    email: string | null,
    profile: TradeProfile,
  ): Promise<{ saved: boolean; candidateIds: number[] }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return { saved: false, candidateIds: [] };
    }
    const normalised = normaliseProfile(profile);
    await Promise.all(
      candidates.map((c) => this.candidateRepo.updateTradeProfile(c.id, normalised)),
    );
    return { saved: true, candidateIds: candidates.map((c) => c.id) };
  }

  async autofillFromCvForSeeker(email: string | null): Promise<{
    extracted: boolean;
    profile: TradeProfile;
    candidateIds: number[];
    reason?: "no-candidate" | "no-cv-text" | "no-trade-keywords" | "ai-failed";
  }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return {
        extracted: false,
        profile: emptyTradeProfile(),
        candidateIds: [],
        reason: "no-candidate",
      };
    }
    const target = candidates[0];
    const rawCvText = target.rawCvText;
    if (!rawCvText || rawCvText.trim().length === 0) {
      return {
        extracted: false,
        profile: target.tradeProfile ?? emptyTradeProfile(),
        candidateIds: candidates.map((c) => c.id),
        reason: "no-cv-text",
      };
    }

    if (!containsTradeKeywords(rawCvText)) {
      return {
        extracted: false,
        profile: target.tradeProfile ?? emptyTradeProfile(),
        candidateIds: candidates.map((c) => c.id),
        reason: "no-trade-keywords",
      };
    }

    const aiProfile = await this.extractTradeProfileFromCv(rawCvText);
    if (!aiProfile) {
      return {
        extracted: false,
        profile: target.tradeProfile ?? emptyTradeProfile(),
        candidateIds: candidates.map((c) => c.id),
        reason: "ai-failed",
      };
    }

    const merged = mergeProfiles(target.tradeProfile, aiProfile);
    const normalised = normaliseProfile(merged);
    await Promise.all(
      candidates.map((c) => this.candidateRepo.updateTradeProfile(c.id, normalised)),
    );

    return {
      extracted: true,
      profile: normalised,
      candidateIds: candidates.map((c) => c.id),
    };
  }

  private async extractTradeProfileFromCv(cvText: string): Promise<TradeProfile | null> {
    const trimmed = cvText.length > 60_000 ? cvText.slice(0, 60_000) : cvText;
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: buildTradeExtractionPrompt(trimmed) }],
        TRADE_EXTRACTION_SYSTEM_PROMPT,
        "gemini",
      );
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as Partial<TradeProfile>;
      if (!parsed?.shared) return null;
      return {
        shared: {
          tradeKeys: Array.isArray(parsed.shared.tradeKeys)
            ? (parsed.shared.tradeKeys as TradeKey[])
            : [],
          yearsExperience:
            typeof parsed.shared.yearsExperience === "number"
              ? parsed.shared.yearsExperience
              : null,
          commoditiesWorked: Array.isArray(parsed.shared.commoditiesWorked)
            ? (parsed.shared.commoditiesWorked as Commodity[])
            : [],
          shutdownHistory: Array.isArray(parsed.shared.shutdownHistory)
            ? parsed.shared.shutdownHistory
            : [],
          siteRadiusKm:
            typeof parsed.shared.siteRadiusKm === "number" ? parsed.shared.siteRadiusKm : null,
          availability: (parsed.shared.availability as Availability | undefined) ?? null,
        },
        perTrade: parsed.perTrade ?? {},
      };
    } catch (err) {
      this.logger.warn(
        `Trade profile extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async candidatesForEmail(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.findByEmail(email);
  }
}

const TRADE_EXTRACTION_SYSTEM_PROMPT = `You are extracting a structured trade profile from a CV/resume of a South African industrial trade worker. Only return a profile if the CV is clearly for one of these trades: boilermaker, coded welder, rubber liner, pipe fitter, diesel mechanic, rigger, electrician. Otherwise return {"shared": {"tradeKeys": []}, "perTrade": {}} — empty.

Use these exact field names. Numbers as numbers, booleans as booleans, missing fields as null/[]/false:

{
  "shared": {
    "tradeKeys":  ["boilermaker"|"coded_welder"|"rubber_liner"|"pipe_fitter"|"diesel_mechanic"|"rigger"|"electrician"],
    "yearsExperience": int | null,
    "commoditiesWorked": ["gold"|"coal"|"platinum"|"iron_ore"|"manganese"|"chrome"|"copper"|"diamond"|"uranium"|"nickel"],
    "shutdownHistory": [{ "siteName": string, "role": string, "durationDays": int, "year": int }],
    "siteRadiusKm": int | null,
    "availability": "available_now" | "14d_notice" | "30d_notice" | "not_currently" | null
  },
  "perTrade": {
    "boilermaker":     { "codedTickets": string[], "pressureVesselExperience": bool, "specialisations": string[] },
    "coded_welder":    { "processes": string[], "positions": string[], "materialsCoded": string[], "thicknessMinMm": int|null, "thicknessMaxMm": int|null, "saqccCertificateNumber": string|null, "saqccValidUntil": "YYYY-MM-DD"|null },
    "rubber_liner":    { "linerCertifications": string[], "chuteAndMillExperience": bool, "adhesiveSystemsUsed": string[], "maxVesselSizeM3": int|null },
    "pipe_fitter":     { "pipeSpecExperience": string[], "maxDiameterMm": int|null, "flangeBoltingTorqueCert": bool, "weldFitupExperience": bool },
    "diesel_mechanic": { "enginesWorked": string[], "vehiclesWorked": string[], "electronicDiagnosticsTools": string[], "mineFleetExperience": bool },
    "rigger":          { "riggerClass": "rigger"|"rigger_intermediate"|"rigger_advanced"|null, "maxLiftWeightTons": int|null, "mobileCraneExperience": bool, "towerCraneExperience": bool },
    "electrician":     { "section13Certificate": bool, "competencyVoltage": "lv"|"mv"|"hv"|null, "specialClasses": string[], "mineHealthSafetyCert": bool }
  }
}

Only include perTrade entries for the tradeKeys you set. Return ONLY JSON, no markdown.`;

function buildTradeExtractionPrompt(cvText: string): string {
  return `Extract the trade profile from this CV. Return ONLY JSON (no markdown, no prose).\n\n${cvText}`;
}

const TRADE_KEYWORDS = [
  "boilermaker",
  "boiler maker",
  "coded welder",
  "welder",
  "welding",
  "rubber liner",
  "rubber lining",
  "pipe fitter",
  "pipefitter",
  "diesel mechanic",
  "rigger",
  "rigging",
  "electrician",
  "section 13",
  "saqcc",
];

function containsTradeKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return TRADE_KEYWORDS.some((kw) => lower.includes(kw));
}

function mergeProfiles(existing: TradeProfile | null, next: TradeProfile): TradeProfile {
  if (!existing) return next;
  return {
    shared: {
      tradeKeys: dedupeShallow([
        ...existing.shared.tradeKeys,
        ...next.shared.tradeKeys,
      ]) as TradeKey[],
      yearsExperience: next.shared.yearsExperience ?? existing.shared.yearsExperience,
      commoditiesWorked: dedupeShallow([
        ...existing.shared.commoditiesWorked,
        ...next.shared.commoditiesWorked,
      ]) as Commodity[],
      shutdownHistory:
        next.shared.shutdownHistory.length > 0
          ? next.shared.shutdownHistory
          : existing.shared.shutdownHistory,
      siteRadiusKm: next.shared.siteRadiusKm ?? existing.shared.siteRadiusKm,
      availability: next.shared.availability ?? existing.shared.availability,
    },
    perTrade: { ...existing.perTrade, ...next.perTrade },
  };
}

function dedupeShallow<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normaliseProfile(profile: TradeProfile): TradeProfile {
  return {
    shared: {
      tradeKeys: dedupe(profile.shared.tradeKeys) as TradeKey[],
      yearsExperience: clampNonNegative(profile.shared.yearsExperience),
      commoditiesWorked: dedupe(profile.shared.commoditiesWorked) as Commodity[],
      shutdownHistory: (profile.shared.shutdownHistory ?? []).map((entry) => ({
        siteName: String(entry.siteName ?? "").trim(),
        role: String(entry.role ?? "").trim(),
        durationDays: clampNonNegative(entry.durationDays) ?? 0,
        year: clampYear(entry.year) ?? new Date().getFullYear(),
      })),
      siteRadiusKm: clampNonNegative(profile.shared.siteRadiusKm),
      availability: profile.shared.availability as Availability | null,
    },
    perTrade: profile.perTrade ?? {},
  };
}

function dedupe<T>(values: T[] | null | undefined): T[] {
  if (!values || values.length === 0) return [];
  return [...new Set(values)];
}

function clampNonNegative(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function clampYear(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 1980 || n > 2100) return null;
  return Math.round(n);
}
