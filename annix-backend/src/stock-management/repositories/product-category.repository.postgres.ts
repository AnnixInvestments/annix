import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ProductCategory, type ProductCategoryType } from "../entities/product-category.entity";
import { ProductCategoryRepository } from "./product-category.repository";

@Injectable()
export class PostgresProductCategoryRepository
  extends TypeOrmCrudRepository<ProductCategory>
  implements ProductCategoryRepository
{
  constructor(@InjectRepository(ProductCategory) repository: Repository<ProductCategory>) {
    super(repository);
  }

  build(data: DeepPartial<ProductCategory>): ProductCategory {
    return this.repository.create(data as TypeOrmDeepPartial<ProductCategory>);
  }

  saveMany(categories: ProductCategory[]): Promise<ProductCategory[]> {
    return this.repository.save(categories);
  }

  findForCompany(
    companyId: number,
    productType: ProductCategoryType | undefined,
  ): Promise<ProductCategory[]> {
    const where: { companyId: number; productType?: ProductCategoryType } = { companyId };
    if (productType) {
      where.productType = productType;
    }
    return this.repository.find({
      where,
      order: { productType: "ASC", sortOrder: "ASC", name: "ASC" },
    });
  }

  findOneForCompany(companyId: number, id: number): Promise<ProductCategory | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneByTypeSlug(
    companyId: number,
    productType: ProductCategoryType,
    slug: string,
  ): Promise<ProductCategory | null> {
    return this.repository.findOne({ where: { companyId, productType, slug } });
  }

  findAllForCompany(companyId: number): Promise<ProductCategory[]> {
    return this.repository.find({ where: { companyId } });
  }
}
