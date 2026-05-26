import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  type FindOptionsWhere,
  ILike,
  In,
  IsNull,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuableProduct, type IssuableProductType } from "../entities/issuable-product.entity";
import {
  IssuableProductRepository,
  type IssuableProductWhere,
} from "./issuable-product.repository";

const FULL_RELATIONS = {
  category: true,
  consumable: true,
  paint: true,
  rubberRoll: true,
  rubberOffcut: true,
  solution: true,
};

@Injectable()
export class PostgresIssuableProductRepository
  extends TypeOrmCrudRepository<IssuableProduct>
  implements IssuableProductRepository
{
  constructor(@InjectRepository(IssuableProduct) repository: Repository<IssuableProduct>) {
    super(repository);
  }

  build(data: DeepPartial<IssuableProduct>): IssuableProduct {
    return this.repository.create(data as TypeOrmDeepPartial<IssuableProduct>);
  }

  withTransaction(context: TransactionContext): PostgresIssuableProductRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresIssuableProductRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresIssuableProductRepository(context.manager.getRepository(IssuableProduct));
  }

  findByIdForCompany(companyId: number, id: number): Promise<IssuableProduct | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIdForCompanyWithDetail(companyId: number, id: number): Promise<IssuableProduct | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: FULL_RELATIONS,
    });
  }

  findNameSkuForProduct(companyId: number, id: number): Promise<IssuableProduct | null> {
    return this.repository.findOne({
      where: { id, companyId },
      select: ["name", "sku"],
    });
  }

  async findPaginatedForCompany(
    where: IssuableProductWhere,
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ items: IssuableProduct[]; total: number }> {
    const criteria: FindOptionsWhere<IssuableProduct> = { companyId: where.companyId };
    if (where.productType) {
      criteria.productType = where.productType;
    }
    if (where.categoryId !== undefined) {
      criteria.categoryId = where.categoryId;
    }
    if (where.active !== undefined) {
      criteria.active = where.active;
    }
    if (search) {
      criteria.name = ILike(`%${search}%`);
    }
    const [items, total] = await this.repository.findAndCount({
      where: criteria,
      relations: FULL_RELATIONS,
      order: { name: "ASC" },
      skip,
      take,
    });
    return { items, total };
  }

  findBySkuForCompany(companyId: number, sku: string): Promise<IssuableProduct | null> {
    return this.repository.findOne({ where: { companyId, sku } });
  }

  findByNameForCompany(companyId: number, name: string): Promise<IssuableProduct | null> {
    return this.repository.findOne({ where: { companyId, name } });
  }

  findByLegacyStockItemId(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null> {
    return this.repository.findOne({ where: { companyId, legacyStockItemId } });
  }

  findByLegacyStockItemIdWithPaint(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null> {
    return this.repository.findOne({
      where: { companyId, legacyStockItemId },
      relations: { paint: true },
    });
  }

  findAllOfTypeWithPaint(
    companyId: number,
    productType: IssuableProductType,
  ): Promise<IssuableProduct[]> {
    return this.repository.find({
      where: { companyId, productType },
      relations: { paint: true },
    });
  }

  async countByType(companyId: number): Promise<Record<IssuableProductType, number>> {
    const rows = await this.repository
      .createQueryBuilder("p")
      .select("p.product_type", "type")
      .addSelect("COUNT(*)", "count")
      .where("p.company_id = :companyId", { companyId })
      .groupBy("p.product_type")
      .getRawMany<{ type: IssuableProductType; count: string }>();
    const initial: Record<IssuableProductType, number> = {
      consumable: 0,
      paint: 0,
      rubber_roll: 0,
      rubber_offcut: 0,
      solution: 0,
    };
    return rows.reduce((acc, row) => {
      acc[row.type] = Number(row.count);
      return acc;
    }, initial);
  }

  findActiveForCompany(companyId: number): Promise<IssuableProduct[]> {
    return this.repository.find({ where: { companyId, active: true } });
  }

  findAllForCompany(companyId: number): Promise<IssuableProduct[]> {
    return this.repository.find({ where: { companyId } });
  }

  findUnassignedActive(companyId: number): Promise<IssuableProduct[]> {
    return this.repository.find({
      where: { companyId, locationId: IsNull(), active: true },
    });
  }

  searchBySkuLike(companyId: number, term: string, take: number): Promise<IssuableProduct[]> {
    return this.repository.find({
      where: { companyId, sku: ILike(`%${term}%`) },
      take,
    });
  }

  searchByNameLike(companyId: number, term: string, take: number): Promise<IssuableProduct[]> {
    return this.repository.find({
      where: { companyId, name: ILike(`%${term}%`) },
      take,
    });
  }

  async updateLocation(companyId: number, productId: number, locationId: number): Promise<void> {
    await this.repository.update({ id: productId, companyId }, { locationId });
  }

  async updateLocationForIds(
    companyId: number,
    productIds: number[],
    locationId: number,
  ): Promise<number> {
    const result = await this.repository.update({ id: In(productIds), companyId }, { locationId });
    return result.affected == null ? 0 : result.affected;
  }

  async findStockControlLocationByName(
    companyId: number,
    name: string,
  ): Promise<{ id: number; name: string } | null> {
    const rows = await this.repository.manager.query(
      "SELECT id, name FROM stock_control_locations WHERE company_id = $1 AND name = $2 LIMIT 1",
      [companyId, name],
    );
    if (rows.length === 0) {
      return null;
    }
    return { id: Number(rows[0].id), name: rows[0].name };
  }

  async insertStockControlLocation(
    companyId: number,
    name: string,
    description: string,
  ): Promise<{ id: number; name: string }> {
    const inserted = await this.repository.manager.query(
      `INSERT INTO stock_control_locations (company_id, name, description, active, created_at, updated_at)
       VALUES ($1, $2, $3, true, now(), now())
       RETURNING id, name`,
      [companyId, name, description],
    );
    return { id: Number(inserted[0].id), name: inserted[0].name };
  }
}
