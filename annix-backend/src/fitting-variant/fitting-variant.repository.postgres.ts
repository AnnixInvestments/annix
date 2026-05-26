import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantRepository } from "./fitting-variant.repository";

@Injectable()
export class PostgresFittingVariantRepository
  extends TypeOrmCrudRepository<FittingVariant>
  implements FittingVariantRepository
{
  constructor(@InjectRepository(FittingVariant) repository: Repository<FittingVariant>) {
    super(repository);
  }
}
