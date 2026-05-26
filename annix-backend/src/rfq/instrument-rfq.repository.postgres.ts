import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { InstrumentRfq } from "./entities/instrument-rfq.entity";
import { InstrumentRfqRepository } from "./instrument-rfq.repository";

@Injectable()
export class PostgresInstrumentRfqRepository
  extends TypeOrmCrudRepository<InstrumentRfq>
  implements InstrumentRfqRepository
{
  constructor(@InjectRepository(InstrumentRfq) repository: Repository<InstrumentRfq>) {
    super(repository);
  }
}
