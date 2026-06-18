import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelSubscription } from "./entities/subscription.entity";
import { AnnixSentinelSubscriptionRepository } from "./subscription.repository";

@Injectable()
export class PostgresAnnixSentinelSubscriptionRepository
  extends TypeOrmCrudRepository<AnnixSentinelSubscription>
  implements AnnixSentinelSubscriptionRepository
{
  constructor(
    @InjectRepository(AnnixSentinelSubscription)
    repository: Repository<AnnixSentinelSubscription>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixSentinelSubscription | null> {
    return this.repository.findOne({ where: { companyId } });
  }

  findByPaystackCustomerId(paystackCustomerId: string): Promise<AnnixSentinelSubscription | null> {
    return this.repository.findOne({ where: { paystackCustomerId } });
  }
}
