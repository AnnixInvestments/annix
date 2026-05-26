import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreRepository } from "./fitting-bore.repository";

@Injectable()
export class PostgresFittingBoreRepository
  extends TypeOrmCrudRepository<FittingBore>
  implements FittingBoreRepository
{
  constructor(@InjectRepository(FittingBore) repository: Repository<FittingBore>) {
    super(repository);
  }

  instantiate(data: DeepPartial<FittingBore>): FittingBore {
    return this.repository.create(data);
  }
}
