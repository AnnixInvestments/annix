import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";
import { StaffLeaveRecordRepository } from "./staff-leave-record.repository";

@Injectable()
export class MongoStaffLeaveRecordRepository
  extends MongoCrudRepository<StaffLeaveRecord>
  implements StaffLeaveRecordRepository
{
  constructor(@InjectModel("StaffLeaveRecord") model: Model<StaffLeaveRecord>) {
    super(model);
  }

  instantiate(data: DeepPartial<StaffLeaveRecord>): StaffLeaveRecord {
    return { ...data } as StaffLeaveRecord;
  }

  async findForMonth(
    companyId: number,
    monthStart: string,
    monthEnd: string,
  ): Promise<StaffLeaveRecord[]> {
    const documents = await this.documents
      .find({
        companyId,
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      })
      .populate("user")
      .sort({ startDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findForUser(companyId: number, userId: number): Promise<StaffLeaveRecord[]> {
    const documents = await this.documents
      .find({ companyId, userId })
      .sort({ startDate: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByIdAndCompany(recordId: number, companyId: number): Promise<StaffLeaveRecord | null> {
    const document = await this.documents.findOne({ _id: recordId, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findActiveForUser(
    companyId: number,
    userId: number,
    dateStr: string,
  ): Promise<StaffLeaveRecord | null> {
    const document = await this.documents
      .findOne({
        companyId,
        userId,
        startDate: { $lte: dateStr },
        endDate: { $gte: dateStr },
      })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async userIdsOnLeave(companyId: number, dateStr: string): Promise<number[]> {
    const records = await this.documents
      .find({
        companyId,
        startDate: { $lte: dateStr },
        endDate: { $gte: dateStr },
      })
      .select("userId")
      .lean()
      .exec();
    return records.map((r) => r.userId as number);
  }
}
