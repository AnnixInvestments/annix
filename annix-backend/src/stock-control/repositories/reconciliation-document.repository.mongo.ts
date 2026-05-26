import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ReconciliationDocument } from "../entities/reconciliation-document.entity";
import { ReconciliationDocumentRepository } from "./reconciliation-document.repository";

@Injectable()
export class MongoReconciliationDocumentRepository
  extends MongoCrudRepository<ReconciliationDocument>
  implements ReconciliationDocumentRepository
{
  constructor(
    @InjectModel("ReconciliationDocument")
    model: Model<ReconciliationDocument>,
  ) {
    super(model);
  }

  async findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationDocument[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ documentCategory: 1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<ReconciliationDocument | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findById(id: number): Promise<ReconciliationDocument | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, changes: DeepPartial<ReconciliationDocument>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }
}
