import {
  AVAILABILITY_VALUES,
  type Availability,
  emptyWorkProfile,
  isJobCategoryKey,
  JOB_CATEGORY_KEYS,
  type JobCategoryKey,
  type WorkProfile,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { Candidate } from "../entities/candidate.entity";
import { SEEKER_EVENTS } from "../lib/seeker-testing.constants";
import { CandidateRepository } from "../repositories/candidate.repository";
import { EmbeddingService } from "./embedding.service";
import { SeekerTelemetryService } from "./seeker-telemetry.service";

@Injectable()
export class WorkProfileService {
  private readonly logger = new Logger(WorkProfileService.name);

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
    private readonly seekerTelemetry: SeekerTelemetryService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // A seeker changing their target categories may demand a category whose backlog
  // of jobs was never embedded (C1). Invalidate the demand cache and lazily embed
  // that backlog so their next match run sees the full pool. Fire-and-forget so
  // the profile save returns promptly; bounded + idempotent inside the service.
  private triggerDemandBackfill(): void {
    void this.embeddingService.backfillForActiveDemand().catch((err) => {
      this.logger.warn(
        `Demand-driven embedding backfill failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  async forSeeker(email: string | null): Promise<{
    profile: WorkProfile;
    candidateIds: number[];
    suggestedSalaryMin: number | null;
    suggestedSalaryMax: number | null;
  }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return {
        profile: emptyWorkProfile(),
        candidateIds: [],
        suggestedSalaryMin: null,
        suggestedSalaryMax: null,
      };
    }
    const target = candidates[0];
    const profile = target.workProfile ?? emptyWorkProfile();
    const extracted = target.extractedData;
    return {
      profile,
      candidateIds: candidates.map((c) => c.id),
      suggestedSalaryMin: extracted?.suggestedSalaryMin ?? null,
      suggestedSalaryMax: extracted?.suggestedSalaryMax ?? null,
    };
  }

  async upsertForSeeker(
    email: string | null,
    profile: WorkProfile,
  ): Promise<{ saved: boolean; candidateIds: number[] }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return { saved: false, candidateIds: [] };
    }
    const normalised = normaliseProfile(profile);
    await Promise.all(
      candidates.map((c) => this.candidateRepo.updateWorkProfile(c.id, normalised)),
    );
    if (normalised.shared.fields.length > 0) {
      await Promise.all(
        candidates.map((c) =>
          this.candidateRepo.updateTargetCategories(c.id, normalised.shared.fields),
        ),
      );
      this.triggerDemandBackfill();
    }
    const cid = candidates[0] ? candidates[0].id : null;
    await this.seekerTelemetry.record(cid, SEEKER_EVENTS.profileUpdated);
    return { saved: true, candidateIds: candidates.map((c) => c.id) };
  }

  async autofillFromCvForSeeker(email: string | null): Promise<{
    extracted: boolean;
    profile: WorkProfile;
    candidateIds: number[];
    reason?: "no-candidate" | "no-cv-text" | "ai-failed";
  }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return {
        extracted: false,
        profile: emptyWorkProfile(),
        candidateIds: [],
        reason: "no-candidate",
      };
    }
    const target = candidates[0];
    const rawCvText = target.rawCvText;
    if (!rawCvText || rawCvText.trim().length === 0) {
      return {
        extracted: false,
        profile: target.workProfile ?? emptyWorkProfile(),
        candidateIds: candidates.map((c) => c.id),
        reason: "no-cv-text",
      };
    }

    const aiProfile = await this.extractionMetricService.time(
      "orbit-work-extract",
      "cv-autofill",
      () => this.extractWorkProfileFromCv(rawCvText),
    );
    if (!aiProfile) {
      return {
        extracted: false,
        profile: target.workProfile ?? emptyWorkProfile(),
        candidateIds: candidates.map((c) => c.id),
        reason: "ai-failed",
      };
    }

    const merged = mergeProfiles(target.workProfile, aiProfile);
    const normalised = normaliseProfile(merged);
    await Promise.all(
      candidates.map((c) => this.candidateRepo.updateWorkProfile(c.id, normalised)),
    );
    if (normalised.shared.fields.length > 0) {
      await Promise.all(
        candidates.map((c) =>
          this.candidateRepo.updateTargetCategories(c.id, normalised.shared.fields),
        ),
      );
      this.triggerDemandBackfill();
    }

    return {
      extracted: true,
      profile: normalised,
      candidateIds: candidates.map((c) => c.id),
    };
  }

  private async extractWorkProfileFromCv(cvText: string): Promise<WorkProfile | null> {
    const trimmed = cvText.length > 60_000 ? cvText.slice(0, 60_000) : cvText;
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: buildWorkExtractionPrompt(trimmed) }],
        workExtractionSystemPrompt(),
        "gemini",
      );
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as { shared?: Partial<WorkProfile["shared"]> };
      if (!parsed?.shared) return null;
      const shared = parsed.shared;
      return {
        shared: {
          fields: Array.isArray(shared.fields) ? (shared.fields as JobCategoryKey[]) : [],
          primaryRole: typeof shared.primaryRole === "string" ? shared.primaryRole : null,
          yearsExperience:
            typeof shared.yearsExperience === "number" ? shared.yearsExperience : null,
          availability: (shared.availability as Availability | undefined) ?? null,
          willingToTravelKm:
            typeof shared.willingToTravelKm === "number" ? shared.willingToTravelKm : null,
          topSkills: Array.isArray(shared.topSkills) ? (shared.topSkills as string[]) : [],
          certifications: Array.isArray(shared.certifications)
            ? (shared.certifications as string[])
            : [],
        },
      };
    } catch (err) {
      this.logger.warn(
        `Work profile extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async candidatesForEmail(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.findByEmail(email);
  }
}

function workExtractionSystemPrompt(): string {
  const fieldUnion = JOB_CATEGORY_KEYS.map((key) => `"${key}"`).join(" | ");
  return `You are extracting a structured work profile from any CV/resume, across every industry (IT, healthcare, finance, hospitality, education, trades, etc.). Read the whole CV and infer the person's field(s), main role, experience, skills and certifications.

Use these exact field names. Numbers as numbers, missing values as null/[]:

{
  "shared": {
    "fields": [${fieldUnion}],
    "primaryRole": string | null,
    "yearsExperience": int | null,
    "availability": "available_now" | "14d_notice" | "30d_notice" | "not_currently" | null,
    "willingToTravelKm": int | null,
    "topSkills": string[],
    "certifications": string[]
  }
}

Rules:
- "fields": one to three of the allowed values that best describe the person's industry; pick the closest, use "other" only if nothing fits.
- "primaryRole": their most recent or strongest job title in plain words (e.g. "Registered Nurse", "Software Developer", "Boilermaker").
- "topSkills": up to 10 concise skills.
- "certifications": named qualifications, licences or tickets (e.g. "Red Seal", "SAQCC welding", "CompTIA A+", "Registered with SANC").
Return ONLY JSON, no markdown.`;
}

function buildWorkExtractionPrompt(cvText: string): string {
  return `Extract the work profile from this CV. Return ONLY JSON (no markdown, no prose).\n\n${cvText}`;
}

function mergeProfiles(existing: WorkProfile | null, next: WorkProfile): WorkProfile {
  if (!existing) return next;
  return {
    shared: {
      fields: dedupeShallow([...existing.shared.fields, ...next.shared.fields]) as JobCategoryKey[],
      primaryRole: next.shared.primaryRole ?? existing.shared.primaryRole,
      yearsExperience: next.shared.yearsExperience ?? existing.shared.yearsExperience,
      availability: next.shared.availability ?? existing.shared.availability,
      willingToTravelKm: next.shared.willingToTravelKm ?? existing.shared.willingToTravelKm,
      homeAddress: next.shared.homeAddress ?? existing.shared.homeAddress,
      homeLatitude: next.shared.homeLatitude ?? existing.shared.homeLatitude,
      homeLongitude: next.shared.homeLongitude ?? existing.shared.homeLongitude,
      topSkills: dedupeShallow([...existing.shared.topSkills, ...next.shared.topSkills]),
      certifications: dedupeShallow([
        ...existing.shared.certifications,
        ...next.shared.certifications,
      ]),
      expectedSalaryMin: next.shared.expectedSalaryMin ?? existing.shared.expectedSalaryMin,
      expectedSalaryMax: next.shared.expectedSalaryMax ?? existing.shared.expectedSalaryMax,
    },
  };
}

function dedupeShallow<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normaliseProfile(profile: WorkProfile): WorkProfile {
  const shared = profile.shared;
  const rawSalaryMin = clampNonNegative(shared.expectedSalaryMin);
  const rawSalaryMax = clampNonNegative(shared.expectedSalaryMax);
  const expectedSalaryMin =
    rawSalaryMin !== null && rawSalaryMax !== null
      ? Math.min(rawSalaryMin, rawSalaryMax)
      : rawSalaryMin;
  const expectedSalaryMax =
    rawSalaryMin !== null && rawSalaryMax !== null
      ? Math.max(rawSalaryMin, rawSalaryMax)
      : rawSalaryMax;
  return {
    shared: {
      fields: dedupe(shared.fields).filter((key): key is JobCategoryKey => isJobCategoryKey(key)),
      primaryRole: trimToNull(shared.primaryRole),
      yearsExperience: clampNonNegative(shared.yearsExperience),
      availability: AVAILABILITY_VALUES.includes(shared.availability as Availability)
        ? (shared.availability as Availability)
        : null,
      willingToTravelKm: clampNonNegative(shared.willingToTravelKm),
      homeAddress: trimToNull(shared.homeAddress),
      homeLatitude: clampCoordinate(shared.homeLatitude, -90, 90),
      homeLongitude: clampCoordinate(shared.homeLongitude, -180, 180),
      topSkills: cleanStringList(shared.topSkills),
      certifications: cleanStringList(shared.certifications),
      expectedSalaryMin,
      expectedSalaryMax,
    },
  };
}

function cleanStringList(values: string[] | null | undefined): string[] {
  if (!values || values.length === 0) return [];
  return dedupe(
    values.map((value) => String(value ?? "").trim()).filter((value) => value.length > 0),
  );
}

function trimToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
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

function clampCoordinate(
  value: number | null | undefined,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}
