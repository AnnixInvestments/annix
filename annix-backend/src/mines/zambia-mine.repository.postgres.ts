import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ZambiaMine } from "./entities/zambia-mine.entity";
import { ZambiaMineRepository } from "./zambia-mine.repository";

@Injectable()
export class PostgresZambiaMineRepository
  extends TypeOrmCrudRepository<ZambiaMine>
  implements ZambiaMineRepository
{
  constructor(@InjectRepository(ZambiaMine) repository: Repository<ZambiaMine>) {
    super(repository);
  }
}
