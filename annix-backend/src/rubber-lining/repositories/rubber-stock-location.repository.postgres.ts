import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberStockLocation } from "../entities/rubber-stock-location.entity";
import { RubberStockLocationRepository } from "./rubber-stock-location.repository";

@Injectable()
export class PostgresRubberStockLocationRepository
  extends TypeOrmCrudRepository<RubberStockLocation>
  implements RubberStockLocationRepository
{
  constructor(@InjectRepository(RubberStockLocation) repository: Repository<RubberStockLocation>) {
    super(repository);
  }

  build(data: Partial<RubberStockLocation>): RubberStockLocation {
    return this.repository.create(data as TypeOrmDeepPartial<RubberStockLocation>);
  }

  findAllOrdered(includeInactive: boolean): Promise<RubberStockLocation[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("location")
      .orderBy("location.displayOrder", "ASC")
      .addOrderBy("location.name", "ASC");

    if (!includeInactive) {
      queryBuilder.andWhere("location.active = :active", { active: true });
    }

    return queryBuilder.getMany();
  }
}
