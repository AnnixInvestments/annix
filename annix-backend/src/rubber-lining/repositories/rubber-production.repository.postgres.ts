import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberProduction, RubberProductionStatus } from "../entities/rubber-production.entity";
import { RubberProductionRepository } from "./rubber-production.repository";

const PRODUCTION_RELATIONS = ["product", "compoundStock", "compoundStock.compoundCoding"];

@Injectable()
export class PostgresRubberProductionRepository
  extends TypeOrmCrudRepository<RubberProduction>
  implements RubberProductionRepository
{
  constructor(@InjectRepository(RubberProduction) repository: Repository<RubberProduction>) {
    super(repository);
  }

  build(data: Partial<RubberProduction>): RubberProduction {
    return this.repository.create(data as TypeOrmDeepPartial<RubberProduction>);
  }

  findFilteredWithRelations(status?: RubberProductionStatus): Promise<RubberProduction[]> {
    const where = status !== undefined ? { status } : {};
    return this.repository.find({
      where,
      relations: PRODUCTION_RELATIONS,
      order: { createdAt: "DESC" },
    });
  }

  findOneByIdWithRelations(id: number): Promise<RubberProduction | null> {
    return this.repository.findOne({
      where: { id },
      relations: PRODUCTION_RELATIONS,
    });
  }

  findLatest(): Promise<RubberProduction | null> {
    return this.repository
      .createQueryBuilder("production")
      .orderBy("production.id", "DESC")
      .getOne();
  }
}
