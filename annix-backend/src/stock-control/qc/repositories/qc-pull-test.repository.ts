import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcPullTest } from "../entities/qc-pull-test.entity";

export abstract class QcPullTestRepository extends CrudRepository<QcPullTest> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcPullTest[]>;
  abstract findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcPullTest[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcPullTest | null>;
}
