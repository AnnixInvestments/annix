import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import {
  type CpoSearchRow,
  CustomerPurchaseOrderRepository,
} from "./customer-purchase-order.repository";

@Injectable()
export class MongoCustomerPurchaseOrderRepository
  extends MongoTenantScopedRepository<CustomerPurchaseOrder>
  implements CustomerPurchaseOrderRepository
{
  constructor(
    @InjectModel("CustomerPurchaseOrder") model: Model<CustomerPurchaseOrder>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoCustomerPurchaseOrderRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoCustomerPurchaseOrderRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoCustomerPurchaseOrderRepository {
    return new MongoCustomerPurchaseOrderRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: CustomerPurchaseOrder,
  ): Promise<CustomerPurchaseOrder> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: CustomerPurchaseOrder): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("CPO does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findPaginatedWithItems(
    companyId: number,
    status: string | null,
    page: number,
    limit: number,
  ): Promise<CustomerPurchaseOrder[]> {
    const filter: Record<string, unknown> = { companyId };
    if (status) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .populate("items")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithItems(
    id: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrder | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("items")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithItems(id: number): Promise<CustomerPurchaseOrder | null> {
    const doc = await this.documents.findById(id).populate("items").lean().exec();
    return this.toDomain(doc);
  }

  async findOneByNumberWithItems(
    cpoNumber: string,
    companyId: number,
  ): Promise<CustomerPurchaseOrder | null> {
    const doc = await this.documents
      .findOne({ cpoNumber, companyId })
      .populate("items")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<CustomerPurchaseOrder | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveByJobNumberWithItems(
    companyId: number,
    jobNumber: string,
  ): Promise<CustomerPurchaseOrder[]> {
    const docs = await this.documents
      .find({ companyId, jobNumber, status: CpoStatus.ACTIVE })
      .populate("items")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyWithItems(companyId: number): Promise<CustomerPurchaseOrder[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate("items")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<CustomerPurchaseOrder>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  countByStatus(companyId: number, status: CpoStatus): Promise<number> {
    return this.documents.countDocuments({ companyId, status }).exec();
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<CpoSearchRow[]> {
    const escaped = pattern.replace(/%/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const docs = await this.documents
      .find({
        companyId,
        $or: [
          { cpoNumber: regex },
          { jobNumber: regex },
          { jobName: regex },
          { customerName: regex },
          { poNumber: regex },
        ],
      })
      .select("_id cpoNumber jobNumber jobName customerName poNumber status updatedAt")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: doc._id as number,
      cpoNumber: doc.cpoNumber as string,
      jobNumber: doc.jobNumber as string,
      jobName: (doc.jobName as string) ?? null,
      customerName: (doc.customerName as string) ?? null,
      poNumber: (doc.poNumber as string) ?? null,
      status: doc.status as string,
      updatedAt: doc.updatedAt as Date,
    }));
  }
}
