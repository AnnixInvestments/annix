import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SupplierDocument } from "../entities/supplier-document.entity";
import {
  type SupplierDocumentQueryFilters,
  SupplierDocumentRepository,
} from "./supplier-document.repository";

@Injectable()
export class MongoSupplierDocumentRepository
  extends MongoCrudRepository<SupplierDocument>
  implements SupplierDocumentRepository
{
  constructor(@InjectModel("SupplierDocument") model: Model<SupplierDocument>) {
    super(model);
  }

  build(data: DeepPartial<SupplierDocument>): SupplierDocument {
    return data as SupplierDocument;
  }

  async findAllFilteredForCompany(
    companyId: number,
    filters: SupplierDocumentQueryFilters,
  ): Promise<SupplierDocument[]> {
    const query: Record<string, unknown> = { companyId };

    if (filters.supplierId) {
      query.supplierId = filters.supplierId;
    }
    if (filters.docType) {
      query.docType = filters.docType;
    }

    const docs = await this.documents
      .find(query)
      .populate(["supplier"])
      .sort({ expiresAt: 1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierDocument | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(relations)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<SupplierDocument>,
  ): Promise<void> {
    await this.documents.updateOne({ _id: id, companyId }, { $set: updates }).exec();
  }

  async deleteByIdForCompany(id: number, companyId: number): Promise<void> {
    await this.documents.deleteOne({ _id: id, companyId }).exec();
  }
}
