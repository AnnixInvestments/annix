import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CertificateRepository } from "./certificate.repository";
import type { CertificatePage } from "./certificate.service";
import type { CertificateFilterDto } from "./dto/certificate.dto";
import { PlatformCertificate } from "./entities/certificate.entity";

@Injectable()
export class PostgresCertificateRepository
  extends TypeOrmCrudRepository<PlatformCertificate>
  implements CertificateRepository
{
  constructor(@InjectRepository(PlatformCertificate) repository: Repository<PlatformCertificate>) {
    super(repository);
  }

  async search(companyId: number, filters: CertificateFilterDto): Promise<CertificatePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder("cert")
      .leftJoinAndSelect("cert.supplierContact", "supplier")
      .where("cert.company_id = :companyId", { companyId })
      .andWhere("cert.version_status = :versionStatus", { versionStatus: "ACTIVE" });

    if (filters.sourceModule) {
      qb.andWhere("cert.source_module = :sourceModule", { sourceModule: filters.sourceModule });
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

  findByCompanyAndId(
    companyId: number,
    id: number,
    relations: string[] = [],
  ): Promise<PlatformCertificate | null> {
    return this.repository.findOne({
      where: { id, companyId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findByBatchNumber(companyId: number, batchNumber: string): Promise<PlatformCertificate[]> {
    return this.repository.find({
      where: { companyId, batchNumber },
      order: { createdAt: "DESC" },
    });
  }

  findByCompoundCode(companyId: number, compoundCode: string): Promise<PlatformCertificate[]> {
    return this.repository.find({
      where: { companyId, compoundCode },
      order: { createdAt: "DESC" },
    });
  }

  findByLegacyScCertificateId(id: number): Promise<PlatformCertificate | null> {
    return this.repository.findOne({ where: { legacyScCertificateId: id } });
  }

  findByLegacyScCalibrationId(id: number): Promise<PlatformCertificate | null> {
    return this.repository.findOne({ where: { legacyScCalibrationId: id } });
  }

  findByLegacyRubberCocId(id: number): Promise<PlatformCertificate | null> {
    return this.repository.findOne({ where: { legacyRubberCocId: id } });
  }
}
