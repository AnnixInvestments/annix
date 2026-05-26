import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";
import { QcDustDebrisTestRepository } from "./qc-dust-debris-test.repository";

@Injectable()
export class MongoQcDustDebrisTestRepository
  extends MongoCrudRepository<QcDustDebrisTest>
  implements QcDustDebrisTestRepository
{
  constructor(@InjectModel("QcDustDebrisTest") model: Model<QcDustDebrisTest>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcDustDebrisTest[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: -1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDustDebrisTest[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcDustDebrisTest | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
