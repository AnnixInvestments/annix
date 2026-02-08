import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { FeatureFlag } from "./entities/feature-flag.entity";
import {
  FEATURE_FLAG_DESCRIPTIONS,
  FEATURE_FLAGS,
  FeatureFlagKey,
} from "./feature-flags.constants";

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
    private readonly configService: ConfigService,
  ) {}

  async ensureFlags(): Promise<void> {
    const existing = await this.flagRepo.find();
    const existingKeys = new Set(existing.map((f) => f.flagKey));

    const missing = Object.values(FEATURE_FLAGS).filter((key) => !existingKeys.has(key));

    if (missing.length > 0) {
      const newFlags = missing.map((key) =>
        this.flagRepo.create({
          flagKey: key,
          enabled: this.configService.get(`ENABLE_${key}`) === "true",
          description: FEATURE_FLAG_DESCRIPTIONS[key] || null,
        }),
      );
      await this.flagRepo.save(newFlags);
      this.logger.log(`Initialised feature flags: ${missing.join(", ")}`);
    }
  }

  isEnabled(flagKey: FeatureFlagKey | string): Promise<boolean> {
    return this.flagRepo.findOne({ where: { flagKey } }).then((flag) => {
      if (flag) {
        return flag.enabled;
      }
      return this.configService.get(`ENABLE_${flagKey}`) === "true";
    });
  }

  async allFlags(): Promise<Record<string, boolean>> {
    await this.ensureFlags();
    const flags = await this.flagRepo.find();
    return flags.reduce(
      (acc, flag) => ({ ...acc, [flag.flagKey]: flag.enabled }),
      {} as Record<string, boolean>,
    );
  }

  async allFlagsDetailed(): Promise<
    Array<{ flagKey: string; enabled: boolean; description: string | null }>
  > {
    await this.ensureFlags();
    const flags = await this.flagRepo.find({ order: { flagKey: "ASC" } });
    return flags.map((f) => ({
      flagKey: f.flagKey,
      enabled: f.enabled,
      description: f.description,
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
    const flag = await this.flagRepo.findOne({ where: { flagKey } });

    if (!flag) {
      throw new NotFoundException(`Feature flag '${flagKey}' not found`);
    }

    flag.enabled = enabled;
    const saved = await this.flagRepo.save(flag);

    this.logger.log(`Feature flag '${flagKey}' ${enabled ? "enabled" : "disabled"}`);

    return {
      flagKey: saved.flagKey,
      enabled: saved.enabled,
      description: saved.description,
    };
  }
}
