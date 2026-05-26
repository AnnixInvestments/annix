import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcItemsRelease } from "../entities/qc-items-release.entity";
import { QcItemsReleaseRepository } from "./qc-items-release.repository";

@Injectable()
export class MongoQcItemsReleaseRepository
  extends MongoCrudRepository<QcItemsRelease>
  implements QcItemsReleaseRepository
{
  constructor(@InjectModel("QcItemsRelease") model: Model<QcItemsRelease>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcItemsRelease[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcItemsRelease[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCpo(companyId: number, cpoId: number): Promise<QcItemsRelease[]> {
    const docs = await this.documents
      .find({ companyId, cpoId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcItemsRelease | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForJobCard(jobCardId: number, companyId: number): Promise<QcItemsRelease[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async removeMany(entities: QcItemsRelease[]): Promise<void> {
    const ids = entities.map((entity) => entity.id);
    if (ids.length === 0) {
      return;
    }
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }

  async findChildReleasesInWindow(
    companyId: number,
    windowStart: Date,
    windowEnd: Date,
    createdById: number | null,
  ): Promise<QcItemsRelease[]> {
    const docs = await this.documents
      .find({
        companyId,
        cpoId: null,
        jobCardId: { $ne: null },
        createdAt: { $gte: windowStart, $lte: windowEnd },
        createdById,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
