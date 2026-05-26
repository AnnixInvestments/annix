import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";
import { CpoCalloffRecordRepository } from "./cpo-calloff-record.repository";

@Injectable()
export class MongoCpoCalloffRecordRepository
  extends MongoCrudRepository<CpoCalloffRecord>
  implements CpoCalloffRecordRepository
{
  constructor(@InjectModel("CpoCalloffRecord") model: Model<CpoCalloffRecord>) {
    super(model);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCpoWithJobCard(cpoId: number, companyId: number): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({ cpoId, companyId })
      .populate("jobCard")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<CpoCalloffRecord | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOverdueNeedingReminder(
    twentyOneDaysAgo: Date,
    sevenDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({
        status: CalloffStatus.DELIVERED,
        deliveredAt: { $lte: twentyOneDaysAgo },
        invoicedAt: null,
        $or: [{ lastInvoiceReminderAt: null }, { lastInvoiceReminderAt: { $lte: sevenDaysAgo } }],
      })
      .populate("cpo")
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markReminderSent(ids: number[], reminderAt: Date): Promise<void> {
    await this.documents
      .updateMany({ _id: { $in: ids } }, { lastInvoiceReminderAt: reminderAt })
      .exec();
  }

  countByStatus(companyId: number, status: CalloffStatus): Promise<number> {
    return this.documents.countDocuments({ companyId, status }).exec();
  }

  countOverdueDelivered(companyId: number, twentyOneDaysAgo: Date): Promise<number> {
    return this.documents
      .countDocuments({
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: { $lte: twentyOneDaysAgo },
      })
      .exec();
  }

  async findOverdueForCpoWithJobCard(
    cpoId: number,
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({
        cpoId,
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: { $lte: twentyOneDaysAgo },
        invoicedAt: null,
      })
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findCalledOffWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({ companyId, status: CalloffStatus.CALLED_OFF })
      .populate("cpo")
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompanyWithCpo(companyId: number): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents.find({ companyId }).populate("cpo").lean().exec();
    return this.toDomainList(docs);
  }

  async findOverdueDeliveredWithCpoAndJobCard(
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: { $lte: twentyOneDaysAgo },
        invoicedAt: null,
      })
      .populate("cpo")
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompanyWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate("cpo")
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
