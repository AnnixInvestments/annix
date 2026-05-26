import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CertificateRepository } from "./certificate.repository";
import type { CertificateFilterDto } from "./dto/certificate.dto";
import { CertificateProcessingStatus, PlatformCertificate } from "./entities/certificate.entity";

export interface CertificatePage {
  data: PlatformCertificate[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(private readonly certRepo: CertificateRepository) {}

  async findById(companyId: number, id: number): Promise<PlatformCertificate> {
    const cert = await this.certRepo.findByCompanyAndId(companyId, id, ["supplierContact"]);

    if (!cert) {
      throw new NotFoundException(`Certificate ${id} not found`);
    }

    return cert;
  }

  search(companyId: number, filters: CertificateFilterDto): Promise<CertificatePage> {
    return this.certRepo.search(companyId, filters);
  }

  async create(data: Partial<PlatformCertificate>): Promise<PlatformCertificate> {
    return this.certRepo.create(data);
  }

  async update(
    companyId: number,
    id: number,
    data: Partial<PlatformCertificate>,
  ): Promise<PlatformCertificate> {
    const cert = await this.findById(companyId, id);
    Object.assign(cert, data);
    return this.certRepo.save(cert);
  }

  async setExtractedData(
    id: number,
    extractedData: Record<string, unknown>,
  ): Promise<PlatformCertificate> {
    const cert = await this.certRepo.findById(id);
    if (!cert) {
      throw new NotFoundException(`Certificate ${id} not found`);
    }

    cert.extractedData = extractedData;
    cert.processingStatus = CertificateProcessingStatus.EXTRACTED;

    return this.certRepo.save(cert);
  }

  async approve(companyId: number, id: number, approvedBy: string): Promise<PlatformCertificate> {
    const cert = await this.findById(companyId, id);
    cert.processingStatus = CertificateProcessingStatus.APPROVED;
    cert.approvedBy = approvedBy;
    cert.approvedAt = new Date();
    return this.certRepo.save(cert);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const cert = await this.findById(companyId, id);
    await this.certRepo.remove(cert);
  }

  findByBatchNumber(companyId: number, batchNumber: string): Promise<PlatformCertificate[]> {
    return this.certRepo.findByBatchNumber(companyId, batchNumber);
  }

  findByCompoundCode(companyId: number, compoundCode: string): Promise<PlatformCertificate[]> {
    return this.certRepo.findByCompoundCode(companyId, compoundCode);
  }

  findByLegacyScCertificateId(scCertificateId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findByLegacyScCertificateId(scCertificateId);
  }

  findByLegacyScCalibrationId(scCalibrationId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findByLegacyScCalibrationId(scCalibrationId);
  }

  findByLegacyRubberCocId(rubberCocId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findByLegacyRubberCocId(rubberCocId);
  }
}
