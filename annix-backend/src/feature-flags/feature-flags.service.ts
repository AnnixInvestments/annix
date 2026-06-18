import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { FeatureFlag } from "./entities/feature-flag.entity";
import {
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_DESCRIPTIONS,
  FEATURE_FLAGS,
  FeatureFlagKey,
  PUBLIC_FEATURE_FLAGS,
} from "./feature-flags.constants";
import { FeatureFlagRepository } from "./feature-flags.repository";

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flagsByKeyCache: Map<string, FeatureFlag> | null = null;

  constructor(
    private readonly flagRepo: FeatureFlagRepository,
    private readonly configService: ConfigService,
  ) {}

  private invalidateCache(): void {
    this.flagsByKeyCache = null;
  }

  private async loadCache(): Promise<Map<string, FeatureFlag>> {
    if (this.flagsByKeyCache) {
      return this.flagsByKeyCache;
    }
    const flags = await this.flagRepo.findAllOrdered();
    const map = new Map(flags.map((f) => [f.flagKey, f]));
    this.flagsByKeyCache = map;
    return map;
  }

  async ensureFlags(): Promise<void> {
    const existing = await this.flagRepo.findAll();
    const existingKeys = new Set(existing.map((f) => f.flagKey));

    const missing = Object.values(FEATURE_FLAGS).filter((key) => !existingKeys.has(key));

    if (missing.length > 0) {
      await Promise.all(
        missing.map((key) => {
          const envValue = this.configService.get(`ENABLE_${key}`);
          const defaultValue = FEATURE_FLAG_DEFAULTS[key] ?? false;
          const enabled = envValue !== undefined ? envValue === "true" : defaultValue;
          return this.flagRepo.create({
            flagKey: key,
            enabled,
            description: FEATURE_FLAG_DESCRIPTIONS[key] || null,
          });
        }),
      );
      this.invalidateCache();
      this.logger.log(`Initialised feature flags: ${missing.join(", ")}`);
    }
  }

  async isEnabled(flagKey: FeatureFlagKey | string): Promise<boolean> {
    const map = await this.loadCache();
    const flag = map.get(flagKey);
    if (flag) {
      return flag.enabled;
    }
    return this.configService.get(`ENABLE_${flagKey}`) === "true";
  }

  async allFlags(): Promise<Record<string, boolean>> {
    await this.ensureFlags();
    const map = await this.loadCache();
    return Array.from(map.values()).reduce(
      (acc, flag) => ({ ...acc, [flag.flagKey]: flag.enabled }),
      {} as Record<string, boolean>,
    );
  }

  async publicFlags(): Promise<Record<string, boolean>> {
    const flags = await this.allFlags();
    return Object.entries(flags).reduce(
      (acc, [key, enabled]) =>
        PUBLIC_FEATURE_FLAGS.has(key as FeatureFlagKey) ? { ...acc, [key]: enabled } : acc,
      {} as Record<string, boolean>,
    );
  }

  async allFlagsDetailed(): Promise<
    Array<{ flagKey: string; enabled: boolean; description: string | null; category: string }>
  > {
    await this.ensureFlags();
    const map = await this.loadCache();
    return Array.from(map.values()).map((f) => ({
      flagKey: f.flagKey,
      enabled: f.enabled,
      description: f.description,
      category: FEATURE_FLAG_CATEGORIES[f.flagKey as FeatureFlagKey] || "system",
    }));
  }

  async updateFlag(
    flagKey: string,
    enabled: boolean,
  ): Promise<{
    flagKey: string;
    enabled: boolean;
    description: string | null;
  }> {
    const flag = await this.flagRepo.findByKey(flagKey);

    if (!flag) {
      throw new NotFoundException(`Feature flag '${flagKey}' not found`);
    }

    flag.enabled = enabled;
    const saved = await this.flagRepo.save(flag);
    this.invalidateCache();

    this.logger.log(`Feature flag '${flagKey}' ${enabled ? "enabled" : "disabled"}`);

    return {
      flagKey: saved.flagKey,
      enabled: saved.enabled,
      description: saved.description,
    };
  }
}
