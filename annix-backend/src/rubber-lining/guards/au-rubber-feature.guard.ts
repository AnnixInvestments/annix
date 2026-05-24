import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { LicensingService } from "../../licensing";
import { AU_RUBBER_MODULE_KEY } from "../config/au-rubber-licensing";
import { auRubberFeatureForPath } from "../config/au-rubber-route-features";

@Injectable()
export class AuRubberFeatureGuard implements CanActivate {
  constructor(private readonly licensingService: LicensingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path ?? request.url ?? "";
    const feature = auRubberFeatureForPath(path);
    if (!feature) {
      return true;
    }

    const roles: string[] = request.user?.roles ?? [];
    if (roles.includes("admin") || roles.includes("employee")) {
      return true;
    }

    const companyId = request.user ? Number(request.user.companyId) : null;
    if (!companyId || Number.isNaN(companyId)) {
      return true;
    }

    const licensed = await this.licensingService.isFeatureEnabled(
      companyId,
      AU_RUBBER_MODULE_KEY,
      feature,
    );
    if (!licensed) {
      throw new ForbiddenException(
        "Your plan does not include this feature. Please upgrade your plan to access it.",
      );
    }
    return true;
  }
}
