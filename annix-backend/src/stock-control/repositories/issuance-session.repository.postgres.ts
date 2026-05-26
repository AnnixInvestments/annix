import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuanceSession } from "../entities/issuance-session.entity";
import { IssuanceSessionRepository } from "./issuance-session.repository";

@Injectable()
export class PostgresIssuanceSessionRepository
  extends TypeOrmCrudRepository<IssuanceSession>
  implements IssuanceSessionRepository
{
  constructor(@InjectRepository(IssuanceSession) repository: Repository<IssuanceSession>) {
    super(repository);
  }
}
