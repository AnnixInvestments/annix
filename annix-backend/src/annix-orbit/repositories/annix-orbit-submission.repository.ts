import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitSubmission } from "../entities/annix-orbit-submission.entity";

export abstract class AnnixOrbitSubmissionRepository extends CrudRepository<AnnixOrbitSubmission> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitSubmission[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitSubmission | null>;
}
