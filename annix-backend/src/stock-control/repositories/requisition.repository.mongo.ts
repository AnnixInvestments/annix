import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionRepository } from "./requisition.repository";

@Injectable()
export class MongoRequisitionRepository
  extends MongoTenantScopedRepository<Requisition>
  implements RequisitionRepository
{
  constructor(
    @InjectModel("Requisition") model: Model<Requisition>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoRequisitionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRequisitionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoRequisitionRepository {
    return new MongoRequisitionRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: Requisition): Promise<Requisition> {
    if (entity.companyId !== companyId) {
      throw new Error("Requisition does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: Requisition): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Requisition does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findActiveForJobCard(companyId: number, jobCardId: number): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({
        jobCardId,
        companyId,
        status: { $ne: RequisitionStatus.CANCELLED },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveForJobCardWithItems(
    companyId: number,
    jobCardId: number,
  ): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({
        jobCardId,
        companyId,
        status: { $ne: RequisitionStatus.CANCELLED },
      })
      .populate("items")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findAllForCompanyPaginated(
    companyId: number,
    page: number,
    limit: number,
  ): Promise<Requisition[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["jobCard", "items"])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithDetails(id: number, companyId: number): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(nestPopulate(["jobCard", "items", "items.stockItem"]))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithItems(id: number, companyId: number): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("items")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByExactNumber(
    companyId: number,
    requisitionNumber: string,
  ): Promise<Requisition | null> {
    const doc = await this.documents.findOne({ companyId, requisitionNumber }).lean().exec();
    return this.toDomain(doc);
  }

  countByNumberPrefix(companyId: number, prefix: string): Promise<number> {
    return this.documents
      .countDocuments({ companyId, requisitionNumber: { $regex: `^${prefix}` } })
      .exec();
  }

  async findActiveReorderByNumber(
    companyId: number,
    requisitionNumber: string,
    source: RequisitionSource,
  ): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({
        requisitionNumber,
        companyId,
        source,
        status: { $ne: RequisitionStatus.CANCELLED },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForCpo(cpoId: number, companyId: number): Promise<Requisition | null> {
    const doc = await this.documents.findOne({ cpoId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findCalloffForCpo(cpoId: number, companyId: number): Promise<Requisition | null> {
    const doc = await this.documents
      .findOne({ cpoId, companyId, isCalloffOrder: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
