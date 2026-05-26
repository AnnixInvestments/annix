import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";
import { QcDustDebrisTestRepository } from "./qc-dust-debris-test.repository";

@Injectable()
export class PostgresQcDustDebrisTestRepository
  extends TypeOrmCrudRepository<QcDustDebrisTest>
  implements QcDustDebrisTestRepository
{
  constructor(@InjectRepository(QcDustDebrisTest) repository: Repository<QcDustDebrisTest>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<QcDustDebrisTest[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "DESC", createdAt: "DESC" },
    });
  }

  findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDustDebrisTest[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { readingDate: "ASC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<QcDustDebrisTest | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
