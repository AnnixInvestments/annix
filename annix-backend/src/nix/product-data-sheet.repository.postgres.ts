import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ProductDataSheet } from "./entities/product-data-sheet.entity";
import { ProductDataSheetRepository } from "./product-data-sheet.repository";

@Injectable()
export class PostgresProductDataSheetRepository
  extends TypeOrmCrudRepository<ProductDataSheet>
  implements ProductDataSheetRepository
{
  constructor(@InjectRepository(ProductDataSheet) repository: Repository<ProductDataSheet>) {
    super(repository);
  }

  findLatestForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet | null> {
    return this.repository.findOne({
      where: {
        manufacturerSlug,
        productSlug,
        isLatest: true,
      },
    });
  }

  findVersionsForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet[]> {
    return this.repository.find({
      where: { manufacturerSlug, productSlug },
      order: { isLatest: "DESC", version: "DESC" },
    });
  }

  searchLatest(terms: string[]): Promise<ProductDataSheet[]> {
    const qb = this.repository
      .createQueryBuilder("ds")
      .where("ds.is_latest = true")
      .orderBy("ds.published_date", "DESC", "NULLS LAST")
      .addOrderBy("ds.updated_at", "DESC")
      .limit(20);
    terms.forEach((term, i) => {
      qb.andWhere(`lower(ds.manufacturer || ' ' || ds.product_name) LIKE :t${i}`, {
        [`t${i}`]: `%${term}%`,
      });
    });
    return qb.getMany();
  }
}
