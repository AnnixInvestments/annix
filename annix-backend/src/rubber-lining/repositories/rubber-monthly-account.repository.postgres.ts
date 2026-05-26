import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberMonthlyAccount } from "../entities/rubber-monthly-account.entity";
import {
  type MonthlyAccountFilters,
  RubberMonthlyAccountRepository,
} from "./rubber-monthly-account.repository";

@Injectable()
export class PostgresRubberMonthlyAccountRepository
  extends TypeOrmCrudRepository<RubberMonthlyAccount>
  implements RubberMonthlyAccountRepository
{
  constructor(
    @InjectRepository(RubberMonthlyAccount) repository: Repository<RubberMonthlyAccount>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberMonthlyAccount>): RubberMonthlyAccount {
    return this.repository.create(data as TypeOrmDeepPartial<RubberMonthlyAccount>);
  }

  findFilteredOrdered(filters?: MonthlyAccountFilters): Promise<RubberMonthlyAccount[]> {
    const query = this.repository
      .createQueryBuilder("ma")
      .leftJoinAndSelect("ma.signOffs", "so", "1=1")
      .orderBy("ma.periodYear", "DESC")
      .addOrderBy("ma.periodMonth", "DESC");

    if (filters?.accountType) {
      query.andWhere("ma.account_type = :accountType", {
        accountType: filters.accountType,
      });
    }
    if (filters?.status) {
      query.andWhere("ma.status = :status", { status: filters.status });
    }
    if (filters?.year) {
      query.andWhere("ma.period_year = :year", { year: filters.year });
    }

    return query.getMany();
  }

  async updateById(id: number, updates: DeepPartial<RubberMonthlyAccount>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<RubberMonthlyAccount>);
  }
}
