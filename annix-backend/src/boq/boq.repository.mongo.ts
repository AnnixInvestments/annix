import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BoqListParams, BoqRepository, BoqRfqLink } from "./boq.repository";
import { Boq } from "./entities/boq.entity";
import { BoqLineItem } from "./entities/boq-line-item.entity";

@Injectable()
export class MongoBoqRepository extends MongoCrudRepository<Boq> implements BoqRepository {
  constructor(
    @InjectModel("Boq") model: Model<Boq>,
    @InjectModel("BoqLineItem") private readonly lineItemModel: Model<BoqLineItem>,
  ) {
    super(model);
  }

  async findLastByNumberPrefix(prefix: string): Promise<Boq | null> {
    const document = await this.documents
      .findOne({ boqNumber: { $regex: `^${prefix}` } })
      .sort({ boqNumber: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllPaginated(params: BoqListParams): Promise<[Boq[], number]> {
    const filter: Record<string, unknown> = {};

    if (params.status) filter.status = params.status;
    if (params.drawingId) filter.drawingId = params.drawingId;
    if (params.rfqId) filter.rfqId = params.rfqId;
    if (params.createdByUserId) filter.createdById = params.createdByUserId;
    if (params.search) {
      filter.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { description: { $regex: params.search, $options: "i" } },
        { boqNumber: { $regex: params.search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(params.skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return [this.toDomainList(docs), total];
  }

  async findOneWithRelations(id: number): Promise<Boq | null> {
    const document = await this.documents.findById(id).lean().exec();
    return this.toDomain(document);
  }

  async recalculateTotals(boqId: number): Promise<void> {
    const [totals] = await this.lineItemModel
      .aggregate<{
        totalQuantity: number;
        totalWeightKg: number;
        totalEstimatedCost: number;
      }>([
        { $match: { boqId } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
            totalWeightKg: { $sum: "$totalWeightKg" },
            totalEstimatedCost: { $sum: "$totalPrice" },
          },
        },
      ])
      .exec();

    await this.documents
      .findByIdAndUpdate(boqId, {
        $set: {
          totalQuantity: totals?.totalQuantity || 0,
          totalWeightKg: totals?.totalWeightKg || 0,
          totalEstimatedCost: totals?.totalEstimatedCost || 0,
        },
      })
      .exec();
  }

  async findRfqLinksByRfqIds(rfqIds: number[]): Promise<BoqRfqLink[]> {
    const docs = await this.documents
      .find({ rfqId: { $in: rfqIds } })
      .select({ _id: 1, rfqId: 1 })
      .lean()
      .exec();
    return docs.map((doc) => ({
      boqId: doc._id as number,
      rfqId: doc.rfqId as number,
    }));
  }

  async findByRfqId(rfqId: number): Promise<Boq[]> {
    const docs = await this.documents.find({ rfqId }).lean().exec();
    return this.toDomainList(docs);
  }
}
