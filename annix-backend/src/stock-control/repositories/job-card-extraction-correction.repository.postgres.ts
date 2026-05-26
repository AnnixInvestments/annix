import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardExtractionCorrectionRepository } from "./job-card-extraction-correction.repository";

@Injectable()
export class PostgresJobCardExtractionCorrectionRepository
  extends TypeOrmCrudRepository<JobCardExtractionCorrection>
  implements JobCardExtractionCorrectionRepository
{
  constructor(
    @InjectRepository(JobCardExtractionCorrection)
    repository: Repository<JobCardExtractionCorrection>,
  ) {
    super(repository);
  }

  findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardExtractionCorrection[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  findRecentForCustomer(
    companyId: number,
    customerName: string,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]> {
    return this.repository.find({
      where: { companyId, customerName },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  findRecentForCompany(companyId: number, limit: number): Promise<JobCardExtractionCorrection[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
