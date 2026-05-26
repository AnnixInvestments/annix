import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  type CompoundMovementReferenceType,
  RubberCompoundMovement,
} from "../entities/rubber-compound-movement.entity";
import {
  type CompoundMovementFilters,
  RubberCompoundMovementRepository,
} from "./rubber-compound-movement.repository";

@Injectable()
export class PostgresRubberCompoundMovementRepository
  extends TypeOrmCrudRepository<RubberCompoundMovement>
  implements RubberCompoundMovementRepository
{
  constructor(
    @InjectRepository(RubberCompoundMovement)
    repository: Repository<RubberCompoundMovement>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberCompoundMovement>): RubberCompoundMovement {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompoundMovement>);
  }

  findAllWithRelationsFiltered(
    filters?: CompoundMovementFilters,
  ): Promise<RubberCompoundMovement[]> {
    const query = this.repository
      .createQueryBuilder("movement")
      .leftJoinAndSelect("movement.compoundStock", "stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .orderBy("movement.created_at", "DESC");

    if (filters?.compoundStockId) {
      query.andWhere("movement.compound_stock_id = :stockId", {
        stockId: filters.compoundStockId,
      });
    }
    if (filters?.movementType) {
      query.andWhere("movement.movement_type = :type", { type: filters.movementType });
    }
    if (filters?.referenceType) {
      query.andWhere("movement.reference_type = :refType", { refType: filters.referenceType });
    }

    return query.getMany();
  }

  findOneByIdWithRelations(id: number): Promise<RubberCompoundMovement | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
  }

  countByReference(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<number> {
    return this.repository.count({
      where: { referenceType, referenceId },
    });
  }

  findByReferenceWithStock(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<RubberCompoundMovement[]> {
    return this.repository.find({
      where: { referenceType, referenceId },
      relations: ["compoundStock"],
    });
  }
}
