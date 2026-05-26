import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository";
import { AnnixSentinelProfile } from "./entities/annix-sentinel-profile.entity";

@Injectable()
export class PostgresAnnixSentinelProfileRepository
  extends TypeOrmCrudRepository<AnnixSentinelProfile>
  implements AnnixSentinelProfileRepository
{
  constructor(
    @InjectRepository(AnnixSentinelProfile) repository: Repository<AnnixSentinelProfile>,
  ) {
    super(repository);
  }
}
