import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CatalogAddOn, CatalogTier, ModuleCatalog } from "./dto/module-catalog";
import type { AddOnOverride, TierPricingOverride } from "./entities/module-catalog-override.entity";
import { ModuleCatalogOverride } from "./entities/module-catalog-override.entity";
import { FeatureRegistry } from "./feature-registry.service";
import type { TierVisibility } from "./licensing.types";
import { ModuleCatalogOverrideRepository } from "./repositories/module-catalog-override.repository";

@Injectable()
export class LicensingCatalogService {
  constructor(
    private readonly registry: FeatureRegistry,
    private readonly overrideRepo: ModuleCatalogOverrideRepository,
  ) {}

  baseCatalog(moduleKey: string): ModuleCatalog {
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

  async effectiveCatalog(moduleKey: string): Promise<ModuleCatalog> {
    const base = this.baseCatalog(moduleKey);
    const override = await this.overrideRepo.findByModuleKey(moduleKey);
    if (!override) {
      return base;
    }
    const tiers = base.tiers.map((tier) =>
      this.applyTierOverride(
        tier,
        override.tierOverrides[tier.key],
        override.tierFeatures[tier.key],
      ),
    );
    const addOns = base.addOns.map((addOn) =>
      this.applyAddOnOverride(addOn, override.addOnOverrides[addOn.key]),
    );
    return { ...base, tiers, addOns };
  }

  async setTierPricing(
    moduleKey: string,
    tierKey: string,
    pricing: TierPricingOverride,
    updatedById: number | null,
  ): Promise<ModuleCatalog> {
    this.assertTier(moduleKey, tierKey);
    const override = await this.ensureOverride(moduleKey);
    override.tierOverrides = { ...override.tierOverrides, [tierKey]: pricing };
    override.updatedById = updatedById;
    await this.overrideRepo.save(override);
    return this.effectiveCatalog(moduleKey);
  }

  async setTierFeatures(
    moduleKey: string,
    tierKey: string,
    featureKeys: string[],
    updatedById: number | null,
  ): Promise<ModuleCatalog> {
    this.assertTier(moduleKey, tierKey);
    const validKeys = new Set(this.registry.features(moduleKey).map((feature) => feature.key));
    const selected = featureKeys.filter((key) => validKeys.has(key));
    this.assertFeatureDependencies(moduleKey, selected);
    const override = await this.ensureOverride(moduleKey);
    override.tierFeatures = { ...override.tierFeatures, [tierKey]: selected };
    override.updatedById = updatedById;
    await this.overrideRepo.save(override);
    return this.effectiveCatalog(moduleKey);
  }

  async setAddOn(
    moduleKey: string,
    addOnKey: string,
    addOn: AddOnOverride,
    updatedById: number | null,
  ): Promise<ModuleCatalog> {
    this.assertAddOn(moduleKey, addOnKey);
    const override = await this.ensureOverride(moduleKey);
    override.addOnOverrides = { ...override.addOnOverrides, [addOnKey]: addOn };
    override.updatedById = updatedById;
    await this.overrideRepo.save(override);
    return this.effectiveCatalog(moduleKey);
  }

  private applyTierOverride(
    tier: CatalogTier,
    pricing: TierPricingOverride | undefined,
    featureKeys: string[] | undefined,
  ): CatalogTier {
    const next: CatalogTier = { ...tier };
    if (Array.isArray(featureKeys)) {
      next.featureKeys = featureKeys;
    }
    if (!pricing) {
      return next;
    }
    if (typeof pricing.name === "string") {
      next.name = pricing.name;
    }
    if (typeof pricing.description === "string") {
      next.description = pricing.description;
    }
    if (typeof pricing.monthlyPriceCents === "number") {
      next.monthlyPriceCents = pricing.monthlyPriceCents;
    }
    if (typeof pricing.annualPriceCents === "number") {
      next.annualPriceCents = pricing.annualPriceCents;
    }
    if (typeof pricing.includedSeats === "number") {
      next.includedSeats = pricing.includedSeats;
    }
    if (typeof pricing.aiDocAllowance === "number") {
      next.aiDocAllowance = pricing.aiDocAllowance;
    }
    if (typeof pricing.visibility === "string") {
      next.visibility = pricing.visibility as TierVisibility;
    }
    return next;
  }

  private applyAddOnOverride(
    addOn: CatalogAddOn,
    override: AddOnOverride | undefined,
  ): CatalogAddOn {
    if (!override) {
      return addOn;
    }
    const next: CatalogAddOn = { ...addOn };
    if (typeof override.label === "string") {
      next.label = override.label;
    }
    if (typeof override.description === "string") {
      next.description = override.description;
    }
    if (typeof override.monthlyPriceCents === "number") {
      next.monthlyPriceCents = override.monthlyPriceCents;
    }
    if (typeof override.discountable === "boolean") {
      next.discountable = override.discountable;
    }
    return next;
  }

  private async ensureOverride(moduleKey: string): Promise<ModuleCatalogOverride> {
    const existing = await this.overrideRepo.findByModuleKey(moduleKey);
    if (existing) {
      return existing;
    }
    return this.overrideRepo.create({
      moduleKey,
      tierOverrides: {},
      tierFeatures: {},
      addOnOverrides: {},
    });
  }

  private assertTier(moduleKey: string, tierKey: string): void {
    const exists = this.registry.tiers(moduleKey).some((tier) => tier.key === tierKey);
    if (!exists) {
      throw new NotFoundException(`Tier "${tierKey}" is not defined for module "${moduleKey}"`);
    }
  }

  private assertAddOn(moduleKey: string, addOnKey: string): void {
    const addOns = this.registry.module(moduleKey).addOns ?? [];
    if (!addOns.some((addOn) => addOn.key === addOnKey)) {
      throw new NotFoundException(`Add-on "${addOnKey}" is not defined for module "${moduleKey}"`);
    }
  }

  private assertFeatureDependencies(moduleKey: string, selected: string[]): void {
    const selectedSet = new Set(selected);
    const features = this.registry.features(moduleKey);
    features
      .filter((feature) => selectedSet.has(feature.key) && Array.isArray(feature.requires))
      .forEach((feature) => {
        const missing = (feature.requires ?? []).filter((req) => !selectedSet.has(req));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Feature "${feature.key}" requires ${missing.join(", ")} to be included in the same tier.`,
          );
        }
      });
  }
}
