import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";
import { StockTakeVarianceCategoryRepository } from "./stock-take-variance-category.repository";

@Injectable()
export class MongoStockTakeVarianceCategoryRepository
  extends MongoCrudRepository<StockTakeVarianceCategory>
  implements StockTakeVarianceCategoryRepository
{
  constructor(@InjectModel("StockTakeVarianceCategory") model: Model<StockTakeVarianceCategory>) {
    super(model);
  }

  build(data: DeepPartial<StockTakeVarianceCategory>): StockTakeVarianceCategory {
    return data as StockTakeVarianceCategory;
  }

  async saveMany(categories: StockTakeVarianceCategory[]): Promise<StockTakeVarianceCategory[]> {
    return Promise.all(categories.map((category) => this.save(category)));
  }

  async findByIds(ids: number[]): Promise<StockTakeVarianceCategory[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findById(id: number): Promise<StockTakeVarianceCategory | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(
    companyId: number,
    id: number,
  ): Promise<StockTakeVarianceCategory | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findForCompany(
    companyId: number,
    includeInactive: boolean,
  ): Promise<StockTakeVarianceCategory[]> {
    const query: Record<string, unknown> = { companyId };
    if (!includeInactive) {
      query.active = true;
    }
    const docs = await this.documents.find(query).sort({ sortOrder: 1, name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByCompanySlug(
    companyId: number,
    slug: string,
  ): Promise<StockTakeVarianceCategory | null> {
    const doc = await this.documents.findOne({ companyId, slug }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForCompany(companyId: number): Promise<StockTakeVarianceCategory[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
