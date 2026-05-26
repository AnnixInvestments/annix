import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { JobPostingPortalPostingRepository } from "../repositories/job-posting-portal-posting.repository";
import { PortalAdapterRegistry } from "./portal-adapter-registry.service";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

const RETRY_BATCH_SIZE = 25;

@Injectable()
export class PortalPostingRetryService {
  private readonly logger = new Logger(PortalPostingRetryService.name);

  constructor(
    private readonly portalPostingRepo: JobPostingPortalPostingRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly registry: PortalAdapterRegistry,
    private readonly orchestrator: PortalPostingOrchestrator,
  ) {}

  @Cron("0 */6 * * *", { name: "annix-orbit:retry-portal-postings" })
  async sweep(): Promise<{ retried: number; succeeded: number; stillFailed: number }> {
    const due = await this.portalPostingRepo.findRetryDue(now().toJSDate(), RETRY_BATCH_SIZE);

    if (due.length === 0) return { retried: 0, succeeded: 0, stillFailed: 0 };

    this.logger.log(`Retrying ${due.length} failed portal posting(s).`);

    let succeeded = 0;
    let stillFailed = 0;

    for (const record of due) {
      const adapter = this.registry.byCode(record.portalCode);
      if (!adapter) {
        this.logger.warn(
          `Skipping retry for portal posting ${record.id}: adapter "${record.portalCode}" no longer registered.`,
        );
        stillFailed += 1;
        continue;
      }

      const jobPosting = await this.jobPostingRepo.findById(record.jobPostingId);
      if (!jobPosting) {
        this.logger.warn(
          `Skipping retry for portal posting ${record.id}: job posting ${record.jobPostingId} no longer exists.`,
        );
        stillFailed += 1;
        continue;
      }

      const result = await this.orchestrator.runSingleAdapter(jobPosting, adapter);
      if (result.success) {
        succeeded += 1;
      } else {
        stillFailed += 1;
      }
    }

    this.logger.log(
      `Portal posting retry sweep complete: ${succeeded}/${due.length} succeeded, ${stillFailed} still failing.`,
    );

    return { retried: due.length, succeeded, stillFailed };
  }
}
