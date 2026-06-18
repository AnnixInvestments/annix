import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelSubscription } from "./entities/subscription.entity";

export abstract class AnnixSentinelSubscriptionRepository extends CrudRepository<AnnixSentinelSubscription> {
  abstract findByCompany(companyId: number): Promise<AnnixSentinelSubscription | null>;
  abstract findByPaystackCustomerId(
    paystackCustomerId: string,
  ): Promise<AnnixSentinelSubscription | null>;
}
