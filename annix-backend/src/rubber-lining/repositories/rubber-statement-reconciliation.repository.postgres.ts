import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberStatementReconciliation } from "../entities/rubber-statement-reconciliation.entity";
import {
  type ReconciliationListFilters,
  RubberStatementReconciliationRepository,
} from "./rubber-statement-reconciliation.repository";

@Injectable()
export class PostgresRubberStatementReconciliationRepository
  extends TypeOrmCrudRepository<RubberStatementReconciliation>
  implements RubberStatementReconciliationRepository
{
  constructor(
    @InjectRepository(RubberStatementReconciliation)
    repository: Repository<RubberStatementReconciliation>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberStatementReconciliation>): RubberStatementReconciliation {
    return this.repository.create(data as TypeOrmDeepPartial<RubberStatementReconciliation>);
  }

  findByIdWithCompany(id: number): Promise<RubberStatementReconciliation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["company"],
    });
  }

  findAllWithCompanyOrdered(
    filters?: ReconciliationListFilters,
  ): Promise<RubberStatementReconciliation[]> {
    const query = this.repository
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.company", "company")
      .orderBy("r.created_at", "DESC");

    if (filters?.companyId) {
      query.andWhere("r.company_id = :companyId", {
        companyId: filters.companyId,
      });
    }
    if (filters?.status) {
      query.andWhere("r.status = :status", { status: filters.status });
    }
    if (filters?.year) {
      query.andWhere("r.period_year = :year", { year: filters.year });
    }
    if (filters?.month) {
      query.andWhere("r.period_month = :month", { month: filters.month });
    }

    return query.getMany();
  }
}
