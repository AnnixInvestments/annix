import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcDefelskoBatch } from "../entities/qc-defelsko-batch.entity";
import { jobInfoByCardId } from "./mongo-job-info";
import { type DefelskoBatchMatch, QcDefelskoBatchRepository } from "./qc-defelsko-batch.repository";

@Injectable()
export class MongoQcDefelskoBatchRepository
  extends MongoCrudRepository<QcDefelskoBatch>
  implements QcDefelskoBatchRepository
{
  constructor(@InjectModel("QcDefelskoBatch") model: Model<QcDefelskoBatch>) {
    super(model);
  }

  private get jobCardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("JobCard");
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcDefelskoBatch[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ category: 1, fieldKey: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByJobCardAndFieldKey(
    companyId: number,
    jobCardId: number,
    fieldKey: string,
  ): Promise<QcDefelskoBatch | null> {
    const doc = await this.documents.findOne({ companyId, jobCardId, fieldKey }).lean().exec();
    return this.toDomain(doc);
  }

  async matchActiveByBatchNumber(
    companyId: number,
    batchNumber: string,
  ): Promise<DefelskoBatchMatch | null> {
    const normalized = batchNumber.trim().toLowerCase();
    const docs = await this.documents.find({ companyId, notApplicable: false }).lean().exec();
    const matched = docs.find(
      (doc) =>
        ((doc as { batchNumber?: string | null }).batchNumber || "").trim().toLowerCase() ===
        normalized,
    );
    if (!matched) {
      return null;
    }
    const batch = this.toDomain(matched) as QcDefelskoBatch;
    const jobInfo = await jobInfoByCardId(this.jobCardModel, [batch.jobCardId]);
    const info = jobInfo.get(batch.jobCardId);
    return {
      batch,
      jobNumber: info ? info.jobNumber : null,
      jcNumber: info ? info.jcNumber : null,
    };
  }

  async findForJobCardWithCertLinked(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDefelskoBatch[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId, supplierCertificateId: { $ne: null } })
      .populate({
        path: "supplierCertificate",
        populate: [{ path: "supplier" }, { path: "stockItem" }],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUnlinkedByCategories(
    companyId: number,
    categories: string[],
  ): Promise<QcDefelskoBatch[]> {
    const docs = await this.documents
      .find({ companyId, supplierCertificateId: null, category: { $in: categories } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateSupplierCertificateId(id: number, supplierCertificateId: number): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: { supplierCertificateId } }).exec();
  }
}
