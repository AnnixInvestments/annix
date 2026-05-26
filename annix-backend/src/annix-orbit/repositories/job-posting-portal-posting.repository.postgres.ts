import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  JobPostingPortalPosting,
  JobPostingPortalStatus,
} from "../entities/job-posting-portal-posting.entity";
import { JobPostingPortalPostingRepository } from "./job-posting-portal-posting.repository";

@Injectable()
export class PostgresJobPostingPortalPostingRepository
  extends TypeOrmCrudRepository<JobPostingPortalPosting>
  implements JobPostingPortalPostingRepository
{
  constructor(
    @InjectRepository(JobPostingPortalPosting)
    repository: Repository<JobPostingPortalPosting>,
  ) {
    super(repository);
  }

  findByJobAndPortal(
    jobPostingId: number,
    portalCode: string,
  ): Promise<JobPostingPortalPosting | null> {
    return this.repository.findOne({ where: { jobPostingId, portalCode } });
  }

  findRetryDue(now: Date, limit: number): Promise<JobPostingPortalPosting[]> {
    return this.repository.find({
      where: {
        status: JobPostingPortalStatus.FAILED,
        nextRetryAt: LessThanOrEqual(now),
      },
      take: limit,
      order: { nextRetryAt: "ASC" },
    });
  }
}
