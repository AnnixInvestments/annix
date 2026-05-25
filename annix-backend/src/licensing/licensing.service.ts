import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../lib/datetime";
import { ModuleCatalogOverride } from "./entities/module-catalog-override.entity";
import { ModuleLicense } from "./entities/module-license.entity";
import { FeatureRegistry } from "./feature-registry.service";
import type { LicenseSnapshot } from "./licensing.types";

@Injectable()
export class LicensingService {
  private readonly logger = new Logger(LicensingService.name);

  constructor(
    @InjectRepository(ModuleLicense)
    private readonly licenseRepo: Repository<ModuleLicense>,
    @InjectRepository(ModuleCatalogOverride)
    private readonly overrideRepo: Repository<ModuleCatalogOverride>,
    private readonly registry: FeatureRegistry,
  ) {}

  async ensureLicense(companyId: number, moduleKey: string): Promise<ModuleLicense> {
    const existing = await this.licenseRepo.findOne({ where: { companyId, moduleKey } });
    if (existing) {
      return existing;
    }
    const definition = this.registry.module(moduleKey);
    const created = this.licenseRepo.create({
      companyId,
      moduleKey,
      tier: definition.defaultTier,
      featureOverrides: {},
      active: true,
    });
    return this.licenseRepo.save(created);
  }

  async isFeatureEnabled(
    companyId: number,
    moduleKey: string,
    featureKey: string,
  ): Promise<boolean> {
    const license = await this.ensureLicense(companyId, moduleKey);
    if (!this.isActive(license)) {
      return false;
    }
    const override = license.featureOverrides ? license.featureOverrides[featureKey] : undefined;
    if (typeof override === "boolean") {
      return override;
    }
    return this.effectiveTierIncludesFeature(moduleKey, license.tier, featureKey);
  }

  private async effectiveTierIncludesFeature(
    moduleKey: string,
    tier: string,
    featureKey: string,
  ): Promise<boolean> {
    const catalogOverride = await this.overrideRepo.findOne({ where: { moduleKey } });
    const tierFeatures = catalogOverride ? catalogOverride.tierFeatures[tier] : undefined;
    if (Array.isArray(tierFeatures)) {
      return tierFeatures.includes(featureKey);
    }
    return this.registry.tierIncludesFeature(moduleKey, tier, featureKey);
  }

  async snapshot(companyId: number, moduleKey: string): Promise<LicenseSnapshot> {
    const license = await this.ensureLicense(companyId, moduleKey);
    const features = this.computeFeatures(license, moduleKey);
    return {
      companyId,
      moduleKey,
      tier: license.tier,
      features,
      active: this.isActive(license),
      validFrom: license.validFrom,
      validUntil: license.validUntil,
    };
  }

  async setTier(
    companyId: number,
    moduleKey: string,
    tier: string,
    notes?: string,
  ): Promise<ModuleLicense> {
    this.assertTier(moduleKey, tier);
    const license = await this.ensureLicense(companyId, moduleKey);
    license.tier = tier;
    if (notes) {
      license.notes = notes;
    }
    const saved = await this.licenseRepo.save(license);
    this.logger.log(`Company ${companyId} ${moduleKey} tier set to ${tier}`);
    return saved;
  }

  async setFeatureOverride(
    companyId: number,
    moduleKey: string,
    featureKey: string,
    enabled: boolean | null,
  ): Promise<ModuleLicense> {
    const license = await this.ensureLicense(companyId, moduleKey);
    const next = { ...(license.featureOverrides ?? {}) };
    if (enabled === null) {
      delete next[featureKey];
    } else {
      next[featureKey] = enabled;
    }
    license.featureOverrides = next;
    return this.licenseRepo.save(license);
  }

  async setValidity(
    companyId: number,
    moduleKey: string,
    validFrom: Date | null,
    validUntil: Date | null,
  ): Promise<ModuleLicense> {
    const license = await this.ensureLicense(companyId, moduleKey);
    license.validFrom = validFrom;
    license.validUntil = validUntil;
    return this.licenseRepo.save(license);
  }

  async setActive(companyId: number, moduleKey: string, active: boolean): Promise<ModuleLicense> {
    const license = await this.ensureLicense(companyId, moduleKey);
    license.active = active;
    return this.licenseRepo.save(license);
  }

  private assertTier(moduleKey: string, tier: string): void {
    const exists = this.registry.tiers(moduleKey).some((definition) => definition.key === tier);
    if (!exists) {
      throw new Error(`Tier "${tier}" is not defined for module "${moduleKey}"`);
    }
  }

  private isActive(license: ModuleLicense): boolean {
    if (!license.active) {
      return false;
    }
    const current = now().toJSDate();
    if (license.validFrom && license.validFrom > current) {
      return false;
    }
    if (license.validUntil && license.validUntil < current) {
      return false;
    }
    return true;
  }

  private computeFeatures(license: ModuleLicense, moduleKey: string): Record<string, boolean> {
    const overrides = license.featureOverrides ?? {};
    return this.registry.features(moduleKey).reduce(
      (acc, feature) => {
        const override = overrides[feature.key];
        const fromTier = this.registry.tierIncludesFeature(moduleKey, license.tier, feature.key);
        acc[feature.key] = typeof override === "boolean" ? override : fromTier;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }
}
