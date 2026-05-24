import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import { FEATURE_LICENSE_METADATA, type FeatureLicenseRequirement } from "./feature.decorator";
import { FeatureRegistry } from "./feature-registry.service";
import { LicensingService } from "./licensing.service";

@Injectable()
export class FeatureLicenseGuard implements CanActivate {
  private readonly logger = new Logger(FeatureLicenseGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly licensingService: LicensingService,
    private readonly registry: FeatureRegistry,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<FeatureLicenseRequirement | undefined>(
      FEATURE_LICENSE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) {
      return true;
    }

    const { moduleKey, featureKey } = requirement;
    const request = context.switchToHttp().getRequest();
    const companyId = request.user ? Number(request.user.companyId) : null;
    if (!companyId || Number.isNaN(companyId)) {
      throw new ForbiddenException("This feature requires an authenticated company");
    }

    const feature = this.registry.feature(moduleKey, featureKey);
    if (feature?.globalFlag) {
      const globalEnabled = await this.featureFlagsService.isEnabled(feature.globalFlag);
      if (!globalEnabled) {
        this.logger.warn(
          `Global flag ${feature.globalFlag} disabled — ${moduleKey}/${featureKey} rejected for company ${companyId}`,
        );
        throw new ForbiddenException(`Feature ${featureKey} is globally disabled`);
      }
    }

    const licensed = await this.licensingService.isFeatureEnabled(companyId, moduleKey, featureKey);
    if (!licensed) {
      throw new ForbiddenException(
        "Your plan does not include this feature. Please upgrade your plan to access it.",
      );
    }

    return true;
  }
}
