import { Injectable, Logger } from "@nestjs/common";
import { AppRepository } from "../rbac/rbac.repository";
import { UserRepository } from "../user/user.repository";
import { LicensingService } from "./licensing.service";
import { LicensingCatalogService } from "./licensing-catalog.service";

export interface SeatUsage {
  companyId: number;
  moduleKey: string;
  tier: string;
  usedSeats: number;
  includedSeats: number;
  withinLimit: boolean;
  overageSeats: number;
}

@Injectable()
export class LicensingSeatService {
  private readonly logger = new Logger(LicensingSeatService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly licensingService: LicensingService,
    private readonly catalogService: LicensingCatalogService,
    private readonly appRepo: AppRepository,
  ) {}

  async seatUsage(companyId: number, moduleKey: string): Promise<SeatUsage> {
    const license = await this.licensingService.ensureLicense(companyId, moduleKey);
    const catalog = await this.catalogService.effectiveCatalog(moduleKey);
    const tier = catalog.tiers.find((candidate) => candidate.key === license.tier);
    const includedSeats = tier ? tier.includedSeats : 0;
    const usedSeats = await this.entitledSeatCount(companyId, moduleKey);
    const overageSeats = Math.max(0, usedSeats - includedSeats);
    return {
      companyId,
      moduleKey,
      tier: license.tier,
      usedSeats,
      includedSeats,
      withinLimit: overageSeats === 0,
      overageSeats,
    };
  }

  // Count only company users entitled to this module's app (#406 lg-4), not
  // every company user — otherwise a company on multiple apps inflates every
  // module's seat count (mis-billing / false cap breaches). Falls back to the
  // whole-company count only if the module has no corresponding rbac App.
  private async entitledSeatCount(companyId: number, moduleKey: string): Promise<number> {
    const app = await this.appRepo.findByCode(moduleKey);
    if (!app) {
      this.logger.warn(
        `No rbac App for module "${moduleKey}" — seat count falls back to all company users`,
      );
      return this.userRepo.countByCompanyId(companyId);
    }
    return this.userRepo.countByCompanyAndApp(companyId, app.id);
  }
}
