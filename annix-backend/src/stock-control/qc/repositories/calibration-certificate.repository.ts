import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { CalibrationCertificate } from "../entities/calibration-certificate.entity";

export abstract class CalibrationCertificateRepository extends CrudRepository<CalibrationCertificate> {
  abstract findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<CalibrationCertificate[]>;
  abstract findByIdForCompany(
    companyId: number,
    id: number,
  ): Promise<CalibrationCertificate | null>;
  abstract findActiveForCompany(companyId: number): Promise<CalibrationCertificate[]>;
  abstract findActiveForCompanyUnordered(companyId: number): Promise<CalibrationCertificate[]>;
  abstract findExpiryWarningCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]>;
  abstract findExpiredCandidates(expiryOnOrBefore: string): Promise<CalibrationCertificate[]>;
}
