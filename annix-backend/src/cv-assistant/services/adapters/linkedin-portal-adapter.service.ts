import { Injectable, Logger, NotImplementedException, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import { PortalAdapter, PortalCostTier, PortalPostingResult } from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

@Injectable()
export class LinkedInPortalAdapter implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(LinkedInPortalAdapter.name);

  readonly portalCode = "linkedin";
  readonly displayName = "LinkedIn";
  readonly costTier: PortalCostTier = "paid";

  constructor(private readonly registry: PortalAdapterRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async post(_jobPosting: JobPosting): Promise<PortalPostingResult> {
    throw new NotImplementedException("LinkedIn API requires partner approval — not yet wired");
  }
}
