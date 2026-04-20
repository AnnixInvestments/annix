import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

  constructor(
    @InjectRepository(PlatformCertificate)
    private readonly certRepo: Repository<PlatformCertificate>,
  ) {}

  async findById(companyId: number, id: number): Promise<PlatformCertificate> {
    const cert = await this.certRepo.findOne({
      where: { id, companyId },
      relations: ["supplierContact"],
    });

    if (!cert) {
      throw new NotFoundException(`Certificate ${id} not found`);
    }

    return cert;
  }

  async search(companyId: number, filters: CertificateFilterDto): Promise<CertificatePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.certRepo
      .createQueryBuilder("cert")
      .leftJoinAndSelect("cert.supplierContact", "supplier")
      .where("cert.company_id = :companyId", { companyId })
      .andWhere("cert.version_status = :versionStatus", { versionStatus: "ACTIVE" });

    if (filters.sourceModule) {
      qb.andWhere("cert.source_module = :sourceModule", {
        sourceModule: filters.sourceModule,
      });
    }

    if (filters.certificateCategory) {
      qb.andWhere("cert.certificate_category = :category", {
        category: filters.certificateCategory,
      });
    }

    if (filters.processingStatus) {
      qb.andWhere("cert.processing_status = :processingStatus", {
        processingStatus: filters.processingStatus,
      });
    }

    if (filters.supplierContactId) {
      qb.andWhere("cert.supplier_contact_id = :supplierId", {
        supplierId: filters.supplierContactId,
      });
    }

    if (filters.compoundCode) {
      qb.andWhere("cert.compound_code = :compoundCode", { compoundCode: filters.compoundCode });
    }

    if (filters.jobCardId) {
      qb.andWhere("cert.job_card_id = :jobCardId", { jobCardId: filters.jobCardId });
    }

    if (filters.search) {
      qb.andWhere(
        "(cert.certificate_number ILIKE :search OR cert.batch_number ILIKE :search OR cert.supplier_name ILIKE :search OR cert.compound_code ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy("cert.created_at", "DESC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async create(data: Partial<PlatformCertificate>): Promise<PlatformCertificate> {
    return this.certRepo.save(this.certRepo.create(data));
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
    const cert = await this.certRepo.findOneBy({ id });
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

  async findByBatchNumber(companyId: number, batchNumber: string): Promise<PlatformCertificate[]> {
    return this.certRepo.find({
      where: { companyId, batchNumber },
      order: { createdAt: "DESC" },
    });
  }

  async findByCompoundCode(
    companyId: number,
    compoundCode: string,
  ): Promise<PlatformCertificate[]> {
    return this.certRepo.find({
      where: { companyId, compoundCode },
      order: { createdAt: "DESC" },
    });
  }

  async findByLegacyScCertificateId(scCertificateId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findOne({
      where: { legacyScCertificateId: scCertificateId },
    });
  }

  async findByLegacyScCalibrationId(scCalibrationId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findOne({
      where: { legacyScCalibrationId: scCalibrationId },
    });
  }

  async findByLegacyRubberCocId(rubberCocId: number): Promise<PlatformCertificate | null> {
    return this.certRepo.findOne({
      where: { legacyRubberCocId: rubberCocId },
    });
  }
}
