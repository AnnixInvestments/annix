import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  BoqSupplierAccessRepository,
  BoqSupplierStatusCount,
} from "./boq-supplier-access.repository";
import { BoqSupplierAccess, SupplierBoqStatus } from "./entities/boq-supplier-access.entity";

@Injectable()
export class MongoBoqSupplierAccessRepository
  extends MongoCrudRepository<BoqSupplierAccess>
  implements BoqSupplierAccessRepository
{
  constructor(@InjectModel("BoqSupplierAccess") model: Model<BoqSupplierAccess>) {
    super(model);
  }

  async deleteByBoqId(boqId: number): Promise<void> {
    await this.documents.deleteMany({ boqId }).exec();
  }

  async countDistinctSuppliersByStatusForBoqs(boqIds: number[]): Promise<BoqSupplierStatusCount[]> {
    const rows = await this.documents
      .aggregate<{ _id: { boqId: number; status: string }; count: number }>([
        { $match: { boqId: { $in: boqIds } } },
        {
          $group: {
            _id: { boqId: "$boqId", status: "$status" },
            suppliers: { $addToSet: "$supplierProfileId" },
          },
        },
        {
          $project: {
            _id: 1,
            count: { $size: "$suppliers" },
          },
        },
      ])
      .exec();

    return rows.map((row) => ({
      boqId: row._id.boqId,
      status: row._id.status,
      count: String(row.count),
    }));
  }

  async findByBoqAndSupplier(
    boqId: number,
    supplierProfileId: number,
  ): Promise<BoqSupplierAccess | null> {
    const doc = await this.documents.findOne({ boqId, supplierProfileId }).lean().exec();
    return this.toDomain(doc);
  }

  async findBySupplier(
    supplierProfileId: number,
    status?: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]> {
    const filter: Record<string, unknown> = { supplierProfileId };
    if (status) filter.status = status;
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByBoqId(boqId: number): Promise<BoqSupplierAccess[]> {
    const docs = await this.documents.find({ boqId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findBySupplierAndStatuses(
    supplierProfileId: number,
    statuses: SupplierBoqStatus[],
  ): Promise<BoqSupplierAccess[]> {
    const docs = await this.documents
      .find({ supplierProfileId, status: { $in: statuses } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByBoqIdsExcludingStatus(
    boqIds: number[],
    excludedStatus: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]> {
    const docs = await this.documents
      .find({ boqId: { $in: boqIds }, status: { $ne: excludedStatus } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
