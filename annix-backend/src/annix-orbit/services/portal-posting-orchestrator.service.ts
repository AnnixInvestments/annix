import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { JobPosting } from "../entities/job-posting.entity";
import {
  JobPostingPortalPosting,
  JobPostingPortalStatus,
} from "../entities/job-posting-portal-posting.entity";
import { JobPostingPortalPostingRepository } from "../repositories/job-posting-portal-posting.repository";
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
  ) {}

  async postToFreeAdapters(jobPosting: JobPosting): Promise<PortalOrchestratorRunSummary> {
    const adapters = this.dispatchable(jobPosting, this.registry.freeAdapters());
    return this.runAdapters(jobPosting, adapters);
  }

  async postToSelectedAdapters(
    jobPosting: JobPosting,
    portalCodes: string[],
  ): Promise<PortalOrchestratorRunSummary> {
    const adapters = portalCodes
      .map((code) => {
        const adapter = this.registry.byCode(code);
        if (!adapter) {
          this.logger.warn(
            `Job posting ${jobPosting.id} requested unknown portal "${code}"; skipping.`,
          );
        }
        return adapter;
      })
      .filter((adapter): adapter is PortalAdapter => adapter !== null);
    return this.runAdapters(jobPosting, this.dispatchable(jobPosting, adapters));
  }

  /**
   * Drop adapters that are scaffolded but not yet wired (available === false) so
   * we never call post() on a NotImplemented channel and record a misleading
   * failure/retry against it.
   */
  private dispatchable(jobPosting: JobPosting, adapters: PortalAdapter[]): PortalAdapter[] {
    return adapters.filter((adapter) => {
      if (adapter.available === false) {
        this.logger.log(
          `Skipping portal "${adapter.portalCode}" for job ${jobPosting.id}: channel not yet available.`,
        );
        return false;
      }
      return true;
    });
  }

  private async runAdapters(
    jobPosting: JobPosting,
    adapters: PortalAdapter[],
  ): Promise<PortalOrchestratorRunSummary> {
    if (adapters.length === 0) {
      this.logger.log(
        `No portal adapters configured for job posting ${jobPosting.id}; skipping portal distribution.`,
      );
      return { attempted: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.all(
      adapters.map((adapter) => this.runSingleAdapter(jobPosting, adapter)),
    );

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    this.logger.log(
      `Portal distribution for job ${jobPosting.id}: ${succeeded}/${results.length} succeeded.`,
    );

    return { attempted: results.length, succeeded, failed };
  }

  async runSingleAdapter(
    jobPosting: JobPosting,
    adapter: PortalAdapter,
  ): Promise<PortalPostingResult> {
    const existing = await this.portalPostingRepo.findByJobAndPortal(
      jobPosting.id,
      adapter.portalCode,
    );
    const record =
      existing ??
      (await this.portalPostingRepo.create({
        jobPostingId: jobPosting.id,
        portalCode: adapter.portalCode,
        status: JobPostingPortalStatus.PENDING,
      }));

    try {
      const result = await adapter.post(jobPosting);
      if (result.success) {
        const submittedForManual =
          result.outcome === "submitted" || result.requiresManualConfirmation === true;
        if (submittedForManual) {
          // Handed off (e.g. emailed for manual posting) — NOT live externally.
          // Never fabricate an external id or claim POSTED.
          record.status = JobPostingPortalStatus.SUBMITTED;
          record.postedAt = null;
          record.portalJobId = result.portalJobId ?? null;
          record.portalUrl = result.portalUrl ?? null;
        } else {
          record.status = JobPostingPortalStatus.POSTED;
          record.postedAt = now().toJSDate();
          record.portalJobId = result.portalJobId ?? null;
          record.portalUrl = result.portalUrl ?? null;
        }
        record.lastError = null;
        record.retryCount = 0;
        record.nextRetryAt = null;
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

  private applyFailure(record: JobPostingPortalPosting, message: string): void {
    const nextCount = record.retryCount + 1;
    record.lastError = message;
    record.retryCount = nextCount;
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
