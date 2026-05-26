import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";

export abstract class JobCardImportMappingRepository extends CrudRepository<JobCardImportMapping> {
  abstract findForCompany(companyId: number): Promise<JobCardImportMapping | null>;
}
