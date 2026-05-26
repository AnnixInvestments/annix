import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SourceRespectRank } from "../entities/source-respect-rank.entity";
import { SourceRespectRankRepository } from "./source-respect-rank.repository";

@Injectable()
export class PostgresSourceRespectRankRepository
  extends TypeOrmCrudRepository<SourceRespectRank>
  implements SourceRespectRankRepository
{
  constructor(@InjectRepository(SourceRespectRank) repository: Repository<SourceRespectRank>) {
    super(repository);
  }
}
