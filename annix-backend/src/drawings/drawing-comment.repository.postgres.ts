import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { DrawingCommentRepository } from "./drawing-comment.repository";
import { DrawingComment } from "./entities/drawing-comment.entity";

@Injectable()
export class PostgresDrawingCommentRepository
  extends TypeOrmCrudRepository<DrawingComment>
  implements DrawingCommentRepository
{
  constructor(@InjectRepository(DrawingComment) repository: Repository<DrawingComment>) {
    super(repository);
  }

  findByDrawing(drawingId: number): Promise<DrawingComment[]> {
    return this.repository.find({
      where: { drawing: { id: drawingId } },
      relations: ["user", "parentComment"],
      order: { createdAt: "ASC" },
    });
  }

  findByIdWithDrawing(commentId: number): Promise<DrawingComment | null> {
    return this.repository.findOne({
      where: { id: commentId },
      relations: ["drawing"],
    });
  }
}
