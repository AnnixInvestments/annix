import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";
import { jobInfoByCardId } from "./mongo-job-info";
import {
  QcShoreHardnessRepository,
  type QcShoreHardnessWithJob,
} from "./qc-shore-hardness.repository";

@Injectable()
export class MongoQcShoreHardnessRepository
  extends MongoCrudRepository<QcShoreHardness>
  implements QcShoreHardnessRepository
{
  constructor(@InjectModel("QcShoreHardness") model: Model<QcShoreHardness>) {
    super(model);
  }

  private get jobCardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("JobCard");
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcShoreHardness[]> {
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
  ): Promise<QcShoreHardness[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcShoreHardness | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    readingDate: string,
  ): Promise<number> {
    return this.documents.countDocuments({ companyId, jobCardId, readingDate }).exec();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcShoreHardnessWithJob[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ readingDate: -1, createdAt: -1 })
      .lean()
      .exec();
    const records = this.toDomainList(docs);
    const jobInfo = await jobInfoByCardId(
      this.jobCardModel,
      records.map((record) => record.jobCardId),
    );
    return records.map((record) => {
      const info = jobInfo.get(record.jobCardId);
      return {
        ...record,
        jobNumber: info ? info.jobNumber : null,
        jcNumber: info ? info.jcNumber : null,
      };
    });
  }
}
