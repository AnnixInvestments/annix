import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { now } from "../../lib/datetime";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "../entities/rubber-tax-invoice.entity";
import {
  type CompanyStatementRow,
  type EligibleSageInvoiceFilters,
  type ExportableInvoiceFilters,
  RubberTaxInvoiceRepository,
  type TaxInvoiceListFilters,
  type TaxInvoicePage,
  type TaxInvoicePageFilters,
} from "./rubber-tax-invoice.repository";

@Injectable()
export class PostgresRubberTaxInvoiceRepository
  extends TypeOrmCrudRepository<RubberTaxInvoice>
  implements RubberTaxInvoiceRepository
{
  constructor(@InjectRepository(RubberTaxInvoice) repository: Repository<RubberTaxInvoice>) {
    super(repository);
  }

  build(data: Partial<RubberTaxInvoice>): RubberTaxInvoice {
    return this.repository.create(data as TypeOrmDeepPartial<RubberTaxInvoice>);
  }

  saveMany(entities: RubberTaxInvoice[]): Promise<RubberTaxInvoice[]> {
    return this.repository.save(entities);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  async updateById(id: number, updates: DeepPartial<RubberTaxInvoice>): Promise<void> {
    await this.repository.update(id, updates as TypeOrmDeepPartial<RubberTaxInvoice>);
  }

  async updatePendingToFailed(id: number): Promise<void> {
    await this.repository.update(
      { id, status: TaxInvoiceStatus.PENDING },
      { status: TaxInvoiceStatus.FAILED },
    );
  }

  findOneByIdWithCompany(id: number): Promise<RubberTaxInvoice | null> {
    return this.repository.findOne({ where: { id }, relations: ["company"] });
  }

  findOneByIdWithCompanyAndOriginal(id: number): Promise<RubberTaxInvoice | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["company", "originalInvoice"],
    });
  }

  findManyByIdsWithCompany(ids: number[]): Promise<RubberTaxInvoice[]> {
    return this.repository.find({
      where: ids.map((id) => ({ id })),
      relations: ["company"],
    });
  }

  findFilteredWithRelations(filters?: TaxInvoiceListFilters): Promise<RubberTaxInvoice[]> {
    const query = this.repository
      .createQueryBuilder("ti")
      .leftJoinAndSelect("ti.company", "company")
      .leftJoinAndSelect("ti.originalInvoice", "originalInvoice")
      .orderBy("ti.created_at", "DESC");

    if (!filters?.includeAllVersions) {
      query.andWhere("ti.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }
    if (filters?.invoiceType) {
      query.andWhere("ti.invoice_type = :type", { type: filters.invoiceType });
    }
    if (filters?.status) {
      query.andWhere("ti.status = :status", { status: filters.status });
    }
    if (filters?.companyId) {
      query.andWhere("ti.company_id = :companyId", { companyId: filters.companyId });
    }
    if (filters?.isCreditNote !== undefined) {
      query.andWhere("ti.is_credit_note = :isCreditNote", {
        isCreditNote: filters.isCreditNote,
      });
    }

    return query.getMany();
  }

  async findPaginated(
    filters: TaxInvoicePageFilters,
    sortColumnMap: Record<string, string>,
  ): Promise<TaxInvoicePage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filters.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const query = this.repository
      .createQueryBuilder("ti")
      .leftJoin("ti.company", "company")
      .addSelect(["company.id", "company.name"])
      .leftJoin("ti.originalInvoice", "originalInvoice")
      .addSelect(["originalInvoice.id", "originalInvoice.invoiceNumber"]);

    if (!filters.includeAllVersions) {
      query.andWhere("ti.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }
    if (filters.invoiceType) {
      query.andWhere("ti.invoice_type = :type", { type: filters.invoiceType });
    }
    if (filters.status) {
      query.andWhere("ti.status = :status", { status: filters.status });
    }
    if (filters.companyId) {
      query.andWhere("ti.company_id = :companyId", { companyId: filters.companyId });
    }
    if (filters.isCreditNote !== undefined) {
      query.andWhere("ti.is_credit_note = :isCreditNote", {
        isCreditNote: filters.isCreditNote,
      });
    }
    if (filters.search) {
      query.andWhere("(ti.invoice_number ILIKE :search OR company.name ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }

    const sortKey = filters.sortColumn ?? "createdAt";
    const sortColumn = sortColumnMap[sortKey] ?? "ti.created_at";
    const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
    query.orderBy(sortColumn, sortDirection, "NULLS LAST");
    query.addOrderBy("ti.id", "DESC");

    const total = await query.clone().getCount();

    query.offset(skip).limit(pageSize);
    const items = await query.getMany();

    return { items, total, page, pageSize };
  }

  async eligibleSageInvoiceIds(filters: EligibleSageInvoiceFilters): Promise<number[]> {
    const query = this.repository
      .createQueryBuilder("ti")
      .leftJoin("ti.company", "company")
      .select("ti.id", "id")
      .where("ti.invoice_type = :type", { type: filters.invoiceType })
      .andWhere("ti.status = 'APPROVED'")
      .andWhere("ti.sage_invoice_id IS NULL")
      .andWhere("ti.is_credit_note = false");

    if (!filters.includeAllVersions) {
      query.andWhere("ti.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }
    if (filters.search) {
      query.andWhere("(ti.invoice_number ILIKE :search OR company.name ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }

    const rows = await query.getRawMany();
    return rows.map((r) => Number(r.id));
  }

  async companyStatementRows(invoiceType: TaxInvoiceType): Promise<CompanyStatementRow[]> {
    const rows = await this.repository
      .createQueryBuilder("ti")
      .leftJoin("ti.company", "company")
      .select("ti.company_id", "companyId")
      .addSelect("company.name", "companyName")
      .addSelect("company.code", "companyCode")
      .addSelect("company.email_config", "emailConfig")
      .addSelect("COUNT(*)", "invoiceCount")
      .addSelect("COALESCE(SUM(ti.total_amount), 0)", "total")
      .addSelect("COALESCE(SUM(ti.vat_amount), 0)", "vatTotal")
      .where("ti.invoice_type = :type", { type: invoiceType })
      .andWhere("ti.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      })
      .andWhere("ti.is_credit_note = false")
      .groupBy("ti.company_id")
      .addGroupBy("company.name")
      .addGroupBy("company.code")
      .addGroupBy("company.email_config")
      .orderBy('"total"', "DESC")
      .getRawMany();

    return rows.map((r) => ({
      companyId: Number(r.companyId),
      companyName: r.companyName,
      companyCode: r.companyCode,
      emailConfig: r.emailConfig,
      invoiceCount: Number(r.invoiceCount),
      total: Number(r.total),
      vatTotal: Number(r.vatTotal),
    }));
  }

  findExportableInvoices(filters: ExportableInvoiceFilters): Promise<RubberTaxInvoice[]> {
    const query = this.repository
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.company", "company")
      .where("invoice.invoice_type = :type", { type: filters.invoiceType })
      .andWhere("invoice.status = :status", { status: TaxInvoiceStatus.APPROVED });

    if (filters.dateFrom) {
      query.andWhere("invoice.invoice_date >= :dateFrom", { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      query.andWhere("invoice.invoice_date <= :dateTo", { dateTo: filters.dateTo });
    }
    if (filters.excludeExported) {
      query.andWhere("invoice.exported_to_sage_at IS NULL");
    }
    if (filters.invoiceId) {
      query.andWhere("invoice.id = :invoiceId", { invoiceId: filters.invoiceId });
    }

    query.orderBy("invoice.invoice_date", "ASC");

    return query.getMany();
  }

  async markExportedToSage(ids: number[]): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RubberTaxInvoice)
      .set({ exportedToSageAt: now().toJSDate() } as unknown as RubberTaxInvoice)
      .where({ id: In(ids) })
      .execute();
  }

  findOneByNormalizedRefAndCompany(
    normalizedRef: string,
    companyId: number,
  ): Promise<RubberTaxInvoice | null> {
    return this.repository
      .createQueryBuilder("ti")
      .where("REPLACE(REPLACE(ti.invoice_number, '-', ''), ' ', '') = :ref", {
        ref: normalizedRef,
      })
      .andWhere("ti.company_id = :companyId", { companyId })
      .andWhere("ti.is_credit_note = false")
      .getOne();
  }

  findApprovedSupplierInvoicesInPeriod(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<RubberTaxInvoice[]> {
    return this.repository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.status = :status", { status: TaxInvoiceStatus.APPROVED })
      .andWhere("inv.invoice_date >= :startDate", { startDate })
      .andWhere("inv.invoice_date < :endDate", { endDate })
      .andWhere("inv.version_status = :vs", { vs: "ACTIVE" })
      .getMany();
  }

  findActiveSupplierInvoicesForReconciliation(companyId: number): Promise<RubberTaxInvoice[]> {
    return this.repository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.status IN (:...statuses)", {
        statuses: [TaxInvoiceStatus.APPROVED, TaxInvoiceStatus.EXTRACTED],
      })
      .andWhere("inv.version_status = :vs", { vs: "ACTIVE" })
      .getMany();
  }

  findApprovedInvoicesForPeriod(
    invoiceType: TaxInvoiceType,
    startDate: string,
    endDate: string,
    companyId?: number,
  ): Promise<RubberTaxInvoice[]> {
    const query = this.repository
      .createQueryBuilder("inv")
      .leftJoinAndSelect("inv.company", "company")
      .where("inv.invoice_type = :invoiceType", { invoiceType })
      .andWhere("inv.status = :status", { status: TaxInvoiceStatus.APPROVED })
      .andWhere("inv.invoice_date >= :startDate", { startDate })
      .andWhere("inv.invoice_date < :endDate", { endDate })
      .andWhere("inv.version_status = :versionStatus", { versionStatus: "ACTIVE" })
      .orderBy("company.name", "ASC")
      .addOrderBy("inv.invoice_date", "ASC");

    if (companyId) {
      query.andWhere("inv.company_id = :companyId", { companyId });
    }

    return query.getMany();
  }

  findRecentSupplierInvoices(companyId: number, limit: number): Promise<RubberTaxInvoice[]> {
    return this.repository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.is_credit_note = false")
      .orderBy("inv.invoice_date", "DESC")
      .limit(limit)
      .getMany();
  }

  findOneActiveByNumberCompanyAndType(
    invoiceNumber: string,
    companyId: number,
    invoiceType: TaxInvoiceType,
  ): Promise<RubberTaxInvoice | null> {
    return this.repository
      .createQueryBuilder("ti")
      .where("LOWER(TRIM(ti.invoice_number)) = LOWER(TRIM(:invoiceNumber))", { invoiceNumber })
      .andWhere("ti.company_id = :companyId", { companyId })
      .andWhere("ti.invoice_type = :invoiceType", { invoiceType })
      .andWhere("ti.version_status = :status", { status: DocumentVersionStatus.ACTIVE })
      .getOne();
  }

  findNewerVersionsByPreviousId(id: number): Promise<RubberTaxInvoice[]> {
    return this.repository
      .createQueryBuilder("e")
      .where("e.previous_version_id = :id", { id })
      .getMany();
  }
}
