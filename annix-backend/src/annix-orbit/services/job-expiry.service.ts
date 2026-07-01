import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { JobPostingService } from "./job-posting.service";

const EXPIRY_BATCH_SIZE = 200;

/**
 * Auto-closes ACTIVE adverts that have passed their expiryDate. Leaving expired
 * roles indexed risks Google for Jobs manual-action penalties and keeps
 * collecting CVs against a dead role (POPIA), so each expired job is marked
 * EXPIRED and de-indexed (Indexing-API URL_DELETED + distribution rows UNPOSTED).
 */
@Injectable()
export class JobExpiryService {
  private readonly logger = new Logger(JobExpiryService.name);

  constructor(
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly jobPostingService: JobPostingService,
  ) {}

  @Cron("0 */6 * * *", { name: "annix-orbit:expire-stale-jobs" })
  async sweep(): Promise<{ expired: number }> {
    const due = await this.jobPostingRepo.findActiveExpired(now().toJSDate(), EXPIRY_BATCH_SIZE);
    if (due.length === 0) return { expired: 0 };

    this.logger.log(`Expiring ${due.length} stale job posting(s).`);

    let expired = 0;
    for (const job of due) {
      job.status = JobPostingStatus.EXPIRED;
      await this.jobPostingRepo.save(job);
      await this.jobPostingService.deindexAndUnpost(job);
      expired += 1;
    }

    this.logger.log(`Job expiry sweep complete: ${expired} expired.`);
    return { expired };
  }
}
