import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NamibiaMine } from "./entities/namibia-mine.entity";
import { NamibiaMineRepository } from "./namibia-mine.repository";

@Injectable()
export class PostgresNamibiaMineRepository
  extends TypeOrmCrudRepository<NamibiaMine>
  implements NamibiaMineRepository
{
  constructor(@InjectRepository(NamibiaMine) repository: Repository<NamibiaMine>) {
    super(repository);
  }
}
