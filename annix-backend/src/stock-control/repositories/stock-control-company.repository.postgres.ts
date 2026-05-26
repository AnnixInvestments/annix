import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlCompanyRepository } from "./stock-control-company.repository";

@Injectable()
export class PostgresStockControlCompanyRepository
  extends TypeOrmCrudRepository<StockControlCompany>
  implements StockControlCompanyRepository
{
  constructor(@InjectRepository(StockControlCompany) repository: Repository<StockControlCompany>) {
    super(repository);
  }

  async updateById(id: number, updates: DeepPartial<StockControlCompany>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<StockControlCompany>);
  }
}
