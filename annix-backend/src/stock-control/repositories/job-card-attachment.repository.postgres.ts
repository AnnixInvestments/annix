import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import { JobCardAttachmentRepository } from "./job-card-attachment.repository";

@Injectable()
export class PostgresJobCardAttachmentRepository
  extends TypeOrmCrudRepository<JobCardAttachment>
  implements JobCardAttachmentRepository
{
  constructor(
    @InjectRepository(JobCardAttachment)
    repository: Repository<JobCardAttachment>,
  ) {
    super(repository);
  }

  findForJobCard(jobCardId: number, companyId: number): Promise<JobCardAttachment[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  findOneForJobCard(
    attachmentId: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardAttachment | null> {
    return this.repository.findOne({
      where: { id: attachmentId, jobCardId, companyId },
    });
  }

  findExtractableForJobCard(
    jobCardId: number,
    companyId: number,
    statuses: ExtractionStatus[],
  ): Promise<JobCardAttachment[]> {
    return this.repository.find({
      where: {
        jobCardId,
        companyId,
        extractionStatus: In(statuses),
      },
    });
  }

  async updateMany(ids: number[], changes: DeepPartial<JobCardAttachment>): Promise<void> {
    await this.repository.update(ids, changes as QueryDeepPartialEntity<JobCardAttachment>);
  }

  saveMany(entities: JobCardAttachment[]): Promise<JobCardAttachment[]> {
    return this.repository.save(entities);
  }
}
