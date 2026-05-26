import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { DrawingCommentRepository } from "./drawing-comment.repository";
import { DrawingComment } from "./entities/drawing-comment.entity";

@Injectable()
export class MongoDrawingCommentRepository
  extends MongoCrudRepository<DrawingComment>
  implements DrawingCommentRepository
{
  constructor(@InjectModel("DrawingComment") model: Model<DrawingComment>) {
    super(model);
  }

  async findByDrawing(drawingId: number): Promise<DrawingComment[]> {
    const docs = await this.documents.find({ drawingId }).sort({ createdAt: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdWithDrawing(commentId: number): Promise<DrawingComment | null> {
    const doc = await this.documents.findById(commentId).lean().exec();
    return this.toDomain(doc);
  }
}
