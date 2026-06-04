import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DEFAULT_TIER_PRICING,
  OrbitTierCapability,
  type OrbitTierFeatures,
  type OrbitTierPricing,
} from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";

export interface UpdateTierCapabilityInput {
  matchStrictness?: string;
  maxJobResults?: number | null;
  monthlyNixRuns?: number | null;
  monthlyCvBuilds?: number | null;
  features?: Partial<OrbitTierFeatures>;
  pricing?: Partial<OrbitTierPricing>;
}

@Injectable()
export class OrbitTierCapabilityService {
  constructor(private readonly tierCapabilityRepo: OrbitTierCapabilityRepository) {}

  async list(): Promise<OrbitTierCapability[]> {
    return this.tierCapabilityRepo.findAllOrdered();
  }

  async updateForTier(
    tier: string,
    input: UpdateTierCapabilityInput,
  ): Promise<OrbitTierCapability> {
    const existing = await this.tierCapabilityRepo.findByTier(tier);
    if (!existing) {
      throw new NotFoundException(`Tier "${tier}" not found`);
    }
    const nextFeatures: OrbitTierFeatures = {
      ...existing.features,
      ...(input.features ?? {}),
    };
    existing.features = nextFeatures;
    if (input.matchStrictness !== undefined) {
      existing.matchStrictness = input.matchStrictness;
    }
    if (input.maxJobResults !== undefined) {
      existing.maxJobResults = input.maxJobResults;
    }
    if (input.monthlyNixRuns !== undefined) {
      existing.monthlyNixRuns = input.monthlyNixRuns;
    }
    if (input.monthlyCvBuilds !== undefined) {
      existing.monthlyCvBuilds = input.monthlyCvBuilds;
    }
    if (input.pricing !== undefined) {
      existing.pricing = {
        ...DEFAULT_TIER_PRICING,
        ...(existing.pricing ?? {}),
        ...input.pricing,
      };
    }
    return this.tierCapabilityRepo.save(existing);
  }
}
