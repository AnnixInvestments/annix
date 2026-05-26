import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BoqListParams, BoqRepository, BoqRfqLink } from "./boq.repository";
import { Boq } from "./entities/boq.entity";
import { BoqLineItem } from "./entities/boq-line-item.entity";

@Injectable()
export class PostgresBoqRepository extends TypeOrmCrudRepository<Boq> implements BoqRepository {
  constructor(
    @InjectRepository(Boq) repository: Repository<Boq>,
    @InjectRepository(BoqLineItem) private readonly lineItemRepository: Repository<BoqLineItem>,
  ) {
    super(repository);
  }

  findLastByNumberPrefix(prefix: string): Promise<Boq | null> {
    return this.repository
      .createQueryBuilder("boq")
      .where("boq.boq_number LIKE :prefix", { prefix: `${prefix}%` })
      .orderBy("boq.boq_number", "DESC")
      .getOne();
  }

  async findAllPaginated(params: BoqListParams): Promise<[Boq[], number]> {
    let qb = this.repository
      .createQueryBuilder("boq")
      .leftJoinAndSelect("boq.createdBy", "createdBy")
      .leftJoinAndSelect("boq.drawing", "drawing")
      .leftJoinAndSelect("boq.rfq", "rfq");

    if (params.status) {
      qb = qb.andWhere("boq.status = :status", { status: params.status });
    }
    if (params.drawingId) {
      qb = qb.andWhere("boq.drawing_id = :drawingId", { drawingId: params.drawingId });
    }
    if (params.rfqId) {
      qb = qb.andWhere("boq.rfq_id = :rfqId", { rfqId: params.rfqId });
    }
    if (params.createdByUserId) {
      qb = qb.andWhere("boq.created_by_user_id = :userId", {
        userId: params.createdByUserId,
      });
    }
    if (params.search) {
      qb = qb.andWhere(
        "(boq.title ILIKE :search OR boq.description ILIKE :search OR boq.boq_number ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    return qb
      .orderBy("boq.updated_at", "DESC")
      .skip(params.skip)
      .take(params.limit)
      .getManyAndCount();
  }

  findOneWithRelations(id: number): Promise<Boq | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["createdBy", "drawing", "rfq", "lineItems"],
      order: {
        lineItems: { lineNumber: "ASC" },
      },
    });
  }

  async recalculateTotals(boqId: number): Promise<void> {
    const result = await this.lineItemRepository
      .createQueryBuilder("item")
      .where("item.boq_id = :boqId", { boqId })
      .select([
        "SUM(item.quantity) as totalQuantity",
        "SUM(item.total_weight_kg) as totalWeightKg",
        "SUM(item.total_price) as totalEstimatedCost",
      ])
      .getRawOne();

    await this.repository.update(boqId, {
      totalQuantity: result.totalQuantity || 0,
      totalWeightKg: result.totalWeightKg || 0,
      totalEstimatedCost: result.totalEstimatedCost || 0,
    });
  }

  async findRfqLinksByRfqIds(rfqIds: number[]): Promise<BoqRfqLink[]> {
    const boqs = await this.repository
      .createQueryBuilder("boq")
      .select(["boq.id", "boq.rfq"])
      .innerJoin("boq.rfq", "rfq")
      .addSelect("rfq.id")
      .where("rfq.id IN (:...rfqIds)", { rfqIds })
      .getMany();

    return boqs.map((boq) => ({ boqId: boq.id, rfqId: boq.rfq?.id as number }));
  }

  findByRfqId(rfqId: number): Promise<Boq[]> {
    return this.repository.find({ where: { rfq: { id: rfqId } } });
  }
}
