import { Controller, Get, UseGuards } from "@nestjs/common";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { PortalAdapterRegistry } from "../services/portal-adapter-registry.service";

interface PortalAdapterSummary {
  code: string;
  displayName: string;
  costTier: string;
  available: boolean;
}

@Controller("cv-assistant/portal-adapters")
@UseGuards(CvAssistantAuthGuard)
export class PortalAdaptersController {
  constructor(private readonly registry: PortalAdapterRegistry) {}

  @Get()
  async list(): Promise<PortalAdapterSummary[]> {
    return this.registry.all().map((adapter) => ({
      code: adapter.portalCode,
      displayName: adapter.displayName,
      costTier: adapter.costTier,
      available: adapter.costTier === "free",
    }));
  }
}
