import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { StockManagementFeatureKey } from "../config/stock-management-features.constants";
import { StockManagementLicenseService } from "../services/stock-management-license.service";
import { STOCK_MANAGEMENT_FEATURE_METADATA } from "./stock-management-feature.decorator";

@Injectable()
export class StockManagementFeatureGuard implements CanActivate {
  private readonly logger = new Logger(StockManagementFeatureGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: StockManagementLicenseService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<StockManagementFeatureKey | undefined>(
      STOCK_MANAGEMENT_FEATURE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.user ? Number(request.user.companyId) : null;
    if (!companyId || Number.isNaN(companyId)) {
      throw new ForbiddenException("Stock management feature requires an authenticated company");
    }

    const globalFlagKey = `STOCK_MGMT_${feature}`;
    const globalEnabled = await this.featureFlagsService.isEnabled(globalFlagKey);
    if (!globalEnabled) {
      this.logger.warn(
        `Global feature flag ${globalFlagKey} is disabled — request rejected for company ${companyId}`,
      );
      throw new ForbiddenException(`Stock management feature ${feature} is globally disabled`);
    }

    const licensed = await this.licenseService.isFeatureEnabled(companyId, feature);
    if (!licensed) {
      throw new ForbiddenException(
        `Stock management feature ${feature} is not enabled for this company's tier`,
      );
    }

    return true;
  }
}
