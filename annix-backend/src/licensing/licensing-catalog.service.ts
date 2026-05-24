import { Injectable, NotFoundException } from "@nestjs/common";
import type { ModuleCatalog } from "./dto/module-catalog";
import { FeatureRegistry } from "./feature-registry.service";

@Injectable()
export class LicensingCatalogService {
  constructor(private readonly registry: FeatureRegistry) {}

  catalog(moduleKey: string): ModuleCatalog {
    if (!this.registry.has(moduleKey)) {
      throw new NotFoundException(`No licensing catalog for module "${moduleKey}"`);
    }
    const definition = this.registry.module(moduleKey);
    const tiers = [...definition.tiers]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((tier) => ({
        key: tier.key,
        name: tier.name,
        description: tier.description,
        rank: tier.rank,
        monthlyPriceCents: tier.monthlyPriceCents,
        annualPriceCents: tier.annualPriceCents,
        includedSeats: tier.includedSeats,
        aiDocAllowance: tier.aiDocAllowance,
        visibility: tier.visibility,
        displayOrder: tier.displayOrder,
        featureKeys: definition.tierFeatures[tier.key] ?? [],
      }));
    const features = [...definition.features]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((feature) => ({
        key: feature.key,
        label: feature.label,
        description: feature.description,
        category: feature.category,
        displayOrder: feature.displayOrder,
      }));
    const addOns = (definition.addOns ?? []).map((addOn) => ({
      key: addOn.key,
      label: addOn.label,
      description: addOn.description,
      monthlyPriceCents: addOn.monthlyPriceCents,
      discountable: addOn.discountable,
      requiresFeature: addOn.requiresFeature ?? null,
    }));
    return { moduleKey, defaultTier: definition.defaultTier, tiers, features, addOns };
  }
}
