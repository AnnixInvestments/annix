import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import type { InvoiceFilterDto } from "./dto/invoice.dto";
import { PlatformInvoice } from "./entities/invoice.entity";
import { InvoiceRepository } from "./invoice.repository";
import type { InvoicePage } from "./invoice.service";

@Injectable()
export class PostgresInvoiceRepository
  extends TypeOrmCrudRepository<PlatformInvoice>
  implements InvoiceRepository
{
  constructor(@InjectRepository(PlatformInvoice) repository: Repository<PlatformInvoice>) {
    super(repository);
  }

  async search(companyId: number, filters: InvoiceFilterDto): Promise<InvoicePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.supplierContact", "supplier")
      .where("invoice.company_id = :companyId", { companyId })
      .andWhere("invoice.version_status = :versionStatus", { versionStatus: "ACTIVE" });

    if (filters.sourceModule) {
      qb.andWhere("invoice.source_module = :sourceModule", {
        sourceModule: filters.sourceModule,
      });
    }

    if (filters.invoiceType) {
      qb.andWhere("invoice.invoice_type = :invoiceType", { invoiceType: filters.invoiceType });
    }

    if (filters.status) {
      qb.andWhere("invoice.status = :status", { status: filters.status });
    }

    if (filters.extractionStatus) {
      qb.andWhere("invoice.extraction_status = :extractionStatus", {
        extractionStatus: filters.extractionStatus,
      });
    }

    if (filters.search) {
      qb.andWhere("(invoice.invoice_number ILIKE :search OR invoice.supplier_name ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere("invoice.invoice_date >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("invoice.invoice_date <= :dateTo", { dateTo: filters.dateTo });
    }

    qb.orderBy("invoice.created_at", "DESC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  findByCompanyAndId(
    companyId: number,
    id: number,
    relations: string[] = [],
  ): Promise<PlatformInvoice | null> {
    return this.repository.findOne({
      where: { id, companyId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findByLegacyScId(id: number): Promise<PlatformInvoice | null> {
    return this.repository.findOne({ where: { legacyScInvoiceId: id } });
  }

  findByLegacyRubberId(id: number): Promise<PlatformInvoice | null> {
    return this.repository.findOne({ where: { legacyRubberInvoiceId: id } });
  }
}
