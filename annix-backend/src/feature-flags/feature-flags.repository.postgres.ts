import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FeatureFlag } from "./entities/feature-flag.entity";
import { FeatureFlagRepository } from "./feature-flags.repository";

@Injectable()
export class PostgresFeatureFlagRepository
  extends TypeOrmCrudRepository<FeatureFlag>
  implements FeatureFlagRepository
{
  constructor(@InjectRepository(FeatureFlag) repository: Repository<FeatureFlag>) {
    super(repository);
  }

  findByKey(flagKey: string): Promise<FeatureFlag | null> {
    return this.repository.findOne({ where: { flagKey } });
  }

  findAllOrdered(): Promise<FeatureFlag[]> {
    return this.repository.find({ order: { flagKey: "ASC" } });
  }
}
