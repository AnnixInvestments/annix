import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PushSubscription } from "../entities/push-subscription.entity";

export abstract class PushSubscriptionRepository extends TenantScopedRepository<PushSubscription> {
  abstract withTransaction(context: TransactionContext): PushSubscriptionRepository;
  abstract saveForCompany(companyId: number, entity: PushSubscription): Promise<PushSubscription>;
  abstract removeForCompany(companyId: number, entity: PushSubscription): Promise<void>;
  abstract findByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  abstract findForUser(userId: number): Promise<PushSubscription[]>;
  abstract deleteByUserAndEndpoint(userId: number, endpoint: string): Promise<void>;
  abstract deleteByIds(ids: number[]): Promise<void>;
  abstract deleteForCompany(companyId: number): Promise<void>;
}
