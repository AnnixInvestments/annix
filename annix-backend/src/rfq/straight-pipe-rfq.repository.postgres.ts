import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { StraightPipeRfq } from "./entities/straight-pipe-rfq.entity";
import { StraightPipeRfqRepository } from "./straight-pipe-rfq.repository";

@Injectable()
export class PostgresStraightPipeRfqRepository
  extends TypeOrmCrudRepository<StraightPipeRfq>
  implements StraightPipeRfqRepository
{
  constructor(@InjectRepository(StraightPipeRfq) repository: Repository<StraightPipeRfq>) {
    super(repository);
  }
}
