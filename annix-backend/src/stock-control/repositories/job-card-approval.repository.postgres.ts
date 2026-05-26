import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardApprovalRepository } from "./job-card-approval.repository";

@Injectable()
export class PostgresJobCardApprovalRepository
  extends TypeOrmCrudRepository<JobCardApproval>
  implements JobCardApprovalRepository
{
  constructor(@InjectRepository(JobCardApproval) repository: Repository<JobCardApproval>) {
    super(repository);
  }

  findForJobCardOrdered(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "ASC" },
    });
  }

  findForJobCardWithApprovedBy(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      relations: ["approvedBy"],
      order: { createdAt: "ASC" },
    });
  }

  findLatestForStep(
    companyId: number,
    jobCardId: number,
    step: string,
  ): Promise<JobCardApproval | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId, step },
      order: { approvedAt: "DESC" },
    });
  }

  async deleteForJobCard(companyId: number, jobCardId: number): Promise<void> {
    await this.repository.delete({ jobCardId, companyId });
  }

  countByStatus(companyId: number, status: ApprovalStatus): Promise<number> {
    return this.repository.count({ where: { companyId, status } });
  }

  async rejectPendingStep(
    jobCardId: number,
    step: string,
    changes: DeepPartial<JobCardApproval>,
  ): Promise<void> {
    await this.repository.update(
      { jobCardId, step, status: ApprovalStatus.PENDING },
      changes as QueryDeepPartialEntity<JobCardApproval>,
    );
  }
}
