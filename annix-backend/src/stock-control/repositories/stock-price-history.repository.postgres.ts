import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockPriceHistory } from "../entities/stock-price-history.entity";
import { StockPriceHistoryRepository } from "./stock-price-history.repository";

@Injectable()
export class PostgresStockPriceHistoryRepository
  extends TypeOrmCrudRepository<StockPriceHistory>
  implements StockPriceHistoryRepository
{
  constructor(@InjectRepository(StockPriceHistory) repository: Repository<StockPriceHistory>) {
    super(repository);
  }

  build(data: DeepPartial<StockPriceHistory>): StockPriceHistory {
    return this.repository.create(data as TypeOrmDeepPartial<StockPriceHistory>);
  }

  findForItemRecent(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<StockPriceHistory[]> {
    return this.repository.find({
      where: { stockItemId, companyId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  findForItemOrdered(companyId: number, stockItemId: number): Promise<StockPriceHistory[]> {
    return this.repository.find({
      where: { stockItemId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  recentChangesForCompany(companyId: number, limit: number): Promise<StockPriceHistory[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
