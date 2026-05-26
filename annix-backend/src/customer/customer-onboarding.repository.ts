import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { CustomerOnboarding } from "./entities/customer-onboarding.entity";

export abstract class CustomerOnboardingRepository extends CrudRepository<CustomerOnboarding> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerOnboarding>;
  abstract findByCustomerId(
    customerId: number,
    relations?: string[],
  ): Promise<CustomerOnboarding | null>;
  abstract findPendingReview(statuses: string[]): Promise<CustomerOnboarding[]>;
}
