import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ExpansionJointRfq } from "./entities/expansion-joint-rfq.entity";
import { ExpansionJointRfqRepository } from "./expansion-joint-rfq.repository";

@Injectable()
export class PostgresExpansionJointRfqRepository
  extends TypeOrmCrudRepository<ExpansionJointRfq>
  implements ExpansionJointRfqRepository
{
  constructor(@InjectRepository(ExpansionJointRfq) repository: Repository<ExpansionJointRfq>) {
    super(repository);
  }
}
