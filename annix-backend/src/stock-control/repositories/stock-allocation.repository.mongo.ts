import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { type CostByJobRow, StockAllocationRepository } from "./stock-allocation.repository";

@Injectable()
export class MongoStockAllocationRepository
  extends MongoCrudRepository<StockAllocation>
  implements StockAllocationRepository
{
  constructor(@InjectModel("StockAllocation") model: Model<StockAllocation>) {
    super(model);
  }

  async findActiveExistingByJobAndStockItem(
    companyId: number,
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation[]> {
    const docs = await this.documents
      .find({
        jobCardId,
        stockItemId,
        companyId,
        pendingApproval: false,
        rejectedAt: null,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingForCompany(companyId: number): Promise<StockAllocation[]> {
    const docs = await this.documents
      .find({ companyId, pendingApproval: true })
      .populate(["stockItem", "jobCard"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardWithRelations(
    companyId: number,
    jobCardId: number,
  ): Promise<StockAllocation[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .populate(nestPopulate(["stockItem", "stockItem.sourceJobCard"]))
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardPaginated(
    companyId: number,
    jobCardId: number,
    page: number,
    limit: number,
  ): Promise<[StockAllocation[], number]> {
    const [docs, total] = await Promise.all([
      this.documents
        .find({ jobCardId, companyId })
        .populate(["stockItem", "staffMember"])
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments({ jobCardId, companyId }).exec(),
    ]);
    return [this.toDomainList(docs), total];
  }

  async findOnePendingForCompany(id: number, companyId: number): Promise<StockAllocation | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId, pendingApproval: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockAllocation | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByJobAndStockItem(
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation | null> {
    const doc = await this.documents
      .findOne({ jobCardId, stockItemId })
      .populate("stockItem")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForJobCardWithStockItem(
    companyId: number,
    jobCardId: number,
  ): Promise<StockAllocation[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .populate("stockItem")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingByIdsForJobCard(
    ids: number[],
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation[]> {
    const docs = await this.documents
      .find({
        _id: { $in: ids },
        jobCardId,
        companyId,
        undone: false,
        issuedAt: null,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null> {
    const doc = await this.documents
      .findOne({ _id: id, jobCardId, companyId, undone: false })
      .populate("stockItem")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveUnissuedByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null> {
    const doc = await this.documents
      .findOne({ _id: id, jobCardId, companyId, undone: false, issuedAt: null })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async saveMany(entities: StockAllocation[]): Promise<StockAllocation[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async costByJob(companyId: number): Promise<CostByJobRow[]> {
    const rows = await this.documents
      .aggregate<{
        _id: number;
        jobNumber: string;
        jobName: string;
        customerName: string;
        totalCost: number;
        totalItemsAllocated: number;
      }>([
        { $match: { companyId } },
        {
          $lookup: {
            from: "job_cards",
            localField: "jobCardId",
            foreignField: "_id",
            as: "jobCard",
          },
        },
        { $unwind: "$jobCard" },
        {
          $lookup: {
            from: "stock_items",
            localField: "stockItemId",
            foreignField: "_id",
            as: "stockItem",
          },
        },
        { $unwind: "$stockItem" },
        {
          $group: {
            _id: "$jobCard._id",
            jobNumber: { $first: "$jobCard.jobNumber" },
            jobName: { $first: "$jobCard.jobName" },
            customerName: { $first: "$jobCard.customerName" },
            totalCost: {
              $sum: { $multiply: ["$quantityUsed", "$stockItem.costPerUnit"] },
            },
            totalItemsAllocated: { $sum: "$quantityUsed" },
          },
        },
        { $sort: { totalCost: -1 } },
      ])
      .exec();

    return rows.map((r) => ({
      jobCardId: Number(r._id),
      jobNumber: r.jobNumber,
      jobName: r.jobName,
      customerName: r.customerName,
      totalCost: Number(r.totalCost || 0),
      totalItemsAllocated: Number(r.totalItemsAllocated || 0),
    }));
  }
}
