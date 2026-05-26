import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { DrawingVersionRepository } from "./drawing-version.repository";
import { DrawingVersion } from "./entities/drawing-version.entity";

@Injectable()
export class MongoDrawingVersionRepository
  extends MongoCrudRepository<DrawingVersion>
  implements DrawingVersionRepository
{
  constructor(@InjectModel("DrawingVersion") model: Model<DrawingVersion>) {
    super(model);
  }

  async findByDrawing(drawingId: number, limit?: number): Promise<DrawingVersion[]> {
    const query = this.documents.find({ drawingId }).sort({ versionNumber: -1 });
    if (limit) query.limit(limit);
    const docs = await query.lean().exec();
    return this.toDomainList(docs);
  }

  async findByDrawingAndVersion(
    drawingId: number,
    versionNumber: number,
  ): Promise<DrawingVersion | null> {
    const doc = await this.documents.findOne({ drawingId, versionNumber }).lean().exec();
    return this.toDomain(doc);
  }
}
