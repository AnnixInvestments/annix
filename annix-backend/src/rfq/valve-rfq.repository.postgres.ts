import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ValveRfq } from "./entities/valve-rfq.entity";
import { ValveRfqRepository } from "./valve-rfq.repository";

@Injectable()
export class PostgresValveRfqRepository
  extends TypeOrmCrudRepository<ValveRfq>
  implements ValveRfqRepository
{
  constructor(@InjectRepository(ValveRfq) repository: Repository<ValveRfq>) {
    super(repository);
  }
}
