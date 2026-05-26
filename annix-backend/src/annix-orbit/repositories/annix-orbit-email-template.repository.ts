import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  AnnixOrbitEmailTemplate,
  CvEmailTemplateKind,
} from "../entities/annix-orbit-email-template.entity";

export abstract class AnnixOrbitEmailTemplateRepository extends CrudRepository<AnnixOrbitEmailTemplate> {
  abstract findForCompany(companyId: number): Promise<AnnixOrbitEmailTemplate[]>;
  abstract findForCompanyKind(
    companyId: number,
    kind: CvEmailTemplateKind,
  ): Promise<AnnixOrbitEmailTemplate | null>;
  abstract deleteForCompanyKind(companyId: number, kind: CvEmailTemplateKind): Promise<void>;
}
