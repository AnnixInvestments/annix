import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FittingType } from "./entities/fitting-type.entity";
import { FittingTypeRepository } from "./fitting-type.repository";

@Injectable()
export class PostgresFittingTypeRepository
  extends TypeOrmCrudRepository<FittingType>
  implements FittingTypeRepository
{
  constructor(@InjectRepository(FittingType) repository: Repository<FittingType>) {
    super(repository);
  }
}
