import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberBondingAgent } from "../entities/rubber-bonding-agent.entity";

export abstract class RubberBondingAgentRepository extends TenantScopedRepository<RubberBondingAgent> {
  abstract withTransaction(context: TransactionContext): RubberBondingAgentRepository;
  abstract saveForCompany(
    companyId: number,
    entity: RubberBondingAgent,
  ): Promise<RubberBondingAgent>;
  abstract removeForCompany(companyId: number, entity: RubberBondingAgent): Promise<void>;
  abstract findAllForCompany(companyId: number): Promise<RubberBondingAgent[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<RubberBondingAgent | null>;
}
