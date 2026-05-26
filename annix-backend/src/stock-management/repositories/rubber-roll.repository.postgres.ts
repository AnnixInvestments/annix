import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberRoll } from "../entities/rubber-roll.entity";
import { RubberRollRepository } from "./rubber-roll.repository";

@Injectable()
export class PostgresRubberRollRepository
  extends TypeOrmCrudRepository<RubberRoll>
  implements RubberRollRepository
{
  constructor(@InjectRepository(RubberRoll) repository: Repository<RubberRoll>) {
    super(repository);
  }

  build(data: DeepPartial<RubberRoll>): RubberRoll {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRoll>);
  }

  findByProductId(productId: number): Promise<RubberRoll | null> {
    return this.repository.findOne({ where: { productId } });
  }
}
