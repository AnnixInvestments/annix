import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelSageConnection } from "./sage-connection.entity";
import { AnnixSentinelSageConnectionRepository } from "./sage-connection.repository";

@Injectable()
export class PostgresAnnixSentinelSageConnectionRepository
  extends TypeOrmCrudRepository<AnnixSentinelSageConnection>
  implements AnnixSentinelSageConnectionRepository
{
  constructor(
    @InjectRepository(AnnixSentinelSageConnection)
    repository: Repository<AnnixSentinelSageConnection>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixSentinelSageConnection | null> {
    return this.repository.findOne({ where: { companyId } });
  }

  async deleteByCompany(companyId: number): Promise<number> {
    const result = await this.repository.delete({ companyId });
    return result.affected ?? 0;
  }
}
