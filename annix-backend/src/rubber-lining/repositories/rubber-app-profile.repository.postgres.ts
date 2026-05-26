import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberAppProfile } from "../entities/rubber-app-profile.entity";
import { RubberAppProfileRepository } from "./rubber-app-profile.repository";

@Injectable()
export class PostgresRubberAppProfileRepository
  extends TypeOrmCrudRepository<RubberAppProfile>
  implements RubberAppProfileRepository
{
  constructor(@InjectRepository(RubberAppProfile) repository: Repository<RubberAppProfile>) {
    super(repository);
  }

  build(data: Partial<RubberAppProfile>): RubberAppProfile {
    return this.repository.create(data as TypeOrmDeepPartial<RubberAppProfile>);
  }

  mergeInto(existing: RubberAppProfile, updates: Partial<RubberAppProfile>): RubberAppProfile {
    return this.repository.merge(existing, updates as TypeOrmDeepPartial<RubberAppProfile>);
  }
}
