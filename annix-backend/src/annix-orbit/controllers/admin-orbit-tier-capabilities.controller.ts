import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import type { OrbitTierFeatures, OrbitTierPricing } from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityService } from "../services/orbit-tier-capability.service";

@Controller("admin/annix-orbit/tier-capabilities")
@UseGuards(AdminAuthGuard)
export class AdminOrbitTierCapabilitiesController {
  constructor(private readonly tierCapabilityService: OrbitTierCapabilityService) {}

  @Get()
  async list() {
    return this.tierCapabilityService.list();
  }

  @Put(":tier")
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
