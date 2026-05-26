import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import { jobInfoByCardId } from "./mongo-job-info";
import {
  QcBlastProfileRepository,
  type QcBlastProfileWithJob,
} from "./qc-blast-profile.repository";

@Injectable()
export class MongoQcBlastProfileRepository
  extends MongoCrudRepository<QcBlastProfile>
  implements QcBlastProfileRepository
{
  constructor(@InjectModel("QcBlastProfile") model: Model<QcBlastProfile>) {
    super(model);
  }

  private get jobCardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("JobCard");
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcBlastProfile[]> {
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
  ): Promise<QcBlastProfile[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcBlastProfile | null> {
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

  async findAllWithJobInfo(companyId: number): Promise<QcBlastProfileWithJob[]> {
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
