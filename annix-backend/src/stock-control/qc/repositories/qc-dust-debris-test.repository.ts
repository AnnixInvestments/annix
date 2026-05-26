import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";

export abstract class QcDustDebrisTestRepository extends CrudRepository<QcDustDebrisTest> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcDustDebrisTest[]>;
  abstract findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDustDebrisTest[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcDustDebrisTest | null>;
}
