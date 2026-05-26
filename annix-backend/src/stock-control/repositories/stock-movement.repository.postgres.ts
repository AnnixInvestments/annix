import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  MoreThanOrEqual,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import {
  type MovementHistoryFilters,
  type MovementListFilters,
  StockMovementRepository,
} from "./stock-movement.repository";

@Injectable()
export class PostgresStockMovementRepository
  extends TypeOrmCrudRepository<StockMovement>
  implements StockMovementRepository
{
  constructor(@InjectRepository(StockMovement) repository: Repository<StockMovement>) {
    super(repository);
  }

  build(data: DeepPartial<StockMovement>): StockMovement {
    return this.repository.create(data as TypeOrmDeepPartial<StockMovement>);
  }

  findFilteredForCompany(
    companyId: number,
    filters: MovementListFilters | undefined,
    page: number,
    limit: number,
  ): Promise<StockMovement[]> {
    const where: Record<string, unknown> = { companyId };

    if (filters?.stockItemId) {
      where.stockItem = { id: filters.stockItemId };
    }

    if (filters?.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    return this.repository.find({
      where,
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  findByItemForCompany(companyId: number, stockItemId: number): Promise<StockMovement[]> {
    return this.repository.find({
      where: { stockItem: { id: stockItemId }, companyId },
      order: { createdAt: "DESC" },
    });
  }

  recentActivityForCompany(companyId: number, limit: number): Promise<StockMovement[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  countCreatedSinceForCompany(companyId: number, since: Date): Promise<number> {
    return this.repository.count({
      where: { companyId, createdAt: MoreThanOrEqual(since) },
    });
  }

  movementHistoryForCompany(
    companyId: number,
    filters: MovementHistoryFilters | undefined,
  ): Promise<StockMovement[]> {
    const query = this.repository
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.stockItem", "item")
      .where("m.company_id = :companyId", { companyId })
      .orderBy("m.created_at", "DESC");

    if (filters?.startDate) {
      query.andWhere("m.created_at >= :startDate", { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere("m.created_at <= :endDate", { endDate: filters.endDate });
    }

    if (filters?.movementType) {
      query.andWhere("m.movement_type = :movementType", { movementType: filters.movementType });
    }

    if (filters?.stockItemId) {
      query.andWhere("m.stock_item_id = :stockItemId", { stockItemId: filters.stockItemId });
    }

    return query.take(500).getMany();
  }

  findForItemSinceExcludingStockTake(
    companyId: number,
    stockItemId: number,
    since: Date,
  ): Promise<StockMovement[]> {
    return this.repository
      .createQueryBuilder("m")
      .where("m.stock_item_id = :itemId", { itemId: stockItemId })
      .andWhere("m.company_id = :companyId", { companyId })
      .andWhere("m.created_at > :cutoff", { cutoff: since })
      .andWhere("m.reference_type != :stockTake", { stockTake: ReferenceType.STOCK_TAKE })
      .getMany();
  }
}
