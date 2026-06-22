import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";

export abstract class UserLocationAssignmentRepository extends TenantScopedRepository<UserLocationAssignment> {
  abstract withTransaction(context: TransactionContext): UserLocationAssignmentRepository;
  abstract saveForCompany(
    companyId: number,
    entity: UserLocationAssignment,
  ): Promise<UserLocationAssignment>;
  abstract removeForCompany(companyId: number, entity: UserLocationAssignment): Promise<void>;
  abstract buildMany(rows: DeepPartial<UserLocationAssignment>[]): UserLocationAssignment[];
  abstract saveMany(entities: UserLocationAssignment[]): Promise<UserLocationAssignment[]>;
  abstract findForCompanyWithRelations(companyId: number): Promise<UserLocationAssignment[]>;
  abstract findForUser(companyId: number, userId: number): Promise<UserLocationAssignment[]>;
  abstract deleteForUser(companyId: number, userId: number): Promise<void>;
}
