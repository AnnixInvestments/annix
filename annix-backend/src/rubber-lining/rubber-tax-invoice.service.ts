import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { formatISODate, generateUniqueId } from "../lib/datetime";
import { RubberCompany } from "./entities/rubber-company.entity";
import {
  ExtractedTaxInvoiceData,
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";

const TAX_INVOICE_STATUS_LABELS: Record<TaxInvoiceStatus, string> = {
  [TaxInvoiceStatus.PENDING]: "Pending",
  [TaxInvoiceStatus.EXTRACTED]: "Extracted",
  [TaxInvoiceStatus.APPROVED]: "Approved",
};

const TAX_INVOICE_TYPE_LABELS: Record<TaxInvoiceType, string> = {
  [TaxInvoiceType.SUPPLIER]: "Supplier",
  [TaxInvoiceType.CUSTOMER]: "Customer",
};

export interface RubberTaxInvoiceDto {
  id: number;
  firebaseUid: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  invoiceType: TaxInvoiceType;
  invoiceTypeLabel: string;
  companyId: number;
  companyName: string | null;
  documentPath: string | null;
  status: TaxInvoiceStatus;
  statusLabel: string;
  extractedData: ExtractedTaxInvoiceData | null;
  totalAmount: number | null;
  vatAmount: number | null;
  exportedToSageAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  productDescription: string | null;
  numberOfRolls: number | null;
  unit: string | null;
  costPerUnit: number | null;
}

export interface CreateTaxInvoiceDto {
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceType: TaxInvoiceType;
  companyId: number;
  documentPath?: string;
  totalAmount?: number;
  vatAmount?: number;
}

export interface UpdateTaxInvoiceDto {
  invoiceNumber?: string;
  invoiceDate?: string;
  status?: TaxInvoiceStatus;
  totalAmount?: number;
  vatAmount?: number;
}

@Injectable()
export class RubberTaxInvoiceService {
  constructor(
    @InjectRepository(RubberTaxInvoice)
    private taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
  ) {}

  async allTaxInvoices(filters?: {
    invoiceType?: TaxInvoiceType;
    status?: TaxInvoiceStatus;
    companyId?: number;
  }): Promise<RubberTaxInvoiceDto[]> {
    const query = this.taxInvoiceRepository
      .createQueryBuilder("ti")
      .leftJoinAndSelect("ti.company", "company")
      .orderBy("ti.created_at", "DESC");

    if (filters?.invoiceType) {
      query.andWhere("ti.invoice_type = :type", { type: filters.invoiceType });
    }
    if (filters?.status) {
      query.andWhere("ti.status = :status", { status: filters.status });
    }
    if (filters?.companyId) {
      query.andWhere("ti.company_id = :companyId", { companyId: filters.companyId });
    }

    const invoices = await query.getMany();
    return invoices.map((inv) => this.mapToDto(inv));
  }

  async taxInvoiceById(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    return invoice ? this.mapToDto(invoice) : null;
  }

  async createTaxInvoice(
    dto: CreateTaxInvoiceDto,
    createdBy?: string,
  ): Promise<RubberTaxInvoiceDto> {
    const company = await this.companyRepository.findOne({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const invoice = this.taxInvoiceRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      invoiceNumber: dto.invoiceNumber,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
      invoiceType: dto.invoiceType,
      companyId: dto.companyId,
      documentPath: dto.documentPath ?? null,
      status: TaxInvoiceStatus.PENDING,
      totalAmount: dto.totalAmount != null ? String(dto.totalAmount) : null,
      vatAmount: dto.vatAmount != null ? String(dto.vatAmount) : null,
      createdBy: createdBy ?? null,
    });

    const saved = await this.taxInvoiceRepository.save(invoice);
    const result = await this.taxInvoiceRepository.findOne({
      where: { id: saved.id },
      relations: ["company"],
    });
    return this.mapToDto(result!);
  }

  async updateTaxInvoice(
    id: number,
    dto: UpdateTaxInvoiceDto,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!invoice) return null;

    if (dto.invoiceNumber !== undefined) invoice.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined) {
      invoice.invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : null;
    }
    if (dto.status !== undefined) invoice.status = dto.status;
    if (dto.totalAmount !== undefined) {
      invoice.totalAmount = dto.totalAmount != null ? String(dto.totalAmount) : null;
    }
    if (dto.vatAmount !== undefined) {
      invoice.vatAmount = dto.vatAmount != null ? String(dto.vatAmount) : null;
    }

    await this.taxInvoiceRepository.save(invoice);

    const result = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    return this.mapToDto(result!);
  }

  async deleteTaxInvoice(id: number): Promise<boolean> {
    const result = await this.taxInvoiceRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async updateDocumentPath(id: number, documentPath: string): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!invoice) return null;

    invoice.documentPath = documentPath;
    await this.taxInvoiceRepository.save(invoice);
    return this.mapToDto(invoice);
  }

  async setExtractedData(
    id: number,
    data: ExtractedTaxInvoiceData,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!invoice) return null;

    invoice.extractedData = data;
    if (data.invoiceNumber) {
      invoice.invoiceNumber = data.invoiceNumber;
    }
    if (data.invoiceDate) {
      invoice.invoiceDate = new Date(data.invoiceDate);
    }
    if (data.totalAmount != null) {
      invoice.totalAmount = String(data.totalAmount);
    }
    if (data.vatAmount != null) {
      invoice.vatAmount = String(data.vatAmount);
    }
    invoice.status = TaxInvoiceStatus.EXTRACTED;

    await this.taxInvoiceRepository.save(invoice);
    return this.mapToDto(invoice);
  }

  private extractProductSummary(data: ExtractedTaxInvoiceData | null): {
    productDescription: string | null;
    numberOfRolls: number | null;
    unit: string | null;
    costPerUnit: number | null;
  } {
    if (!data) {
      return { productDescription: null, numberOfRolls: null, unit: null, costPerUnit: null };
    }

    const subtotalExVat = data.subtotal;

    const extractedQuantity = data.productQuantity || null;
    const extractedUnit = data.productUnit || null;

    const textToSearch = data.productSummary
      || data.lineItems?.map((item) => item.description).join(" ")
      || "";

    const { quantity, unit } = this.extractQuantityAndUnit(textToSearch, extractedQuantity, extractedUnit);

    const productDescription = data.productSummary
      || (data.lineItems && data.lineItems.length > 0 ? data.lineItems[0].description : null);

    const costPerUnit =
      subtotalExVat != null && quantity != null && quantity > 0
        ? Math.round((subtotalExVat / quantity) * 100) / 100
        : subtotalExVat;

    return {
      productDescription,
      numberOfRolls: quantity,
      unit,
      costPerUnit,
    };
  }

  private extractQuantityAndUnit(
    text: string,
    aiQuantity: number | null,
    aiUnit: string | null,
  ): { quantity: number | null; unit: string | null } {
    if (aiQuantity != null && aiUnit != null) {
      return { quantity: aiQuantity, unit: aiUnit.toLowerCase() };
    }

    const rollMatch = text.match(/(\d[\d,.]*)\s*rolls?/i);
    if (rollMatch) {
      return { quantity: Number(rollMatch[1].replace(/,/g, "")), unit: "rolls" };
    }

    const kgMatch = text.match(/(\d[\d,.]*)\s*kg/i);
    if (kgMatch) {
      return { quantity: Number(kgMatch[1].replace(/,/g, "")), unit: "kg" };
    }

    return { quantity: aiQuantity, unit: aiUnit };
  }

  private mapToDto(invoice: RubberTaxInvoice): RubberTaxInvoiceDto {
    const productSummary = this.extractProductSummary(invoice.extractedData);

    return {
      id: invoice.id,
      firebaseUid: invoice.firebaseUid,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate ? formatISODate(invoice.invoiceDate) : null,
      invoiceType: invoice.invoiceType,
      invoiceTypeLabel: TAX_INVOICE_TYPE_LABELS[invoice.invoiceType],
      companyId: invoice.companyId,
      companyName: invoice.company?.name ?? null,
      documentPath: invoice.documentPath,
      status: invoice.status,
      statusLabel: TAX_INVOICE_STATUS_LABELS[invoice.status],
      extractedData: invoice.extractedData,
      totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : null,
      vatAmount: invoice.vatAmount ? Number(invoice.vatAmount) : null,
      exportedToSageAt: invoice.exportedToSageAt ? invoice.exportedToSageAt.toISOString() : null,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      productDescription: productSummary.productDescription,
      numberOfRolls: productSummary.numberOfRolls,
      unit: productSummary.unit,
      costPerUnit: productSummary.costPerUnit,
    };
  }
}
