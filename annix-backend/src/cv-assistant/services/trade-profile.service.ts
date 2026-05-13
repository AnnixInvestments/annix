import {
  type Availability,
  type Commodity,
  emptyTradeProfile,
  type TradeKey,
  type TradeProfile,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Candidate } from "../entities/candidate.entity";

@Injectable()
export class TradeProfileService {
  private readonly logger = new Logger(TradeProfileService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
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
      candidates.map((c) => this.candidateRepo.update(c.id, { tradeProfile: normalised })),
    );
    return { saved: true, candidateIds: candidates.map((c) => c.id) };
  }

  private async candidatesForEmail(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.find({ where: { email } });
  }
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
