import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FastenerRfq } from "./entities/fastener-rfq.entity";
import { FastenerRfqRepository } from "./fastener-rfq.repository";

@Injectable()
export class PostgresFastenerRfqRepository
  extends TypeOrmCrudRepository<FastenerRfq>
  implements FastenerRfqRepository
{
  constructor(@InjectRepository(FastenerRfq) repository: Repository<FastenerRfq>) {
    super(repository);
  }
}
