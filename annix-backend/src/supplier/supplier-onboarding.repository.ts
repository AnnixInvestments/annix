import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { SupplierOnboarding } from "./entities/supplier-onboarding.entity";

export abstract class SupplierOnboardingRepository extends CrudRepository<SupplierOnboarding> {
  abstract withTransaction(context: TransactionContext): CrudRepository<SupplierOnboarding>;
  abstract findBySupplierId(supplierId: number): Promise<SupplierOnboarding | null>;
  abstract findBySupplierIdWithRelations(
    supplierId: number,
    relations: string[],
  ): Promise<SupplierOnboarding | null>;
  abstract updateDocumentsStatus(supplierId: number, documentsComplete: boolean): Promise<void>;
  abstract findApprovedWithSupplier(): Promise<SupplierOnboarding[]>;
}
