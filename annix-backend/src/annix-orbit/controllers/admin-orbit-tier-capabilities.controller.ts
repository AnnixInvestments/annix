import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import type { OrbitTierFeatures, OrbitTierPricing } from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityService } from "../services/orbit-tier-capability.service";

@Controller("admin/annix-orbit/tier-capabilities")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitTierCapabilitiesController {
  constructor(private readonly tierCapabilityService: OrbitTierCapabilityService) {}

  @Get()
  @Roles("admin")
  async list() {
    return this.tierCapabilityService.list();
  }

  @Put(":tier")
  @Roles("admin")
  async update(
    @Param("tier") tier: string,
    @Body()
    body: {
      matchStrictness?: string;
      maxJobResults?: number | null;
      monthlyNixRuns?: number | null;
      monthlyCvBuilds?: number | null;
      features?: Partial<OrbitTierFeatures>;
      pricing?: Partial<OrbitTierPricing>;
    },
  ) {
    return this.tierCapabilityService.updateForTier(tier, body);
  }
}
