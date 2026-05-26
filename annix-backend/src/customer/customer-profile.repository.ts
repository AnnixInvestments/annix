import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { CustomerProfile } from "./entities/customer-profile.entity";

export interface CustomerListParams {
  search?: string | null;
  status?: string | null;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  skip: number;
  limit: number;
}

export abstract class CustomerProfileRepository extends CrudRepository<CustomerProfile> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerProfile>;
  abstract findByUserId(userId: number, relations?: string[]): Promise<CustomerProfile | null>;
  abstract findByValidEmailVerificationToken(
    token: string,
    notExpiredBefore: Date,
  ): Promise<CustomerProfile | null>;
  abstract listForAdmin(params: CustomerListParams): Promise<[CustomerProfile[], number]>;
  abstract findWithExpiringBeeCertificates(todayStr: string): Promise<CustomerProfile[]>;
  abstract allUserIds(): Promise<number[]>;
  abstract findByIdWithRelations(id: number, relations: string[]): Promise<CustomerProfile | null>;
}
