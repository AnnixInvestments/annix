import { Injectable, Logger, NotImplementedException, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import { PortalAdapter, PortalCostTier, PortalPostingResult } from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

@Injectable()
export class FacebookPortalAdapter implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(FacebookPortalAdapter.name);

  readonly portalCode = "facebook";
  readonly displayName = "Facebook";
  readonly costTier: PortalCostTier = "freemium";

  constructor(private readonly registry: PortalAdapterRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async post(_jobPosting: JobPosting): Promise<PortalPostingResult> {
    throw new NotImplementedException(
      "Facebook Marketplace/Pages job posting integration requires Graph API permissions — not yet wired",
    );
  }
}
