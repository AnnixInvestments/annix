import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PumpRfq } from "./entities/pump-rfq.entity";
import { PumpRfqRepository } from "./pump-rfq.repository";

@Injectable()
export class PostgresPumpRfqRepository
  extends TypeOrmCrudRepository<PumpRfq>
  implements PumpRfqRepository
{
  constructor(@InjectRepository(PumpRfq) repository: Repository<PumpRfq>) {
    super(repository);
  }
}
