import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { IssuanceBatchRecordRepository } from "./issuance-batch-record.repository";

@Injectable()
export class MongoIssuanceBatchRecordRepository
  extends MongoTenantScopedRepository<IssuanceBatchRecord>
  implements IssuanceBatchRecordRepository
{
  constructor(
    @InjectModel("IssuanceBatchRecord")
    model: Model<IssuanceBatchRecord>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoIssuanceBatchRecordRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuanceBatchRecordRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoIssuanceBatchRecordRepository {
    return new MongoIssuanceBatchRecordRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: IssuanceBatchRecord,
  ): Promise<IssuanceBatchRecord> {
    if (entity.companyId !== companyId) {
      throw new Error("Issuance batch record does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: IssuanceBatchRecord): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Issuance batch record does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardWithCertificate(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .populate({
        path: "supplierCertificate",
        populate: [{ path: "supplier" }, { path: "stockItem" }],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardWithDetails(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .populate("stockItem")
      .populate({ path: "supplierCertificate", populate: { path: "supplier" } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByBatchNumberWithDetails(
    companyId: number,
    batchNumber: string,
  ): Promise<IssuanceBatchRecord[]> {
    const docs = await this.documents
      .find({ companyId, batchNumber: batchNumber.trim() })
      .populate("stockItem")
      .populate({ path: "supplierCertificate", populate: { path: "supplier" } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async certificateCountsByJobCard(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Array<{ jobCardId: number; certCount: string }>> {
    const rows = await this.documents
      .aggregate([
        {
          $match: {
            companyId,
            jobCardId: { $in: jobCardIds },
            supplierCertificateId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$jobCardId",
            certs: { $addToSet: "$supplierCertificateId" },
          },
        },
        { $project: { jobCardId: "$_id", certCount: { $size: "$certs" } } },
      ])
      .exec();
    return rows.map((row) => ({
      jobCardId: Number(row.jobCardId),
      certCount: String(row.certCount),
    }));
  }

  async recentBatchNumbers(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<string[]> {
    const docs = await this.documents
      .find({ companyId, stockItemId })
      .select("batchNumber")
      .sort({ batchNumber: 1 })
      .limit(limit)
      .lean()
      .exec();
    const seen = new Set<string>();
    return docs
      .map((doc) => doc.batchNumber as string)
      .filter((batchNumber) => {
        if (seen.has(batchNumber)) {
          return false;
        }
        seen.add(batchNumber);
        return true;
      });
  }

  async findUnlinkedToCertificate(companyId: number): Promise<IssuanceBatchRecord[]> {
    const docs = await this.documents
      .find({ companyId, supplierCertificateId: null })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<IssuanceBatchRecord>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }
}
