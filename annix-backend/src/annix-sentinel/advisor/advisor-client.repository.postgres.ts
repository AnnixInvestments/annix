import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelAdvisorClientRepository } from "./advisor-client.repository";
import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";

@Injectable()
export class PostgresAnnixSentinelAdvisorClientRepository
  extends TypeOrmCrudRepository<AnnixSentinelAdvisorClient>
  implements AnnixSentinelAdvisorClientRepository
{
  constructor(
    @InjectRepository(AnnixSentinelAdvisorClient)
    repository: Repository<AnnixSentinelAdvisorClient>,
  ) {
    super(repository);
  }
}
