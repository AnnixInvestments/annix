import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ProductCategory, type ProductCategoryType } from "../entities/product-category.entity";
import { ProductCategoryRepository } from "./product-category.repository";

@Injectable()
export class MongoProductCategoryRepository
  extends MongoCrudRepository<ProductCategory>
  implements ProductCategoryRepository
{
  constructor(@InjectModel("ProductCategory") model: Model<ProductCategory>) {
    super(model);
  }

  build(data: DeepPartial<ProductCategory>): ProductCategory {
    return data as ProductCategory;
  }

  async saveMany(categories: ProductCategory[]): Promise<ProductCategory[]> {
    return Promise.all(categories.map((category) => this.save(category)));
  }

  async findForCompany(
    companyId: number,
    productType: ProductCategoryType | undefined,
  ): Promise<ProductCategory[]> {
    const query: Record<string, unknown> = { companyId };
    if (productType) {
      query.productType = productType;
    }
    const docs = await this.documents
      .find(query)
      .sort({ productType: 1, sortOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<ProductCategory | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByTypeSlug(
    companyId: number,
    productType: ProductCategoryType,
    slug: string,
  ): Promise<ProductCategory | null> {
    const doc = await this.documents.findOne({ companyId, productType, slug }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForCompany(companyId: number): Promise<ProductCategory[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
