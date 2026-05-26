import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { InvoiceFilterDto } from "./dto/invoice.dto";
import { InvoiceExtractionStatus, InvoiceStatus, PlatformInvoice } from "./entities/invoice.entity";
import { InvoiceRepository } from "./invoice.repository";

export interface InvoicePage {
  data: PlatformInvoice[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async findById(companyId: number, id: number): Promise<PlatformInvoice> {
    const invoice = await this.invoiceRepo.findByCompanyAndId(companyId, id, ["supplierContact"]);

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  search(companyId: number, filters: InvoiceFilterDto): Promise<InvoicePage> {
    return this.invoiceRepo.search(companyId, filters);
  }

  async create(data: Partial<PlatformInvoice>): Promise<PlatformInvoice> {
    return this.invoiceRepo.create(data);
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
    const invoice = await this.invoiceRepo.findById(id);
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

  findByLegacyScId(scInvoiceId: number): Promise<PlatformInvoice | null> {
    return this.invoiceRepo.findByLegacyScId(scInvoiceId);
  }

  findByLegacyRubberId(rubberInvoiceId: number): Promise<PlatformInvoice | null> {
    return this.invoiceRepo.findByLegacyRubberId(rubberInvoiceId);
  }
}
