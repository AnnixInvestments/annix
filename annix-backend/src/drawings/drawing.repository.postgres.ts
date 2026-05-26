import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { DrawingListParams, DrawingRepository } from "./drawing.repository";
import { Drawing } from "./entities/drawing.entity";

@Injectable()
export class PostgresDrawingRepository
  extends TypeOrmCrudRepository<Drawing>
  implements DrawingRepository
{
  constructor(@InjectRepository(Drawing) repository: Repository<Drawing>) {
    super(repository);
  }

  findLastByNumberPrefix(prefix: string): Promise<Drawing | null> {
    return this.repository
      .createQueryBuilder("drawing")
      .where("drawing.drawing_number LIKE :prefix", { prefix: `${prefix}%` })
      .orderBy("drawing.drawing_number", "DESC")
      .getOne();
  }

  async findAllPaginated(params: DrawingListParams): Promise<[Drawing[], number]> {
    let qb = this.repository
      .createQueryBuilder("drawing")
      .leftJoinAndSelect("drawing.uploadedBy", "uploadedBy")
      .leftJoinAndSelect("drawing.rfq", "rfq");

    if (params.status) {
      qb = qb.andWhere("drawing.status = :status", { status: params.status });
    }
    if (params.rfqId) {
      qb = qb.andWhere("drawing.rfq_id = :rfqId", { rfqId: params.rfqId });
    }
    if (params.uploadedByUserId) {
      qb = qb.andWhere("drawing.uploaded_by_user_id = :userId", {
        userId: params.uploadedByUserId,
      });
    }
    if (params.search) {
      qb = qb.andWhere(
        "(drawing.title ILIKE :search OR drawing.description ILIKE :search OR drawing.drawing_number ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    return qb
      .orderBy("drawing.updated_at", "DESC")
      .skip(params.skip)
      .take(params.limit)
      .getManyAndCount();
  }

  findOneWithRelations(id: number): Promise<Drawing | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["uploadedBy", "rfq"],
    });
  }
}
