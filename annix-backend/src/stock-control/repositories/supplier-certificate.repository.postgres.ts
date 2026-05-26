import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import {
  type CertificateFilters,
  SupplierCertificateRepository,
} from "./supplier-certificate.repository";

@Injectable()
export class PostgresSupplierCertificateRepository
  extends TypeOrmCrudRepository<SupplierCertificate>
  implements SupplierCertificateRepository
{
  constructor(@InjectRepository(SupplierCertificate) repository: Repository<SupplierCertificate>) {
    super(repository);
  }

  build(data: DeepPartial<SupplierCertificate>): SupplierCertificate {
    return this.repository.create(data as TypeOrmDeepPartial<SupplierCertificate>);
  }

  async updateById(id: number, updates: DeepPartial<SupplierCertificate>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<SupplierCertificate>);
  }

  findOneForCompanyByBatchAndType(
    companyId: number,
    supplierId: number,
    batchNumber: string,
    certificateType: string,
  ): Promise<SupplierCertificate | null> {
    return this.repository.findOne({
      where: { companyId, supplierId, batchNumber, certificateType },
    });
  }

  findAllFilteredForCompany(
    companyId: number,
    filters: CertificateFilters | undefined,
  ): Promise<SupplierCertificate[]> {
    const qb = this.repository
      .createQueryBuilder("cert")
      .leftJoinAndSelect("cert.supplier", "supplier")
      .leftJoinAndSelect("cert.stockItem", "stockItem")
      .leftJoinAndSelect("cert.jobCard", "jobCard")
      .where("cert.companyId = :companyId", { companyId })
      .orderBy("cert.createdAt", "DESC");

    if (filters?.supplierId) {
      qb.andWhere("cert.supplierId = :supplierId", { supplierId: filters.supplierId });
    }

    if (filters?.stockItemId) {
      qb.andWhere("cert.stockItemId = :stockItemId", { stockItemId: filters.stockItemId });
    }

    if (filters?.jobCardId) {
      qb.andWhere("cert.jobCardId = :jobCardId", { jobCardId: filters.jobCardId });
    }

    if (filters?.batchNumber) {
      qb.andWhere("LOWER(cert.batchNumber) LIKE LOWER(:batchNumber)", {
        batchNumber: `%${filters.batchNumber}%`,
      });
    }

    if (filters?.certificateType) {
      qb.andWhere("cert.certificateType = :certificateType", {
        certificateType: filters.certificateType.toUpperCase(),
      });
    }

    return qb.getMany();
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierCertificate | null> {
    return this.repository.findOne({ where: { id, companyId }, relations });
  }

  findByBatchForCompany(companyId: number, batchNumber: string): Promise<SupplierCertificate[]> {
    return this.repository.find({
      where: { companyId, batchNumber: batchNumber.trim() },
      relations: ["supplier", "stockItem"],
      order: { createdAt: "DESC" },
    });
  }

  findForJobCardForCompany(companyId: number, jobCardId: number): Promise<SupplierCertificate[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      relations: ["supplier", "stockItem"],
    });
  }

  findOneForCompanyByBatch(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate | null> {
    return this.repository.findOne({ where: { companyId, batchNumber } });
  }

  findBatchSummaryForCompany(companyId: number): Promise<SupplierCertificate[]> {
    return this.repository.find({
      where: { companyId },
      select: { id: true, batchNumber: true },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<SupplierCertificate | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findNeedingProductExtractionForCompany(companyId: number): Promise<SupplierCertificate[]> {
    return this.repository
      .createQueryBuilder("cert")
      .where("cert.companyId = :companyId", { companyId })
      .andWhere(
        "(cert.description IS NULL OR LENGTH(cert.description) > 60 OR cert.uploadedByName = :emailImport)",
        { emailImport: "Email Import" },
      )
      .select(["cert.id", "cert.filePath", "cert.mimeType", "cert.companyId"])
      .getMany();
  }
}
