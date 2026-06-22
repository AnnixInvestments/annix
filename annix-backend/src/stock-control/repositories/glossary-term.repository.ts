import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { GlossaryTerm } from "../entities/glossary-term.entity";

export abstract class GlossaryTermRepository extends TenantScopedRepository<GlossaryTerm> {
  abstract withTransaction(context: TransactionContext): GlossaryTermRepository;
  abstract saveForCompany(companyId: number, entity: GlossaryTerm): Promise<GlossaryTerm>;
  abstract removeForCompany(companyId: number, entity: GlossaryTerm): Promise<void>;
  abstract findForCompanyOrdered(companyId: number): Promise<GlossaryTerm[]>;
  abstract findOneForCompanyByAbbreviation(
    companyId: number,
    abbreviation: string,
  ): Promise<GlossaryTerm | null>;
  abstract deleteForCompanyByAbbreviation(companyId: number, abbreviation: string): Promise<void>;
  abstract deleteAllForCompany(companyId: number): Promise<void>;
}
