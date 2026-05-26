import { CrudRepository } from "../lib/persistence/crud-repository";
import type { CertificatePage } from "./certificate.service";
import type { CertificateFilterDto } from "./dto/certificate.dto";
import { PlatformCertificate } from "./entities/certificate.entity";

export abstract class CertificateRepository extends CrudRepository<PlatformCertificate> {
  abstract search(companyId: number, filters: CertificateFilterDto): Promise<CertificatePage>;
  abstract findByCompanyAndId(
    companyId: number,
    id: number,
    relations?: string[],
  ): Promise<PlatformCertificate | null>;
  abstract findByBatchNumber(
    companyId: number,
    batchNumber: string,
  ): Promise<PlatformCertificate[]>;
  abstract findByCompoundCode(
    companyId: number,
    compoundCode: string,
  ): Promise<PlatformCertificate[]>;
  abstract findByLegacyScCertificateId(id: number): Promise<PlatformCertificate | null>;
  abstract findByLegacyScCalibrationId(id: number): Promise<PlatformCertificate | null>;
  abstract findByLegacyRubberCocId(id: number): Promise<PlatformCertificate | null>;
}
