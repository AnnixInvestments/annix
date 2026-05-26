import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCompoundQualityConfig } from "../entities/rubber-compound-quality-config.entity";
import { RubberCompoundQualityConfigRepository } from "./rubber-compound-quality-config.repository";

@Injectable()
export class PostgresRubberCompoundQualityConfigRepository
  extends TypeOrmCrudRepository<RubberCompoundQualityConfig>
  implements RubberCompoundQualityConfigRepository
{
  constructor(
    @InjectRepository(RubberCompoundQualityConfig)
    repository: Repository<RubberCompoundQualityConfig>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberCompoundQualityConfig>): RubberCompoundQualityConfig {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompoundQualityConfig>);
  }

  findOneByCompoundCode(compoundCode: string): Promise<RubberCompoundQualityConfig | null> {
    return this.repository.findOne({ where: { compoundCode } });
  }
}
