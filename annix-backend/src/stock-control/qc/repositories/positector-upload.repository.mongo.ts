import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { PositectorUpload } from "../entities/positector-upload.entity";
import { PositectorUploadRepository } from "./positector-upload.repository";

@Injectable()
export class MongoPositectorUploadRepository
  extends MongoCrudRepository<PositectorUpload>
  implements PositectorUploadRepository
{
  constructor(@InjectModel("PositectorUpload") model: Model<PositectorUpload>) {
    super(model);
  }

  async findMissingMeasurementDate(): Promise<PositectorUpload[]> {
    const docs = await this.documents.find({ measurementDate: null }).lean().exec();
    return this.toDomainList(docs);
  }

  async findBundleNamed(): Promise<PositectorUpload[]> {
    const docs = await this.documents
      .find({ batchName: { $regex: "^bundle_" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBundleNamedForCompany(companyId: number): Promise<PositectorUpload[]> {
    const docs = await this.documents
      .find({ companyId, batchName: { $regex: "^bundle_" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, updates: Partial<PositectorUpload>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]> {
    const docs = await this.documents
      .find({ companyId, linkedJobCardId: jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByFingerprint(
    companyId: number,
    fingerprint: string,
  ): Promise<PositectorUpload | null> {
    const doc = await this.documents.findOne({ companyId, fingerprint }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForCompany(companyId: number): Promise<PositectorUpload[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<PositectorUpload | null> {
    const doc = await this.documents.findOne({ companyId, _id: id }).lean().exec();
    return this.toDomain(doc);
  }

  async findUnlinkedForCompany(
    companyId: number,
    entityType: string | undefined,
  ): Promise<PositectorUpload[]> {
    const filter: Record<string, unknown> = { companyId, linkedJobCardId: null };
    if (entityType) {
      filter.entityType = entityType;
    }
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findUnlinkedByBatchName(companyId: number, batchName: string): Promise<PositectorUpload[]> {
    const normalized = batchName.trim().toLowerCase();
    const docs = await this.documents.find({ companyId, linkedJobCardId: null }).lean().exec();
    const matched = docs.filter(
      (doc) =>
        ((doc as { batchName?: string | null }).batchName || "").trim().toLowerCase() ===
        normalized,
    );
    return this.toDomainList(matched);
  }

  async findUnlinkedEnvironmentalInRange(
    companyId: number,
    earliestDate: string,
    latestDate: string,
  ): Promise<PositectorUpload[]> {
    const docs = await this.documents
      .find({
        companyId,
        entityType: "environmental",
        linkedJobCardId: null,
        measurementDate: { $gte: earliestDate, $lte: latestDate },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLinkedToJobCard(companyId: number, jobCardId: number): Promise<PositectorUpload[]> {
    const docs = await this.documents.find({ linkedJobCardId: jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}
