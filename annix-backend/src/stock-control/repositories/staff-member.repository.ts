import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StaffMember } from "../entities/staff-member.entity";

export interface StaffSearchRow {
  id: number;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  active: boolean;
  updatedAt: Date;
}

export abstract class StaffMemberRepository extends TenantScopedRepository<StaffMember> {
  abstract withTransaction(context: TransactionContext): StaffMemberRepository;
  abstract saveForCompany(companyId: number, entity: StaffMember): Promise<StaffMember>;
  abstract removeForCompany(companyId: number, entity: StaffMember): Promise<void>;
  abstract findAllForCompanyOrdered(
    companyId: number,
    filters?: { search?: string; active?: string },
  ): Promise<StaffMember[]>;
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StaffMember[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StaffMember | null>;
  abstract findActiveByIdForUnifiedCompany(
    id: number,
    unifiedCompanyId: number,
  ): Promise<StaffMember | null>;
  abstract searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StaffSearchRow[]>;
}
