import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcPullTest } from "../entities/qc-pull-test.entity";
import { QcPullTestRepository } from "./qc-pull-test.repository";

@Injectable()
export class MongoQcPullTestRepository
  extends MongoCrudRepository<QcPullTest>
  implements QcPullTestRepository
{
  constructor(@InjectModel("QcPullTest") model: Model<QcPullTest>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcPullTest[]> {
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
  ): Promise<QcPullTest[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcPullTest | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
