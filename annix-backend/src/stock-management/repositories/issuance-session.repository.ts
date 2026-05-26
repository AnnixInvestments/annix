import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import {
  IssuanceSession,
  type IssuanceSessionKind,
  type IssuanceSessionStatus,
} from "../entities/issuance-session.entity";

export interface IssuanceSessionWhere {
  companyId: number;
  status?: IssuanceSessionStatus;
  sessionKind?: IssuanceSessionKind;
  cpoId?: number;
  issuerStaffId?: number;
  recipientStaffId?: number;
}

export abstract class IssuanceSessionRepository extends CrudRepository<IssuanceSession> {
  abstract build(data: DeepPartial<IssuanceSession>): IssuanceSession;
  abstract withTransaction(context: TransactionContext): IssuanceSessionRepository;
  abstract findByIdWithFullRelations(id: number): Promise<IssuanceSession | null>;
  abstract findByIdForCompanyWithFullRelations(
    companyId: number,
    id: number,
  ): Promise<IssuanceSession | null>;
  abstract findPaginatedForCompany(
    where: IssuanceSessionWhere,
    skip: number,
    take: number,
  ): Promise<{ items: IssuanceSession[]; total: number }>;
}
