import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardDocument } from "../entities/job-card-document.entity";
import { JobCardDocumentRepository } from "./job-card-document.repository";

@Injectable()
export class PostgresJobCardDocumentRepository
  extends TypeOrmCrudRepository<JobCardDocument>
  implements JobCardDocumentRepository
{
  constructor(@InjectRepository(JobCardDocument) repository: Repository<JobCardDocument>) {
    super(repository);
  }

  findFirstForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument | null> {
    return this.repository.findOne({
      where: { jobCardId, companyId },
      order: { createdAt: "ASC" },
    });
  }

  findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  findForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
    });
  }
}
