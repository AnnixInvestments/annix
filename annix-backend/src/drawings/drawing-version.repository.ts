import { CrudRepository } from "../lib/persistence/crud-repository";
import { DrawingVersion } from "./entities/drawing-version.entity";

export abstract class DrawingVersionRepository extends CrudRepository<DrawingVersion> {
  abstract findByDrawing(drawingId: number, limit?: number): Promise<DrawingVersion[]>;
  abstract findByDrawingAndVersion(
    drawingId: number,
    versionNumber: number,
  ): Promise<DrawingVersion | null>;
}
