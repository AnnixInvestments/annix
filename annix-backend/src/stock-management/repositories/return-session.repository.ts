import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ReturnSession } from "../entities/return-session.entity";

export abstract class ReturnSessionRepository extends CrudRepository<ReturnSession> {
  abstract build(data: DeepPartial<ReturnSession>): ReturnSession;
  abstract withTransaction(context: TransactionContext): ReturnSessionRepository;
  abstract findOutstandingForCompany(companyId: number): Promise<ReturnSession[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<ReturnSession | null>;
  abstract findByIdWithReturns(id: number): Promise<ReturnSession | null>;
  abstract findByIdWithOffcutReturns(id: number): Promise<ReturnSession | null>;
}
