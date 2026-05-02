import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobPosting } from "../entities/job-posting.entity";
import {
  JobPostingPortalPosting,
  JobPostingPortalStatus,
} from "../entities/job-posting-portal-posting.entity";
import { PortalAdapterRegistry } from "./portal-adapter-registry.service";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

const RETRY_BATCH_SIZE = 25;

@Injectable()
export class PortalPostingRetryService {
  private readonly logger = new Logger(PortalPostingRetryService.name);

  constructor(
    @InjectRepository(JobPostingPortalPosting)
    private readonly portalPostingRepo: Repository<JobPostingPortalPosting>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    private readonly registry: PortalAdapterRegistry,
    private readonly orchestrator: PortalPostingOrchestrator,
  ) {}

  @Cron("0 */6 * * *", { name: "cv-assistant:retry-portal-postings" })
  async sweep(): Promise<{ retried: number; succeeded: number; stillFailed: number }> {
    const due = await this.portalPostingRepo.find({
      where: {
        status: JobPostingPortalStatus.FAILED,
        nextRetryAt: LessThanOrEqual(now().toJSDate()),
      },
      take: RETRY_BATCH_SIZE,
      order: { nextRetryAt: "ASC" },
    });

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

      const jobPosting = await this.jobPostingRepo.findOne({ where: { id: record.jobPostingId } });
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
