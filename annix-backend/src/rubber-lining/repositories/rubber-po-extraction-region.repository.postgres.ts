import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberPoExtractionRegion } from "../entities/rubber-po-extraction-region.entity";
import { RubberPoExtractionRegionRepository } from "./rubber-po-extraction-region.repository";

@Injectable()
export class PostgresRubberPoExtractionRegionRepository
  extends TypeOrmCrudRepository<RubberPoExtractionRegion>
  implements RubberPoExtractionRegionRepository
{
  constructor(
    @InjectRepository(RubberPoExtractionRegion)
    repository: Repository<RubberPoExtractionRegion>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberPoExtractionRegion>): RubberPoExtractionRegion {
    return this.repository.create(data as TypeOrmDeepPartial<RubberPoExtractionRegion>);
  }

  saveMany(entities: RubberPoExtractionRegion[]): Promise<RubberPoExtractionRegion[]> {
    return this.repository.save(entities);
  }
}
