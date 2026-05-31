import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { RequireFeature } from "../../licensing/feature.decorator";
import { FeatureLicenseGuard } from "../../licensing/feature-license.guard";
import { ANNIX_ORBIT_FEATURES, ANNIX_ORBIT_MODULE_KEY } from "../config/annix-orbit-licensing";
import { ReferenceStatus } from "../entities/candidate-reference.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { ReferenceService } from "../services/reference.service";

@Controller("annix-orbit/references")
@UseGuards(AnnixOrbitAuthGuard, FeatureLicenseGuard)
@RequireFeature(ANNIX_ORBIT_MODULE_KEY, ANNIX_ORBIT_FEATURES.REFERENCE_CHECKS)
export class ReferencesController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  async findAll(@Request() req: { user: { companyId: number } }, @Query("status") status?: string) {
    const referenceStatus = status ? (status as ReferenceStatus) : undefined;
    return this.referenceService.referencesForCompany(req.user.companyId, referenceStatus);
  }

  @Get("pending")
  async pendingReferences(@Request() req: { user: { companyId: number } }) {
    return this.referenceService.referencesForCompany(
      req.user.companyId,
      ReferenceStatus.REQUESTED,
    );
  }

  @Get("completed")
  async completedReferences(@Request() req: { user: { companyId: number } }) {
    return this.referenceService.referencesForCompany(
      req.user.companyId,
      ReferenceStatus.RESPONDED,
    );
  }
}
