import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { AngleRangeRepository } from "./angle-range.repository";
import { AngleRange } from "./entities/angle-range.entity";

@Injectable()
export class PostgresAngleRangeRepository
  extends TypeOrmCrudRepository<AngleRange>
  implements AngleRangeRepository
{
  constructor(@InjectRepository(AngleRange) repository: Repository<AngleRange>) {
    super(repository);
  }
}
