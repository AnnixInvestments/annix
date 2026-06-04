import { Controller, Get } from "@nestjs/common";
import { OrbitTierCapabilityService } from "../services/orbit-tier-capability.service";

@Controller("annix-orbit/public/tier-plans")
export class PublicTierPlansController {
  constructor(private readonly tierCapabilityService: OrbitTierCapabilityService) {}

  @Get()
  async list() {
    return this.tierCapabilityService.list();
  }
}
