import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcBatchAssignment } from "../entities/qc-batch-assignment.entity";
import { QcBatchAssignmentRepository } from "./qc-batch-assignment.repository";

@Injectable()
export class MongoQcBatchAssignmentRepository
  extends MongoCrudRepository<QcBatchAssignment>
  implements QcBatchAssignmentRepository
{
  constructor(@InjectModel("QcBatchAssignment") model: Model<QcBatchAssignment>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcBatchAssignment[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ fieldKey: 1, batchNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedByLineItemAndFieldKey(
    companyId: number,
    jobCardId: number,
  ): Promise<QcBatchAssignment[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ lineItemId: 1, fieldKey: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCpo(companyId: number, cpoId: number): Promise<QcBatchAssignment[]> {
    const docs = await this.documents
      .find({ companyId, cpoId })
      .sort({ jobCardId: 1, fieldKey: 1, batchNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByLineItemAndFieldKey(
    lineItemId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment | null> {
    const doc = await this.documents.findOne({ lineItemId, fieldKey }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteByIdForCompany(id: number, companyId: number): Promise<void> {
    await this.documents.deleteOne({ _id: id, companyId }).exec();
  }

  async findLineItemsForFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcBatchAssignment[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId, fieldKey })
      .select({ lineItemId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardAndBatch(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
  ): Promise<QcBatchAssignment[]> {
    const docs = await this.documents.find({ companyId, jobCardId, batchNumber }).lean().exec();
    return this.toDomainList(docs);
  }

  async linkPositectorUpload(
    companyId: number,
    jobCardId: number,
    batchNumber: string,
    positectorUploadId: number,
  ): Promise<void> {
    const normalized = batchNumber.trim().toLowerCase();
    const candidates = await this.documents
      .find({ companyId, jobCardId, positectorUploadId: null })
      .lean()
      .exec();
    const matchedIds = candidates
      .filter(
        (doc) =>
          ((doc as { batchNumber?: string | null }).batchNumber || "").trim().toLowerCase() ===
          normalized,
      )
      .map((doc) => (doc as { _id: number })._id);
    if (matchedIds.length === 0) {
      return;
    }
    await this.documents
      .updateMany({ _id: { $in: matchedIds } }, { $set: { positectorUploadId } })
      .exec();
  }
}
