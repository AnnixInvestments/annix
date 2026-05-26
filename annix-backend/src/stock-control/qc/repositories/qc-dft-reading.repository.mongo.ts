import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { DftCoatType, QcDftReading } from "../entities/qc-dft-reading.entity";
import { jobInfoByCardId } from "./mongo-job-info";
import { QcDftReadingRepository, type QcDftReadingWithJob } from "./qc-dft-reading.repository";

@Injectable()
export class MongoQcDftReadingRepository
  extends MongoCrudRepository<QcDftReading>
  implements QcDftReadingRepository
{
  constructor(@InjectModel("QcDftReading") model: Model<QcDftReading>) {
    super(model);
  }

  private get jobCardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("JobCard");
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcDftReading[]> {
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
  ): Promise<QcDftReading[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ readingDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcDftReading | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  countForJobCardCoatOnDate(
    companyId: number,
    jobCardId: number,
    coatType: DftCoatType,
    readingDate: string,
  ): Promise<number> {
    return this.documents.countDocuments({ companyId, jobCardId, coatType, readingDate }).exec();
  }

  async findAllWithJobInfo(companyId: number): Promise<QcDftReadingWithJob[]> {
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
