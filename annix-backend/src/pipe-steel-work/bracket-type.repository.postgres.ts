import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BracketTypeRepository } from "./bracket-type.repository";
import { BracketTypeEntity } from "./entities/bracket-type.entity";

@Injectable()
export class PostgresBracketTypeRepository
  extends TypeOrmCrudRepository<BracketTypeEntity>
  implements BracketTypeRepository
{
  constructor(@InjectRepository(BracketTypeEntity) repository: Repository<BracketTypeEntity>) {
    super(repository);
  }
}
