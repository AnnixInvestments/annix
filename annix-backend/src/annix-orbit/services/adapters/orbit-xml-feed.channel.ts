import { Injectable, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import { orbitPublicJobUrl } from "../../lib/public-job-url";
import {
  PortalAdapter,
  PortalCostTier,
  PortalPostingMode,
  PortalPostingResult,
} from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

/**
 * First-class feed channel for the Orbit jobs XML feed
 * (GET /annix-orbit/public/jobs.xml). Active jobs are already in the feed by
 * virtue of being ACTIVE, so publishing is a no-op that records IN_FEED — this
 * exists so the distribution UI can show the feed as a real, tracked channel.
 */
@Injectable()
export class OrbitXmlFeedChannel implements PortalAdapter, OnModuleInit {
  readonly portalCode = "orbit-xml-feed";
  readonly displayName = "Annix Orbit jobs feed";
  readonly costTier: PortalCostTier = "free";
  readonly postingMode: PortalPostingMode = "feed";

  constructor(private readonly registry: PortalAdapterRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  post(jobPosting: JobPosting): Promise<PortalPostingResult> {
    const url = jobPosting.referenceNumber ? orbitPublicJobUrl(jobPosting.referenceNumber) : null;
    return Promise.resolve({ success: true, outcome: "in_feed", portalUrl: url });
  }
}
