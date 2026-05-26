import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpProductRepository } from "./pump-product.repository";
import type { PumpProductQueryParams } from "./pump-product.service";

@Injectable()
export class PostgresPumpProductRepository
  extends TypeOrmCrudRepository<PumpProduct>
  implements PumpProductRepository
{
  constructor(@InjectRepository(PumpProduct) repository: Repository<PumpProduct>) {
    super(repository);
  }

  findBySku(sku: string): Promise<PumpProduct | null> {
    return this.repository.findOne({ where: { sku }, relations: ["supplier"] });
  }

  async searchPaged(
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      manufacturer,
      status,
      minFlowRate,
      maxFlowRate,
      minHead,
      maxHead,
    } = params;

    const queryBuilder = this.repository.createQueryBuilder("product");

    if (search) {
      queryBuilder.andWhere(
        "(product.title ILIKE :search OR product.sku ILIKE :search OR product.manufacturer ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    if (manufacturer) {
      queryBuilder.andWhere("product.manufacturer ILIKE :manufacturer", {
        manufacturer: `%${manufacturer}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("product.status = :status", { status });
    }

    if (minFlowRate !== undefined) {
      queryBuilder.andWhere("product.flow_rate_max >= :minFlowRate", { minFlowRate });
    }

    if (maxFlowRate !== undefined) {
      queryBuilder.andWhere("product.flow_rate_min <= :maxFlowRate", { maxFlowRate });
    }

    if (minHead !== undefined) {
      queryBuilder.andWhere("product.head_max >= :minHead", { minHead });
    }

    if (maxHead !== undefined) {
      queryBuilder.andWhere("product.head_min <= :maxHead", { maxHead });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy("product.title", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const items = await queryBuilder.getMany();

    return { items, total };
  }

  findByCategory(category: PumpProductCategory): Promise<PumpProduct[]> {
    return this.repository.find({
      where: { category, status: PumpProductStatus.ACTIVE },
      order: { title: "ASC" },
    });
  }

  findByManufacturerLike(manufacturer: string): Promise<PumpProduct[]> {
    return this.repository.find({
      where: { manufacturer: Like(`%${manufacturer}%`), status: PumpProductStatus.ACTIVE },
      order: { title: "ASC" },
    });
  }

  async manufacturers(): Promise<string[]> {
    const result: Array<{ manufacturer: string }> = await this.repository
      .createQueryBuilder("product")
      .select("DISTINCT product.manufacturer", "manufacturer")
      .where("product.status = :status", { status: PumpProductStatus.ACTIVE })
      .orderBy("product.manufacturer", "ASC")
      .getRawMany();

    return result.map((r) => r.manufacturer);
  }

  async fullTextSearchPaged(
    query: string,
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }> {
    const { page = 1, limit = 20, category, manufacturer, status } = params;

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 1);

    if (searchTerms.length === 0) {
      return { items: [], total: 0 };
    }

    const queryBuilder = this.repository.createQueryBuilder("product");

    const searchConditions = searchTerms.map((term, index) => {
      const paramName = `term${index}`;
      queryBuilder.setParameter(paramName, `%${term}%`);
      return `(
        product.title ILIKE :${paramName} OR
        product.sku ILIKE :${paramName} OR
        product.manufacturer ILIKE :${paramName} OR
        product.description ILIKE :${paramName} OR
        product.pump_type ILIKE :${paramName} OR
        product.model_number ILIKE :${paramName}
      )`;
    });

    queryBuilder.where(`(${searchConditions.join(" AND ")})`);

    if (category) {
      queryBuilder.andWhere("product.category = :category", { category });
    }

    if (manufacturer) {
      queryBuilder.andWhere("product.manufacturer ILIKE :manufacturer", {
        manufacturer: `%${manufacturer}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("product.status = :status", { status });
    } else {
      queryBuilder.andWhere("product.status = :defaultStatus", {
        defaultStatus: PumpProductStatus.ACTIVE,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy("product.title", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const items = await queryBuilder.getMany();

    return { items, total };
  }

  findByIdList(ids: number[]): Promise<PumpProduct[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In(ids) } });
  }

  async findSimilarProducts(product: PumpProduct, limit: number): Promise<PumpProduct[]> {
    const queryBuilder = this.repository.createQueryBuilder("product");

    queryBuilder.where("product.id != :productId", { productId: product.id });
    queryBuilder.andWhere("product.status = :status", { status: PumpProductStatus.ACTIVE });
    queryBuilder.andWhere("product.category = :category", { category: product.category });

    if (product.flowRateMin && product.flowRateMax) {
      const flowMiddle = (product.flowRateMin + product.flowRateMax) / 2;
      const flowRange = (product.flowRateMax - product.flowRateMin) * 2;
      queryBuilder.andWhere(
        "product.flow_rate_min <= :flowHigh AND product.flow_rate_max >= :flowLow",
        {
          flowLow: flowMiddle - flowRange,
          flowHigh: flowMiddle + flowRange,
        },
      );
    }

    if (product.headMin && product.headMax) {
      const headMiddle = (product.headMin + product.headMax) / 2;
      const headRange = (product.headMax - product.headMin) * 2;
      queryBuilder.andWhere("product.head_min <= :headHigh AND product.head_max >= :headLow", {
        headLow: headMiddle - headRange,
        headHigh: headMiddle + headRange,
      });
    }

    queryBuilder.orderBy("product.manufacturer", "ASC").take(limit);

    return queryBuilder.getMany();
  }
}
