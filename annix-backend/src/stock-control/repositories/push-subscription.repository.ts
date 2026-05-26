import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PushSubscription } from "../entities/push-subscription.entity";

export abstract class PushSubscriptionRepository extends CrudRepository<PushSubscription> {
  abstract findByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  abstract findForUser(userId: number): Promise<PushSubscription[]>;
  abstract deleteByUserAndEndpoint(userId: number, endpoint: string): Promise<void>;
  abstract deleteByIds(ids: number[]): Promise<void>;
  abstract deleteForCompany(companyId: number): Promise<void>;
}
