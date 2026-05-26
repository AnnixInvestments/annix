import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcPullTest } from "../entities/qc-pull-test.entity";
import { QcPullTestRepository } from "./qc-pull-test.repository";

@Injectable()
export class PostgresQcPullTestRepository
  extends TypeOrmCrudRepository<QcPullTest>
  implements QcPullTestRepository
{
  constructor(@InjectRepository(QcPullTest) repository: Repository<QcPullTest>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcPullTest[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcPullTest[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "ASC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcPullTest | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
