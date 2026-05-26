import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RfqSequence } from "./entities/rfq-sequence.entity";
import { RfqSequenceRepository } from "./rfq-sequence.repository";

@Injectable()
export class PostgresRfqSequenceRepository
  extends TypeOrmCrudRepository<RfqSequence>
  implements RfqSequenceRepository
{
  constructor(@InjectRepository(RfqSequence) repository: Repository<RfqSequence>) {
    super(repository);
  }

  findByYear(year: number): Promise<RfqSequence | null> {
    return this.repository.findOne({ where: { year } });
  }

  findAllOrderedByYearDesc(): Promise<RfqSequence[]> {
    return this.repository.find({ order: { year: "DESC" } });
  }
}
