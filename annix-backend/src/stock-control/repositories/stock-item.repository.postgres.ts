import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ILike,
  In,
  IsNull,
  MoreThan,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { STOCK_ITEM_MATCH_SELECT } from "../lib/stock-item-select";
import {
  type SohByLocationRow,
  type SohSummaryRow,
  type StockItemListFilters,
  StockItemRepository,
} from "./stock-item.repository";

@Injectable()
export class PostgresStockItemRepository
  extends TypeOrmCrudRepository<StockItem>
  implements StockItemRepository
{
  constructor(@InjectRepository(StockItem) repository: Repository<StockItem>) {
    super(repository);
  }

  build(data: DeepPartial<StockItem>): StockItem {
    return this.repository.create(data as TypeOrmDeepPartial<StockItem>);
  }

  buildMany(rows: DeepPartial<StockItem>[]): StockItem[] {
    return this.repository.create(rows as TypeOrmDeepPartial<StockItem>[]);
  }

  saveMany(entities: StockItem[]): Promise<StockItem[]> {
    return this.repository.save(entities);
  }

  async updateById(id: number, updates: DeepPartial<StockItem>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<StockItem>);
  }

  async updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<StockItem>,
  ): Promise<void> {
    await this.repository.update({ id, companyId }, updates as QueryDeepPartialEntity<StockItem>);
  }

  async incrementQuantityById(id: number, amount: number): Promise<void> {
    await this.repository.update(id, {
      quantity: () => `quantity + ${amount}`,
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockItem | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockItem | null> {
    return this.repository.findOne({ where: { id, companyId }, relations });
  }

  findOneBySkuForCompany(sku: string, companyId: number): Promise<StockItem | null> {
    return this.repository.findOne({ where: { sku, companyId } });
  }

  findOneWastageForCompany(
    companyId: number,
    sku: string,
    category: string,
  ): Promise<StockItem | null> {
    return this.repository.findOne({ where: { companyId, sku, category } });
  }

  findByIdsForCompanyOrderedByName(ids: number[], companyId: number): Promise<StockItem[]> {
    return this.repository.find({
      where: { companyId, id: In(ids) },
      order: { name: "ASC" },
    });
  }

  findAllForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository.find({ where: { companyId } });
  }

  findAllForCompanyOrderedByName(companyId: number): Promise<StockItem[]> {
    return this.repository.find({ where: { companyId }, order: { name: "ASC" } });
  }

  findForCompanySelectMatch(companyId: number): Promise<StockItem[]> {
    return this.repository.find({ where: { companyId }, select: STOCK_ITEM_MATCH_SELECT });
  }

  findUncategorizedForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository.find({
      where: { companyId, category: IsNull() },
      select: ["id", "name", "sku"],
      order: { name: "ASC" },
    });
  }

  findRubberCategoryForCompanyOrderedByName(companyId: number): Promise<StockItem[]> {
    return this.repository.find({
      where: { companyId, category: "RUBBER" },
      order: { name: "ASC" },
    });
  }

  findRubberInStockForCompanyOrdered(companyId: number): Promise<StockItem[]> {
    return this.repository.find({
      where: {
        companyId,
        category: ILike("%rubber%"),
        quantity: MoreThan(0),
      },
      order: { thicknessMm: "ASC", widthMm: "ASC" },
    });
  }

  findRubberInStockForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository.find({
      where: {
        companyId,
        category: ILike("%rubber%"),
        quantity: MoreThan(0),
      },
    });
  }

  findLeftoverForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository.find({ where: { companyId, isLeftover: true } });
  }

  findByTermForCompany(companyId: number, term: string): Promise<StockItem[]> {
    return this.repository.find({
      where: [
        { companyId, name: ILike(`%${term}%`) },
        { companyId, category: ILike(`%${term}%`) },
        { companyId, description: ILike(`%${term}%`) },
      ],
      take: 10,
    });
  }

  async findFilteredForCompany(
    companyId: number,
    filters: StockItemListFilters,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("item")
      .where("item.companyId = :companyId", { companyId });

    if (filters.category) {
      qb.andWhere("item.category = :category", { category: filters.category });
    }

    if (filters.belowMinStock) {
      qb.andWhere("item.quantity <= item.min_stock_level");
    }

    if (filters.locationId === "null") {
      qb.andWhere("item.location_id IS NULL");
    } else if (filters.locationId) {
      const parsedLocId = Number(filters.locationId);
      if (Number.isInteger(parsedLocId) && parsedLocId > 0) {
        qb.andWhere("item.location_id = :locationId", { locationId: parsedLocId });
      }
    }

    qb.orderBy("item.name", "ASC");
    if (limit > 0) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async searchForCompany(
    companyId: number,
    search: string,
    skip: number,
    limit: number,
    belowMinStock: boolean,
    locationId?: string,
  ): Promise<{ items: StockItem[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("item")
      .where("item.companyId = :companyId", { companyId })
      .andWhere(
        "(item.name ILIKE :search OR item.sku ILIKE :search OR item.description ILIKE :search)",
        { search: `%${search}%` },
      );

    if (belowMinStock) {
      qb.andWhere("item.quantity <= item.min_stock_level");
    }

    if (locationId === "null") {
      qb.andWhere("item.location_id IS NULL");
    } else if (locationId) {
      const parsedLocId = Number(locationId);
      if (Number.isInteger(parsedLocId) && parsedLocId > 0) {
        qb.andWhere("item.location_id = :locationId", { locationId: parsedLocId });
      }
    }

    qb.orderBy("item.name", "ASC");
    if (limit > 0) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  searchSummaryForCompany(companyId: number, pattern: string, limit: number): Promise<StockItem[]> {
    return this.repository
      .createQueryBuilder("si")
      .select([
        "si.id",
        "si.sku",
        "si.name",
        "si.description",
        "si.category",
        "si.quantity",
        "si.unitOfMeasure",
        "si.updatedAt",
      ])
      .where("si.companyId = :companyId", { companyId })
      .andWhere(
        "(si.name ILIKE :pattern OR si.sku ILIKE :pattern OR si.description ILIKE :pattern OR si.category ILIKE :pattern)",
        { pattern },
      )
      .orderBy("si.updatedAt", "DESC")
      .take(limit)
      .getMany();
  }

  async groupedForCompany(
    companyId: number,
    search: string | undefined,
    locationId: number | null,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId });

    if (search) {
      queryBuilder.andWhere(
        "(item.name ILIKE :search OR item.sku ILIKE :search OR item.description ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (locationId) {
      queryBuilder.andWhere("item.location_id = :locationId", { locationId });
    }

    queryBuilder
      .orderBy("item.category", "ASC")
      .addOrderBy("item.name", "ASC")
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async categoriesForCompany(companyId: number): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder("item")
      .select("DISTINCT item.category", "category")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.category IS NOT NULL")
      .orderBy("item.category", "ASC")
      .getRawMany();
    return result.map((r) => r.category);
  }

  async totalValueForCompany(companyId: number): Promise<number> {
    const valueResult = await this.repository
      .createQueryBuilder("item")
      .select("COALESCE(SUM(item.quantity * item.cost_per_unit), 0)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .getRawOne();
    return Number(valueResult?.totalValue || 0);
  }

  lowStockCountForCompany(companyId: number): Promise<number> {
    return this.repository
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.min_stock_level > 0")
      .andWhere("item.quantity <= item.min_stock_level")
      .getCount();
  }

  reorderAlertCountForCompany(companyId: number): Promise<number> {
    return this.repository
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.min_stock_level > 0")
      .andWhere("item.quantity <= item.min_stock_level")
      .getCount();
  }

  reorderAlertsForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.min_stock_level > 0")
      .andWhere("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();
  }

  lowStockForCompany(companyId: number): Promise<StockItem[]> {
    return this.repository
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();
  }

  async sohSummaryForCompany(companyId: number): Promise<SohSummaryRow[]> {
    const result = await this.repository
      .createQueryBuilder("item")
      .select("COALESCE(item.category, 'Uncategorized')", "category")
      .addSelect("SUM(item.quantity)", "totalQuantity")
      .addSelect("SUM(item.quantity * item.cost_per_unit)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .groupBy("COALESCE(item.category, 'Uncategorized')")
      .orderBy("category", "ASC")
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  async sohByLocationForCompany(companyId: number): Promise<SohByLocationRow[]> {
    const result = await this.repository
      .createQueryBuilder("item")
      .leftJoin("item.locationEntity", "loc")
      .select("COALESCE(loc.name, item.location, 'Unassigned')", "location")
      .addSelect("SUM(item.quantity)", "totalQuantity")
      .addSelect("SUM(item.quantity * item.cost_per_unit)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .groupBy("COALESCE(loc.name, item.location, 'Unassigned')")
      .orderBy("location", "ASC")
      .getRawMany();

    return result.map((r) => ({
      location: r.location,
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  overAllocationCountForCompany(companyId: number): Promise<number> {
    return this.repository
      .createQueryBuilder("item")
      .innerJoin(
        (qb) =>
          qb
            .select("sa.stock_item_id", "stockItemId")
            .addSelect("SUM(sa.quantity_used)", "totalAllocated")
            .from(StockAllocation, "sa")
            .where("sa.company_id = :companyId", { companyId })
            .groupBy("sa.stock_item_id"),
        "alloc",
        'alloc."stockItemId" = item.id',
      )
      .where("item.company_id = :companyId", { companyId })
      .andWhere('alloc."totalAllocated" > item.quantity')
      .getCount();
  }

  findOneByQrTokenForCompany(companyId: number, qrToken: string): Promise<StockItem | null> {
    return this.repository
      .createQueryBuilder("si")
      .where("si.companyId = :companyId", { companyId })
      .andWhere("si.id::text = :qrToken OR si.sku = :qrToken", { qrToken })
      .getOne();
  }

  async mostCommonLocationIdForCategory(
    companyId: number,
    category: string,
  ): Promise<number | null> {
    const rows: Array<{ location_id: number; cnt: string }> = await this.repository.query(
      `SELECT location_id, COUNT(*) AS cnt
       FROM stock_items
       WHERE company_id = $1
         AND category = $2
         AND location_id IS NOT NULL
       GROUP BY location_id
       ORDER BY cnt DESC
       LIMIT 1`,
      [companyId, category],
    );

    if (rows.length > 0) {
      return rows[0].location_id;
    }
    return null;
  }
}
