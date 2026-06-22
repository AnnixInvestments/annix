import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";
import { CpoCalloffRecordRepository } from "./cpo-calloff-record.repository";

@Injectable()
export class MongoCpoCalloffRecordRepository
  extends MongoTenantScopedRepository<CpoCalloffRecord>
  implements CpoCalloffRecordRepository
{
  constructor(
    @InjectModel("CpoCalloffRecord") model: Model<CpoCalloffRecord>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoCpoCalloffRecordRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoCpoCalloffRecordRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoCpoCalloffRecordRepository {
    return new MongoCpoCalloffRecordRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: CpoCalloffRecord): Promise<CpoCalloffRecord> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO call-off record does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: CpoCalloffRecord): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO call-off record does not belong to the requesting company");
    }
    await this.remove(entity);
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
