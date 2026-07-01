import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import {
  DEFAULT_PAID_CHANNEL_LIMITS,
  JobChannelRateLimiter,
} from "../../lib/job-channel-rate-limiter";
import { JobPosting } from "../entities/job-posting.entity";
import {
  JobPostingPortalPosting,
  type JobPostingPortalSkipReason,
  JobPostingPortalStatus,
} from "../entities/job-posting-portal-posting.entity";
import { JobPostingPortalPostingRepository } from "../repositories/job-posting-portal-posting.repository";
import { JobChannelCostGuard } from "./job-channel-cost-guard.service";
import { PortalAdapter, PortalPostingResult } from "./portal-adapter.interface";
import { PortalAdapterRegistry } from "./portal-adapter-registry.service";

export interface PortalOrchestratorRunSummary {
  attempted: number;
  succeeded: number;
  failed: number;
}

export const PORTAL_POSTING_BACKOFF_HOURS = [1, 6, 24, 72] as const;
export const PORTAL_POSTING_MAX_RETRIES = PORTAL_POSTING_BACKOFF_HOURS.length;

export function nextRetryAtFromCount(retryCount: number): Date | null {
  if (retryCount >= PORTAL_POSTING_BACKOFF_HOURS.length) return null;
  const hours = PORTAL_POSTING_BACKOFF_HOURS[retryCount];
  return now().plus({ hours }).toJSDate();
}

@Injectable()
export class PortalPostingOrchestrator {
  private readonly logger = new Logger(PortalPostingOrchestrator.name);

  constructor(
    private readonly registry: PortalAdapterRegistry,
    private readonly portalPostingRepo: JobPostingPortalPostingRepository,
    private readonly costGuard: JobChannelCostGuard,
    private readonly rateLimiter: JobChannelRateLimiter,
  ) {}

