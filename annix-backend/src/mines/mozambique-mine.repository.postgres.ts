import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";
import { MozambiqueMineRepository } from "./mozambique-mine.repository";

@Injectable()
export class PostgresMozambiqueMineRepository
  extends TypeOrmCrudRepository<MozambiqueMine>
  implements MozambiqueMineRepository
{
  constructor(@InjectRepository(MozambiqueMine) repository: Repository<MozambiqueMine>) {
    super(repository);
  }
}
