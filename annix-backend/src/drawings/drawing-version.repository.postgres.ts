import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { DrawingVersionRepository } from "./drawing-version.repository";
import { DrawingVersion } from "./entities/drawing-version.entity";

@Injectable()
export class PostgresDrawingVersionRepository
  extends TypeOrmCrudRepository<DrawingVersion>
  implements DrawingVersionRepository
{
  constructor(@InjectRepository(DrawingVersion) repository: Repository<DrawingVersion>) {
    super(repository);
  }

  findByDrawing(drawingId: number, limit?: number): Promise<DrawingVersion[]> {
    return this.repository.find({
      where: { drawing: { id: drawingId } },
      relations: ["uploadedBy"],
      order: { versionNumber: "DESC" },
      ...(limit ? { take: limit } : {}),
    });
  }

  findByDrawingAndVersion(
    drawingId: number,
    versionNumber: number,
  ): Promise<DrawingVersion | null> {
    return this.repository.findOne({
      where: { drawing: { id: drawingId }, versionNumber },
    });
  }
}