  /**
   * Distribute a job to its target channels. Targets = the job's
   * enabledPortalCodes if set, else the default free auto-dispatch channels.
   *
   * A PENDING row is pre-created synchronously for every target so distribution
   * status is immediately queryable. Then: unknown codes are recorded
   * SKIPPED('unknown_channel'); unavailable channels are skipped; assisted
   * channels stay PENDING (a human completes them via the distribution UI); and
   * feed/api channels are dispatched.
   */
  async distribute(jobPosting: JobPosting): Promise<PortalOrchestratorRunSummary> {
    // The free auto channels (own careers page + Google for Jobs + jobs feed)
    // ALWAYS run for a live job — that's the baseline reach. enabledPortalCodes
    // ADD extra channels (e.g. an assisted board, or a paid channel opted into).
    const defaultCodes = this.registry.defaultAutoChannels().map((channel) => channel.portalCode);
    const enabled = jobPosting.enabledPortalCodes ?? [];
    const codes = Array.from(new Set([...defaultCodes, ...enabled]));

    const toDispatch: PortalAdapter[] = [];
    for (const code of codes) {
      const channel = this.registry.byCode(code);
      if (!channel) {
        this.logger.warn(
          `Job ${jobPosting.id} requested unknown channel "${code}"; recording SKIPPED.`,
        );
        await this.recordSkipped(jobPosting, code, "unknown_channel");
        continue;
      }
      if (channel.available === false) {
        this.logger.log(`Channel "${code}" not available for job ${jobPosting.id}; skipping.`);
        continue;
      }
      // Paid channels are opt-in (they're only here because they're in
      // enabledPortalCodes) AND budget-gated: refuse if this month's spend
      // would exceed the ceiling (or no ceiling is configured).
      if (channel.costTier === "paid") {
        const overBudget = await this.costGuard.wouldExceedBudget(
          jobPosting.companyId,
          channel.portalCode,
        );
        if (overBudget) {
          await this.recordSkipped(jobPosting, channel.portalCode, "budget");
          continue;
        }
      }
      await this.ensurePendingRow(jobPosting, channel.portalCode);
      if (channel.postingMode !== "assisted") {
        toDispatch.push(channel);
      }
    }

    if (toDispatch.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.all(
      toDispatch.map((channel) => this.runSingleAdapter(jobPosting, channel)),
    );
    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;
    this.logger.log(
      `Distribution for job ${jobPosting.id}: ${succeeded}/${results.length} dispatched successfully.`,
    );
    return { attempted: results.length, succeeded, failed };
  }

  async runSingleAdapter(
    jobPosting: JobPosting,
    adapter: PortalAdapter,
  ): Promise<PortalPostingResult> {
    const record = await this.ensurePendingRow(jobPosting, adapter.portalCode);
    try {
      if (adapter.costTier === "paid") {
        // Throttle outbound paid calls per (channel, company). Throws on the
        // daily cap → caught below and recorded as a retryable failure.
        await this.rateLimiter.acquire(
          `${adapter.portalCode}:${jobPosting.companyId}`,
          DEFAULT_PAID_CHANNEL_LIMITS,
        );
      }
      const result = await adapter.post(jobPosting);
      if (result.success) {
        this.applySuccess(record, result);
      } else {
        this.applyFailure(
          record,
          result.error ?? "Adapter reported failure with no error message.",
        );
      }
      await this.portalPostingRepo.save(record);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.applyFailure(record, message);
      await this.portalPostingRepo.save(record);
      this.logger.error(
        `Portal adapter "${adapter.portalCode}" threw while posting job ${jobPosting.id}: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  private async ensurePendingRow(
    jobPosting: JobPosting,
    portalCode: string,
  ): Promise<JobPostingPortalPosting> {
    const existing = await this.portalPostingRepo.findByJobAndPortal(jobPosting.id, portalCode);
    if (existing) return existing;
    return this.portalPostingRepo.create({
      jobPostingId: jobPosting.id,
      companyId: jobPosting.companyId ?? null,
      portalCode,
      status: JobPostingPortalStatus.PENDING,
      retryCount: 0,
    });
  }

  private async recordSkipped(
    jobPosting: JobPosting,
    portalCode: string,
    reason: JobPostingPortalSkipReason,
  ): Promise<void> {
    const record = await this.ensurePendingRow(jobPosting, portalCode);
    record.status = JobPostingPortalStatus.SKIPPED;
    record.skipReason = reason;
    await this.portalPostingRepo.save(record);
  }

  private applySuccess(record: JobPostingPortalPosting, result: PortalPostingResult): void {
    record.lastError = null;
    record.retryCount = 0;
    record.nextRetryAt = null;
    record.portalUrl = result.portalUrl ?? record.portalUrl ?? null;
    if (result.cost !== undefined) {
      record.cost = result.cost;
    }
    const outcome = result.outcome ?? "posted";
    if (outcome === "in_feed") {
      record.status = JobPostingPortalStatus.IN_FEED;
      record.postedAt = null;
      record.skipReason = null;
    } else if (outcome === "submitted" || result.requiresManualConfirmation === true) {
      // Handed off for manual posting — NOT live externally; never fabricate an id.
      record.status = JobPostingPortalStatus.SUBMITTED;
      record.postedAt = null;
      record.portalJobId = result.portalJobId ?? null;
      record.skipReason = null;
    } else if (outcome === "skipped") {
      record.status = JobPostingPortalStatus.SKIPPED;
      record.skipReason = result.skipReason ?? null;
    } else {
      record.status = JobPostingPortalStatus.POSTED;
      record.postedAt = now().toJSDate();
      record.portalJobId = result.portalJobId ?? null;
      record.skipReason = null;
    }
  }

  private applyFailure(record: JobPostingPortalPosting, message: string): void {
    const nextCount = record.retryCount + 1;
    record.lastError = message;
    record.retryCount = nextCount;
    record.skipReason = null;
    const nextAt = nextRetryAtFromCount(nextCount);
    if (nextAt === null) {
      record.status = JobPostingPortalStatus.ABANDONED;
      record.nextRetryAt = null;
    } else {
      record.status = JobPostingPortalStatus.FAILED;
      record.nextRetryAt = nextAt;
    }
  }
}
