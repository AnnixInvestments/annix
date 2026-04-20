import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { InvoiceFilterDto } from "./dto/invoice.dto";
import { InvoiceExtractionStatus, InvoiceStatus, PlatformInvoice } from "./entities/invoice.entity";

export interface InvoicePage {
  data: PlatformInvoice[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(PlatformInvoice)
    private readonly invoiceRepo: Repository<PlatformInvoice>,
  ) {}

  async findById(companyId: number, id: number): Promise<PlatformInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ["supplierContact"],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async search(companyId: number, filters: InvoiceFilterDto): Promise<InvoicePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
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

  async create(data: Partial<PlatformInvoice>): Promise<PlatformInvoice> {
    return this.invoiceRepo.save(this.invoiceRepo.create(data));
  }

  async update(
    companyId: number,
    id: number,
    data: Partial<PlatformInvoice>,
  ): Promise<PlatformInvoice> {
    const invoice = await this.findById(companyId, id);
    Object.assign(invoice, data);
    return this.invoiceRepo.save(invoice);
  }

  async setExtractedData(
    id: number,
    extractedData: Record<string, unknown>,
    extractionStatus: InvoiceExtractionStatus,
  ): Promise<PlatformInvoice> {
    const invoice = await this.invoiceRepo.findOneBy({ id });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    invoice.extractedData = extractedData;
    invoice.extractionStatus = extractionStatus;

    if (
      extractionStatus === InvoiceExtractionStatus.COMPLETED ||
      extractionStatus === InvoiceExtractionStatus.AWAITING_APPROVAL
    ) {
      invoice.status = InvoiceStatus.EXTRACTED;
    }

    return this.invoiceRepo.save(invoice);
  }

  async approve(companyId: number, id: number, approvedBy: string): Promise<PlatformInvoice> {
    const invoice = await this.findById(companyId, id);
    invoice.status = InvoiceStatus.APPROVED;
    invoice.extractionStatus = InvoiceExtractionStatus.COMPLETED;
    invoice.approvedBy = approvedBy;
    invoice.approvedAt = new Date();
    return this.invoiceRepo.save(invoice);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const invoice = await this.findById(companyId, id);
    await this.invoiceRepo.remove(invoice);
  }

  async findByLegacyScId(scInvoiceId: number): Promise<PlatformInvoice | null> {
    return this.invoiceRepo.findOne({
      where: { legacyScInvoiceId: scInvoiceId },
    });
  }

  async findByLegacyRubberId(rubberInvoiceId: number): Promise<PlatformInvoice | null> {
    return this.invoiceRepo.findOne({
      where: { legacyRubberInvoiceId: rubberInvoiceId },
    });
  }
}
