import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlProfileRepository } from "./stock-control-profile.repository";

@Injectable()
export class PostgresStockControlProfileRepository
  extends TypeOrmCrudRepository<StockControlProfile>
  implements StockControlProfileRepository
{
  constructor(@InjectRepository(StockControlProfile) repository: Repository<StockControlProfile>) {
    super(repository);
  }

  findOneByUserId(userId: number): Promise<StockControlProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findOneByUserIdWithRelations(
    userId: number,
    relations: string[],
  ): Promise<StockControlProfile | null> {
    return this.repository.findOne({ where: { userId }, relations });
  }

  findOneOrFailByUserId(userId: number): Promise<StockControlProfile> {
    return this.repository.findOneOrFail({ where: { userId } });
  }

  async updateByUserId(userId: number, updates: DeepPartial<StockControlProfile>): Promise<void> {
    await this.repository.update(
      { userId },
      updates as QueryDeepPartialEntity<StockControlProfile>,
    );
  }
}
