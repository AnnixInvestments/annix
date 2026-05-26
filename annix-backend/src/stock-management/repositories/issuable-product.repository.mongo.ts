import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { IssuableProduct, type IssuableProductType } from "../entities/issuable-product.entity";
import {
  IssuableProductRepository,
  type IssuableProductWhere,
} from "./issuable-product.repository";

const FULL_RELATIONS = [
  "category",
  "consumable",
  "paint",
  "rubberRoll",
  "rubberOffcut",
  "solution",
];

@Injectable()
export class MongoIssuableProductRepository
  extends MongoCrudRepository<IssuableProduct>
  implements IssuableProductRepository
{
  constructor(
    @InjectModel("IssuableProduct") model: Model<IssuableProduct>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<IssuableProduct>): IssuableProduct {
    return data as IssuableProduct;
  }

  withTransaction(context: TransactionContext): MongoIssuableProductRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuableProductRepository requires a MongoTransactionContext");
    }
    return new MongoIssuableProductRepository(this.model, context.session);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<IssuableProduct | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithDetail(
    companyId: number,
    id: number,
  ): Promise<IssuableProduct | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(FULL_RELATIONS)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findNameSkuForProduct(companyId: number, id: number): Promise<IssuableProduct | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .select(["name", "sku"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPaginatedForCompany(
    where: IssuableProductWhere,
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ items: IssuableProduct[]; total: number }> {
    const criteria: Record<string, unknown> = { companyId: where.companyId };
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
      criteria.name = { $regex: search, $options: "i" };
    }
    const [docs, total] = await Promise.all([
      this.documents
        .find(criteria)
        .populate(FULL_RELATIONS)
        .sort({ name: 1 })
        .skip(skip)
        .limit(take)
        .lean()
        .exec(),
      this.documents.countDocuments(criteria).exec(),
    ]);
    return { items: this.toDomainList(docs), total };
  }

  async findBySkuForCompany(companyId: number, sku: string): Promise<IssuableProduct | null> {
    const doc = await this.documents.findOne({ companyId, sku }).lean().exec();
    return this.toDomain(doc);
  }

  async findByNameForCompany(companyId: number, name: string): Promise<IssuableProduct | null> {
    const doc = await this.documents.findOne({ companyId, name }).lean().exec();
    return this.toDomain(doc);
  }

  async findByLegacyStockItemId(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null> {
    const doc = await this.documents.findOne({ companyId, legacyStockItemId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByLegacyStockItemIdWithPaint(
    companyId: number,
    legacyStockItemId: number,
  ): Promise<IssuableProduct | null> {
    const doc = await this.documents
      .findOne({ companyId, legacyStockItemId })
      .populate(["paint"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findAllOfTypeWithPaint(
    companyId: number,
    productType: IssuableProductType,
  ): Promise<IssuableProduct[]> {
    const docs = await this.documents
      .find({ companyId, productType })
      .populate(["paint"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async countByType(companyId: number): Promise<Record<IssuableProductType, number>> {
    const rows = await this.documents
      .aggregate<{ _id: IssuableProductType; count: number }>([
        { $match: { companyId } },
        { $group: { _id: "$productType", count: { $sum: 1 } } },
      ])
      .exec();
    const initial: Record<IssuableProductType, number> = {
      consumable: 0,
      paint: 0,
      rubber_roll: 0,
      rubber_offcut: 0,
      solution: 0,
    };
    return rows.reduce((acc, row) => {
      acc[row._id] = Number(row.count);
      return acc;
    }, initial);
  }

  async findActiveForCompany(companyId: number): Promise<IssuableProduct[]> {
    const docs = await this.documents.find({ companyId, active: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(companyId: number): Promise<IssuableProduct[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findUnassignedActive(companyId: number): Promise<IssuableProduct[]> {
    const docs = await this.documents
      .find({ companyId, locationId: null, active: true })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async searchBySkuLike(companyId: number, term: string, take: number): Promise<IssuableProduct[]> {
    const docs = await this.documents
      .find({ companyId, sku: { $regex: term, $options: "i" } })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async searchByNameLike(
    companyId: number,
    term: string,
    take: number,
  ): Promise<IssuableProduct[]> {
    const docs = await this.documents
      .find({ companyId, name: { $regex: term, $options: "i" } })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateLocation(companyId: number, productId: number, locationId: number): Promise<void> {
    await this.documents.updateOne({ _id: productId, companyId }, { $set: { locationId } }).exec();
  }

  async updateLocationForIds(
    companyId: number,
    productIds: number[],
    locationId: number,
  ): Promise<number> {
    const result = await this.documents
      .updateMany({ _id: { $in: productIds }, companyId }, { $set: { locationId } })
      .exec();
    return result.modifiedCount;
  }

  async findStockControlLocationByName(
    companyId: number,
    name: string,
  ): Promise<{ id: number; name: string } | null> {
    const doc = await this.model.db
      .collection("stockcontrollocations")
      .findOne({ companyId, name });
    if (!doc) {
      return null;
    }
    return { id: Number(doc._id), name: doc.name };
  }

  async insertStockControlLocation(
    companyId: number,
    name: string,
    description: string,
  ): Promise<{ id: number; name: string }> {
    const collection = this.model.db.collection("stockcontrollocations");
    const result = await collection.insertOne({
      companyId,
      name,
      description,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: Number(result.insertedId), name };
  }
}
