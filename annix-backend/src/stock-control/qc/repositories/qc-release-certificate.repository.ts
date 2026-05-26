import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";

export abstract class QcReleaseCertificateRepository extends CrudRepository<QcReleaseCertificate> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcReleaseCertificate[]>;
  abstract findForCpo(companyId: number, cpoId: number): Promise<QcReleaseCertificate[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcReleaseCertificate | null>;
  abstract findOneByIdForJobCard(
    id: number,
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate | null>;
  abstract findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcReleaseCertificate[]>;
}
