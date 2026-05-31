import { Injectable, NotFoundException } from "@nestjs/common";
import {
  OrbitTierCapability,
  type OrbitTierFeatures,
} from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";

export interface UpdateTierCapabilityInput {
  matchStrictness?: string;
  maxJobResults?: number | null;
  features?: Partial<OrbitTierFeatures>;
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
    return this.tierCapabilityRepo.save(existing);
  }
}
