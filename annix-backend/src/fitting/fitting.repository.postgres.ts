import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Fitting } from "./entities/fitting.entity";
import { FittingRepository } from "./fitting.repository";

@Injectable()
export class PostgresFittingRepository
  extends TypeOrmCrudRepository<Fitting>
  implements FittingRepository
{
  constructor(@InjectRepository(Fitting) repository: Repository<Fitting>) {
    super(repository);
  }
}
