import { CrudRepository } from "../../lib/persistence/crud-repository";
import { GlossaryTerm } from "../entities/glossary-term.entity";

export abstract class GlossaryTermRepository extends CrudRepository<GlossaryTerm> {
  abstract findForCompanyOrdered(companyId: number): Promise<GlossaryTerm[]>;
  abstract findOneForCompanyByAbbreviation(
    companyId: number,
    abbreviation: string,
  ): Promise<GlossaryTerm | null>;
  abstract deleteForCompanyByAbbreviation(companyId: number, abbreviation: string): Promise<void>;
  abstract deleteAllForCompany(companyId: number): Promise<void>;
}
