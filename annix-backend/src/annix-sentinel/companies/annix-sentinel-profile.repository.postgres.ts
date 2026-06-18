import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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

  findOneByUserId(userId: number): Promise<AnnixSentinelProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findByCompanyIds(companyIds: number[]): Promise<AnnixSentinelProfile[]> {
    return this.repository.find({ where: { companyId: In(companyIds) } });
  }
}
