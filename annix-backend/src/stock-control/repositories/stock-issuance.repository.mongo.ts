import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockIssuance } from "../entities/stock-issuance.entity";
import {
  type StaffItemBreakdownRow,
  type StaffStockFilters,
  type StaffStockReportRow,
  StockIssuanceRepository,
} from "./stock-issuance.repository";

@Injectable()
export class MongoStockIssuanceRepository
  extends MongoTenantScopedRepository<StockIssuance>
  implements StockIssuanceRepository
{
  constructor(
    @InjectModel("StockIssuance") model: Model<StockIssuance>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockIssuanceRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockIssuanceRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockIssuanceRepository {
    return new MongoStockIssuanceRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: StockIssuance): Promise<StockIssuance> {
    if (entity.companyId !== companyId) {
      throw new Error("Stock issuance does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async findManyByStockItemForCompany(
    companyId: number,
    stockItemId: number,
  ): Promise<StockIssuance[]> {
    const docs = await this.documents.find({ companyId, stockItemId }).lean().exec();
    return this.toDomainList(docs);
  }

  private issuedAtRange(filters: StaffStockFilters | undefined): Record<string, unknown> {
    const range: Record<string, unknown> = {};
    if (filters?.startDate) {
      range.$gte = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      range.$lte = new Date(filters.endDate);
    }
    return range;
  }

  async staffStockReportRows(
    companyId: number,
    filters: StaffStockFilters | undefined,
  ): Promise<StaffStockReportRow[]> {
    const match: Record<string, unknown> = { companyId };
    const range = this.issuedAtRange(filters);
    if (Object.keys(range).length > 0) {
      match.issuedAt = range;
    }
    if (filters?.staffMemberId) {
      match.recipientStaffId = filters.staffMemberId;
    }
    if (filters?.stockItemId) {
      match.stockItemId = filters.stockItemId;
    }

    const rows = await this.documents
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "staffmembers",
            localField: "recipientStaffId",
            foreignField: "_id",
            as: "staff",
          },
        },
        { $unwind: "$staff" },
        ...(filters?.departmentId
          ? [{ $match: { "staff.departmentId": filters.departmentId } }]
          : []),
        {
          $lookup: {
            from: "stockitems",
            localField: "stockItemId",
            foreignField: "_id",
            as: "item",
          },
        },
        { $unwind: "$item" },
        {
          $group: {
            _id: "$staff._id",
            staffName: { $first: "$staff.name" },
            employeeNumber: { $first: "$staff.employeeNumber" },
            department: { $first: "$staff.department" },
            departmentId: { $first: "$staff.departmentId" },
            totalQuantityReceived: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$item.costPerUnit"] } },
            issuanceCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantityReceived: -1 } },
      ])
      .exec();

    return rows.map((r) => ({
      staffMemberId: String(r._id),
      staffName: r.staffName,
      employeeNumber: r.employeeNumber ?? null,
      department: r.department ?? null,
      departmentId:
        r.departmentId !== undefined && r.departmentId !== null ? String(r.departmentId) : null,
      totalQuantityReceived:
        r.totalQuantityReceived !== null ? String(r.totalQuantityReceived) : null,
      totalValue: r.totalValue !== null ? String(r.totalValue) : null,
      issuanceCount: r.issuanceCount !== null ? String(r.issuanceCount) : null,
    }));
  }

  async staffItemBreakdownRows(
    companyId: number,
    staffIds: number[],
    filters: StaffStockFilters | undefined,
  ): Promise<StaffItemBreakdownRow[]> {
    const match: Record<string, unknown> = {
      companyId,
      recipientStaffId: { $in: staffIds },
    };
    const range = this.issuedAtRange(filters);
    if (Object.keys(range).length > 0) {
      match.issuedAt = range;
    }
    if (filters?.stockItemId) {
      match.stockItemId = filters.stockItemId;
    }

    const rows = await this.documents
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "stockitems",
            localField: "stockItemId",
            foreignField: "_id",
            as: "item",
          },
        },
        { $unwind: "$item" },
        {
          $group: {
            _id: { staffMemberId: "$recipientStaffId", stockItemId: "$item._id" },
            stockItemName: { $first: "$item.name" },
            sku: { $first: "$item.sku" },
            category: { $first: "$item.category" },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$item.costPerUnit"] } },
          },
        },
      ])
      .exec();

    return rows.map((r) => ({
      staffMemberId: String(r._id.staffMemberId),
      stockItemId: String(r._id.stockItemId),
      stockItemName: r.stockItemName,
      sku: r.sku,
      category: r.category ?? null,
      totalQuantity: r.totalQuantity !== null ? String(r.totalQuantity) : null,
      totalValue: r.totalValue !== null ? String(r.totalValue) : null,
    }));
  }

  async staffStockDetail(
    companyId: number,
    staffMemberId: number,
    filters: { startDate?: string; endDate?: string } | undefined,
  ): Promise<StockIssuance[]> {
    const query: Record<string, unknown> = { companyId, recipientStaffId: staffMemberId };
    const range: Record<string, unknown> = {};
    if (filters?.startDate) {
      range.$gte = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      range.$lte = new Date(filters.endDate);
    }
    if (Object.keys(range).length > 0) {
      query.issuedAt = range;
    }

    const docs = await this.documents
      .find(query)
      .populate(["stockItem", "jobCard", "issuerStaff"])
      .sort({ issuedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
