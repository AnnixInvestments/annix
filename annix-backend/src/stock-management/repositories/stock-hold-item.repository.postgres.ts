import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { type StockHoldDispositionStatus, StockHoldItem } from "../entities/stock-hold-item.entity";
import { StockHoldItemRepository } from "./stock-hold-item.repository";

@Injectable()
export class PostgresStockHoldItemRepository
  extends TypeOrmCrudRepository<StockHoldItem>
  implements StockHoldItemRepository
{
  constructor(@InjectRepository(StockHoldItem) repository: Repository<StockHoldItem>) {
    super(repository);
  }

  build(data: DeepPartial<StockHoldItem>): StockHoldItem {
    return this.repository.create(data as TypeOrmDeepPartial<StockHoldItem>);
  }

  findPendingForCompany(companyId: number): Promise<StockHoldItem[]> {
    return this.repository.find({
      where: { companyId, dispositionStatus: "pending" },
      relations: { product: true, stockTake: true },
      order: { flaggedAt: "ASC" },
    });
  }

  findAllForCompany(
    companyId: number,
    status: StockHoldDispositionStatus | undefined,
  ): Promise<StockHoldItem[]> {
    const where: { companyId: number; dispositionStatus?: StockHoldDispositionStatus } = {
      companyId,
    };
    if (status) {
      where.dispositionStatus = status;
    }
    return this.repository.find({
      where,
      relations: { product: true, stockTake: true },
      order: { flaggedAt: "DESC" },
    });
  }

  findByIdForCompanyWithDetail(companyId: number, id: number): Promise<StockHoldItem | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: { product: true, stockTake: true },
    });
  }
}
