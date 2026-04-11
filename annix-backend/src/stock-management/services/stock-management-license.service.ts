import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  STOCK_MANAGEMENT_FEATURES,
  STOCK_MANAGEMENT_TIER_FEATURES,
  type StockManagementFeatureKey,
  type StockManagementTier,
  tierIncludesFeature,
} from "../config/stock-management-features.constants";
import { CompanyModuleLicense } from "../entities/company-module-license.entity";

export interface StockManagementLicenseSnapshot {
  companyId: number;
  tier: StockManagementTier;
  features: Record<StockManagementFeatureKey, boolean>;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
}

const MODULE_KEY = "stock-management";

@Injectable()
export class StockManagementLicenseService {
  private readonly logger = new Logger(StockManagementLicenseService.name);

  constructor(
    @InjectRepository(CompanyModuleLicense)
    private readonly licenseRepo: Repository<CompanyModuleLicense>,
  ) {}

  async ensureLicense(companyId: number): Promise<CompanyModuleLicense> {
    const existing = await this.licenseRepo.findOne({
      where: { companyId, moduleKey: MODULE_KEY },
    });
    if (existing) {
      return existing;
    }
    const created = this.licenseRepo.create({
      companyId,
      moduleKey: MODULE_KEY,
      tier: "basic",
      featureOverrides: {},
      active: true,
    });
    return this.licenseRepo.save(created);
  }

  async snapshot(companyId: number): Promise<StockManagementLicenseSnapshot> {
    const license = await this.ensureLicense(companyId);
    const features = this.computeFeatures(license);
    return {
      companyId,
      tier: license.tier,
      features,
      active: this.isActive(license),
      validFrom: license.validFrom,
      validUntil: license.validUntil,
    };
  }

  async isFeatureEnabled(companyId: number, feature: StockManagementFeatureKey): Promise<boolean> {
    const license = await this.ensureLicense(companyId);
    if (!this.isActive(license)) {
      return false;
    }
    const override = license.featureOverrides ? license.featureOverrides[feature] : undefined;
    if (typeof override === "boolean") {
      return override;
    }
    return tierIncludesFeature(license.tier, feature);
  }

  async setTier(
    companyId: number,
    tier: StockManagementTier,
    notes?: string,
  ): Promise<CompanyModuleLicense> {
    const license = await this.ensureLicense(companyId);
    license.tier = tier;
    if (notes) {
      license.notes = notes;
    }
    const saved = await this.licenseRepo.save(license);
    this.logger.log(`Company ${companyId} stock-management tier set to ${tier}`);
    return saved;
  }

  async setFeatureOverride(
    companyId: number,
    feature: StockManagementFeatureKey,
    enabled: boolean | null,
  ): Promise<CompanyModuleLicense> {
    const license = await this.ensureLicense(companyId);
    const next = { ...(license.featureOverrides ?? {}) };
    if (enabled === null) {
      delete next[feature];
    } else {
      next[feature] = enabled;
    }
    license.featureOverrides = next;
    return this.licenseRepo.save(license);
  }

  async setValidity(
    companyId: number,
    validFrom: Date | null,
    validUntil: Date | null,
  ): Promise<CompanyModuleLicense> {
    const license = await this.ensureLicense(companyId);
    license.validFrom = validFrom;
    license.validUntil = validUntil;
    return this.licenseRepo.save(license);
  }

  async setActive(companyId: number, active: boolean): Promise<CompanyModuleLicense> {
    const license = await this.ensureLicense(companyId);
    license.active = active;
    return this.licenseRepo.save(license);
  }

  private isActive(license: CompanyModuleLicense): boolean {
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

  private computeFeatures(
    license: CompanyModuleLicense,
  ): Record<StockManagementFeatureKey, boolean> {
    const tierFeatures = STOCK_MANAGEMENT_TIER_FEATURES[license.tier];
    const tierSet = new Set(tierFeatures);
    const overrides = license.featureOverrides ?? {};
    const allKeys = Object.values(STOCK_MANAGEMENT_FEATURES) as StockManagementFeatureKey[];
    return allKeys.reduce(
      (acc, key) => {
        const override = overrides[key];
        const fromTier = tierSet.has(key);
        acc[key] = typeof override === "boolean" ? override : fromTier;
        return acc;
      },
      {} as Record<StockManagementFeatureKey, boolean>,
    );
  }
}
