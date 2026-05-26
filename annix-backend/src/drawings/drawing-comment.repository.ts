import { CrudRepository } from "../lib/persistence/crud-repository";
import { DrawingComment } from "./entities/drawing-comment.entity";

export abstract class DrawingCommentRepository extends CrudRepository<DrawingComment> {
  abstract findByDrawing(drawingId: number): Promise<DrawingComment[]>;
  abstract findByIdWithDrawing(commentId: number): Promise<DrawingComment | null>;
}
