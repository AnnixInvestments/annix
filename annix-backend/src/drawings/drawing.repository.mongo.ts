import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { DrawingListParams, DrawingRepository } from "./drawing.repository";
import { Drawing } from "./entities/drawing.entity";

@Injectable()
export class MongoDrawingRepository
  extends MongoCrudRepository<Drawing>
  implements DrawingRepository
{
  constructor(@InjectModel("Drawing") model: Model<Drawing>) {
    super(model);
  }

  async findLastByNumberPrefix(prefix: string): Promise<Drawing | null> {
    const document = await this.documents
      .findOne({ drawingNumber: { $regex: `^${prefix}` } })
      .sort({ drawingNumber: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllPaginated(params: DrawingListParams): Promise<[Drawing[], number]> {
    const filter: Record<string, unknown> = {};

    if (params.status) filter.status = params.status;
    if (params.rfqId) filter.rfqId = params.rfqId;
    if (params.uploadedByUserId) filter.uploadedById = params.uploadedByUserId;
    if (params.search) {
      filter.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { description: { $regex: params.search, $options: "i" } },
        { drawingNumber: { $regex: params.search, $options: "i" } },
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

  async findOneWithRelations(id: number): Promise<Drawing | null> {
    const document = await this.documents.findById(id).lean().exec();
    return this.toDomain(document);
  }
}
