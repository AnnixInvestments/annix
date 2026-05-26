import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcEnvironmentalRecord } from "../entities/qc-environmental-record.entity";
import { jobInfoByCardId } from "./mongo-job-info";
import {
  QcEnvironmentalRecordRepository,
  type QcEnvironmentalRecordWithJob,
} from "./qc-environmental-record.repository";

@Injectable()
export class MongoQcEnvironmentalRecordRepository
  extends MongoCrudRepository<QcEnvironmentalRecord>
  implements QcEnvironmentalRecordRepository
{
  constructor(@InjectModel("QcEnvironmentalRecord") model: Model<QcEnvironmentalRecord>) {
    super(model);
  }

  private get jobCardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("JobCard");
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcEnvironmentalRecord[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<QcEnvironmentalRecord[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ recordDate: -1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardInRange(
    companyId: number,
    jobCardId: number,
    startDate: string,
    endDate: string,
  ): Promise<QcEnvironmentalRecord[]> {
    const docs = await this.documents
      .find({
        companyId,
        jobCardId,
        recordDate: { $gte: startDate, $lte: endDate },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcEnvironmentalRecord | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByJobCardAndDate(
    companyId: number,
    jobCardId: number,
    recordDate: string | undefined,
  ): Promise<QcEnvironmentalRecord | null> {
    const filter: Record<string, unknown> = { companyId, jobCardId };
    if (recordDate !== undefined) {
      filter.recordDate = recordDate;
    }
    const doc = await this.documents.findOne(filter).lean().exec();
    return this.toDomain(doc);
  }

  countForJobCardOnDate(companyId: number, jobCardId: number, recordDate: string): Promise<number> {
    return this.documents.countDocuments({ companyId, jobCardId, recordDate }).exec();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcEnvironmentalRecordWithJob[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ recordDate: -1, createdAt: -1 })
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
