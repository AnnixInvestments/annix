import { Injectable, Logger, NotImplementedException, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import { PortalAdapter, PortalCostTier, PortalPostingResult } from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

@Injectable()
export class IndeedPortalAdapter implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(IndeedPortalAdapter.name);

  readonly portalCode = "indeed";
  readonly displayName = "Indeed";
  readonly costTier: PortalCostTier = "freemium";

  constructor(private readonly registry: PortalAdapterRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async post(_jobPosting: JobPosting): Promise<PortalPostingResult> {
    throw new NotImplementedException(
      "Indeed integration requires partner approval / XML feed setup — not yet wired",
    );
  }
}
