import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import { orbitPublicJobUrl } from "../../lib/public-job-url";
import { GoogleIndexingClient } from "../google-indexing.client";
import {
  PortalAdapter,
  PortalCostTier,
  PortalPostingMode,
  PortalPostingResult,
} from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

/**
 * First-class feed channel for Google for Jobs. Publishing ensures the public
 * job page is discoverable (server-rendered JSON-LD + sitemap) and pings the
 * Indexing API to accelerate crawling. The job is in the feed regardless of the
 * ping outcome, so this records IN_FEED.
 */
@Injectable()
export class GoogleForJobsChannel implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(GoogleForJobsChannel.name);

  readonly portalCode = "google-for-jobs";
  readonly displayName = "Google for Jobs";
  readonly costTier: PortalCostTier = "free";
  readonly postingMode: PortalPostingMode = "feed";

  constructor(
    private readonly registry: PortalAdapterRegistry,
    private readonly indexing: GoogleIndexingClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async post(jobPosting: JobPosting): Promise<PortalPostingResult> {
    if (!jobPosting.referenceNumber) {
      return { success: false, error: "Job has no reference number; cannot build a public URL." };
    }
    const url = orbitPublicJobUrl(jobPosting.referenceNumber);
    await this.indexing.notifyUpdated(url);
    return { success: true, outcome: "in_feed", portalUrl: url };
  }
}
