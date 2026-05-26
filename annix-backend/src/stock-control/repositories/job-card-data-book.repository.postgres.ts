import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { JobCardDataBookRepository } from "./job-card-data-book.repository";

@Injectable()
export class PostgresJobCardDataBookRepository
  extends TypeOrmCrudRepository<JobCardDataBook>
  implements JobCardDataBookRepository
{
  constructor(@InjectRepository(JobCardDataBook) repository: Repository<JobCardDataBook>) {
    super(repository);
  }

  findLatestForJobCard(companyId: number, jobCardId: number): Promise<JobCardDataBook | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });
  }

  findForJobCardIds(companyId: number, jobCardIds: number[]): Promise<JobCardDataBook[]> {
    return this.repository
      .createQueryBuilder("db")
      .where("db.companyId = :companyId", { companyId })
      .andWhere("db.jobCardId IN (:...jobCardIds)", { jobCardIds })
      .getMany();
  }
}
