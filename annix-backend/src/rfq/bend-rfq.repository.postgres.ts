import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BendRfqRepository } from "./bend-rfq.repository";
import { BendRfq } from "./entities/bend-rfq.entity";

@Injectable()
export class PostgresBendRfqRepository
  extends TypeOrmCrudRepository<BendRfq>
  implements BendRfqRepository
{
  constructor(@InjectRepository(BendRfq) repository: Repository<BendRfq>) {
    super(repository);
  }
}
