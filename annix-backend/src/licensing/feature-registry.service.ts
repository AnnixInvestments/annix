import { Injectable } from "@nestjs/common";
import type {
  FeatureDefinition,
  ModuleLicensingDefinition,
  TierDefinition,
} from "./licensing.types";

@Injectable()
export class FeatureRegistry {
  private readonly modules = new Map<string, ModuleLicensingDefinition>();

  register(definition: ModuleLicensingDefinition): void {
    this.modules.set(definition.moduleKey, definition);
  }

  has(moduleKey: string): boolean {
    return this.modules.has(moduleKey);
  }

  module(moduleKey: string): ModuleLicensingDefinition {
    const definition = this.modules.get(moduleKey);
    if (!definition) {
      throw new Error(`No licensing definition registered for module "${moduleKey}"`);
    }
    return definition;
  }

  moduleKeys(): string[] {
    return Array.from(this.modules.keys());
  }

  features(moduleKey: string): FeatureDefinition[] {
    return this.module(moduleKey).features;
  }

  tiers(moduleKey: string): TierDefinition[] {
    return this.module(moduleKey).tiers;
  }

  feature(moduleKey: string, featureKey: string): FeatureDefinition | null {
    return this.module(moduleKey).features.find((feature) => feature.key === featureKey) ?? null;
  }

  tierIncludesFeature(moduleKey: string, tier: string, featureKey: string): boolean {
    const tierFeatures = this.module(moduleKey).tierFeatures[tier];
    if (!tierFeatures) {
      return false;
    }
    return tierFeatures.includes(featureKey);
  }
}
