import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { IssuanceSession } from "../entities/issuance-session.entity";

export abstract class IssuanceSessionRepository extends TenantScopedRepository<IssuanceSession> {
  abstract withTransaction(context: TransactionContext): IssuanceSessionRepository;
  abstract saveForCompany(companyId: number, entity: IssuanceSession): Promise<IssuanceSession>;
  abstract removeForCompany(companyId: number, entity: IssuanceSession): Promise<void>;
}
