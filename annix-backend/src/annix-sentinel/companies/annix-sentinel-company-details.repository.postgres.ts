import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";

@Injectable()
export class PostgresAnnixSentinelCompanyDetailsRepository
  extends TypeOrmCrudRepository<AnnixSentinelCompanyDetails>
  implements AnnixSentinelCompanyDetailsRepository
{
  constructor(
    @InjectRepository(AnnixSentinelCompanyDetails)
    repository: Repository<AnnixSentinelCompanyDetails>,
  ) {
    super(repository);
  }

  findOneByCompanyId(companyId: number): Promise<AnnixSentinelCompanyDetails | null> {
    return this.repository.findOne({ where: { companyId } });
  }

  countCancelledCreatedBefore(cutoff: Date): Promise<number> {
    return this.repository.count({
      where: { createdAt: LessThan(cutoff), subscriptionStatus: "cancelled" },
    });
  }
}
