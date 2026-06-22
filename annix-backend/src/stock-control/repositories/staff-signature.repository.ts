import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StaffSignature } from "../entities/staff-signature.entity";

export abstract class StaffSignatureRepository extends TenantScopedRepository<StaffSignature> {
  abstract withTransaction(context: TransactionContext): StaffSignatureRepository;
  abstract saveForCompany(companyId: number, entity: StaffSignature): Promise<StaffSignature>;
  abstract removeForCompany(companyId: number, entity: StaffSignature): Promise<void>;
  abstract findByUser(userId: number): Promise<StaffSignature | null>;
}
