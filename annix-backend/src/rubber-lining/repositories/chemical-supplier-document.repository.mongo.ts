import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ChemicalSupplierDocument } from "../entities/chemical-supplier-document.entity";
import {
  type ChemicalSupplierDocumentListFilters,
  ChemicalSupplierDocumentRepository,
} from "./chemical-supplier-document.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoChemicalSupplierDocumentRepository
  extends MongoCrudRepository<ChemicalSupplierDocument>
  implements ChemicalSupplierDocumentRepository
{
  constructor(@InjectModel("ChemicalSupplierDocument") model: Model<ChemicalSupplierDocument>) {
    super(model);
  }

  build(data: Partial<ChemicalSupplierDocument>): ChemicalSupplierDocument {
    return data as ChemicalSupplierDocument;
  }

  async listWithFilters(
    filters: ChemicalSupplierDocumentListFilters,
  ): Promise<ChemicalSupplierDocument[]> {
    const filter: Doc = {};
    if (filters.supplierCompanyId) {
      filter.supplierCompanyId = filters.supplierCompanyId;
    }
    if (filters.processingStatus) {
      filter.processingStatus = filters.processingStatus;
    }
    const term = filters.search?.trim();
    if (term) {
      const regex = { $regex: escapeRegExp(term), $options: "i" };
      filter.$or = [{ deliveryNoteNumber: regex }, { batchNumber: regex }, { productName: regex }];
    }
    const docs = await this.documents
      .find(filter)
      .populate("supplierCompany")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithCompany(id: number): Promise<ChemicalSupplierDocument | null> {
    const doc = await this.documents.findById(id).populate("supplierCompany").lean().exec();
    return this.toDomain(doc);
  }

  async findOneByDocumentHashWithCompany(
    documentHash: string,
  ): Promise<ChemicalSupplierDocument | null> {
    const doc = await this.documents
      .findOne({ documentHash })
      .populate("supplierCompany")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, updates: DeepPartial<ChemicalSupplierDocument>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
