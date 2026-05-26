import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FittingRfq } from "./entities/fitting-rfq.entity";
import { FittingRfqRepository } from "./fitting-rfq.repository";

@Injectable()
export class PostgresFittingRfqRepository
  extends TypeOrmCrudRepository<FittingRfq>
  implements FittingRfqRepository
{
  constructor(@InjectRepository(FittingRfq) repository: Repository<FittingRfq>) {
    super(repository);
  }
}
