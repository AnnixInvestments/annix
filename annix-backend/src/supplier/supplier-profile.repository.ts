import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { SupplierAccountStatus, SupplierProfile } from "./entities/supplier-profile.entity";

export interface SupplierProfilePage {
  items: SupplierProfile[];
  total: number;
}

export interface SupplierDirectoryFilters {
  search?: string | null;
  province?: string | null;
}

export abstract class SupplierProfileRepository extends CrudRepository<SupplierProfile> {
  abstract withTransaction(context: TransactionContext): CrudRepository<SupplierProfile>;
  abstract findByIdWithRelations(id: number, relations: string[]): Promise<SupplierProfile | null>;
  abstract findByUserId(userId: number, relations?: string[]): Promise<SupplierProfile | null>;
  abstract findByUserIdAndVerificationToken(
    userId: number,
    emailVerificationToken: string,
  ): Promise<SupplierProfile | null>;
  abstract findByIdForRefresh(id: number | undefined): Promise<SupplierProfile | null>;
  abstract findAllPaginated(
    page: number,
    limit: number,
    accountStatus?: SupplierAccountStatus,
  ): Promise<SupplierProfilePage>;
  abstract findSubmittedForReview(): Promise<SupplierProfile[]>;
  abstract allUserIds(): Promise<number[]>;
  abstract searchActiveWithCompany(filters: SupplierDirectoryFilters): Promise<SupplierProfile[]>;
  abstract findByUserEmail(email: string): Promise<SupplierProfile | null>;
  abstract findByIdsWithUserAndCompany(ids: number[]): Promise<SupplierProfile[]>;
}
