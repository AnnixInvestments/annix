import { Injectable } from "@nestjs/common";
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
  constructor(
    private readonly userRepo: UserRepository,
    private readonly licensingService: LicensingService,
    private readonly catalogService: LicensingCatalogService,
  ) {}

  async seatUsage(companyId: number, moduleKey: string): Promise<SeatUsage> {
    const license = await this.licensingService.ensureLicense(companyId, moduleKey);
    const catalog = await this.catalogService.effectiveCatalog(moduleKey);
    const tier = catalog.tiers.find((candidate) => candidate.key === license.tier);
    const includedSeats = tier ? tier.includedSeats : 0;
    const usedSeats = await this.userRepo.countByCompanyId(companyId);
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
}
