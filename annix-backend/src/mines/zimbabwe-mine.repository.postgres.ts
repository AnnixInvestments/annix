import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";
import { ZimbabweMineRepository } from "./zimbabwe-mine.repository";

@Injectable()
export class PostgresZimbabweMineRepository
  extends TypeOrmCrudRepository<ZimbabweMine>
  implements ZimbabweMineRepository
{
  constructor(@InjectRepository(ZimbabweMine) repository: Repository<ZimbabweMine>) {
    super(repository);
  }
}
