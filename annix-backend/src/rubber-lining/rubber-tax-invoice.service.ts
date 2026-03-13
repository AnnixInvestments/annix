import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { formatISODate, generateUniqueId } from "../lib/datetime";
import { RubberCompany } from "./entities/rubber-company.entity";
import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberTaxInvoiceCorrection } from "./entities/rubber-tax-invoice-correction.entity";
import {
  ExtractedTaxInvoiceData,
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";
import { RubberStockService } from "./rubber-stock.service";

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
  sageInvoiceId: number | null;
  postedToSageAt: string | null;
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
  productDescription?: string;
  orderNumber?: string;
  deliveryNoteRef?: string;
  quantity?: number;
  unit?: string;
  costPerUnit?: number;
  subtotal?: number;
  correctedBy?: string;
}

@Injectable()
export class RubberTaxInvoiceService {
  private readonly logger = new Logger(RubberTaxInvoiceService.name);

  constructor(
    @InjectRepository(RubberTaxInvoice)
    private taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @InjectRepository(RubberTaxInvoiceCorrection)
    private correctionRepository: Repository<RubberTaxInvoiceCorrection>,
    private rubberStockService: RubberStockService,
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

    const existing = invoice.extractedData ?? {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate ? formatISODate(invoice.invoiceDate) : null,
      companyName: null,
      productSummary: null,
      deliveryNoteRef: null,
      orderNumber: null,
      lineItems: [],
      subtotal: null,
      vatAmount: null,
      totalAmount: null,
    };

    const corrections: { field: string; original: string; corrected: string }[] = [];
    const supplierName = invoice.company?.name ?? existing.companyName ?? null;

    if (dto.orderNumber !== undefined && dto.orderNumber !== existing.orderNumber) {
      corrections.push({
        field: "orderNumber",
        original: existing.orderNumber ?? "",
        corrected: dto.orderNumber ?? "",
      });
    }
    if (dto.vatAmount !== undefined && dto.vatAmount !== existing.vatAmount) {
      corrections.push({
        field: "vatAmount",
        original: String(existing.vatAmount ?? ""),
        corrected: String(dto.vatAmount ?? ""),
      });
    }
    if (dto.totalAmount !== undefined && dto.totalAmount !== (existing.totalAmount ?? null)) {
      corrections.push({
        field: "totalAmount",
        original: String(existing.totalAmount ?? ""),
        corrected: String(dto.totalAmount ?? ""),
      });
    }
    if (dto.subtotal !== undefined && dto.subtotal !== existing.subtotal) {
      corrections.push({
        field: "subtotal",
        original: String(existing.subtotal ?? ""),
        corrected: String(dto.subtotal ?? ""),
      });
    }
    if (dto.quantity !== undefined && dto.quantity !== existing.productQuantity) {
      corrections.push({
        field: "quantity",
        original: String(existing.productQuantity ?? ""),
        corrected: String(dto.quantity ?? ""),
      });
    }

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

    const hasExtractedDataUpdate =
      dto.productDescription !== undefined ||
      dto.orderNumber !== undefined ||
      dto.deliveryNoteRef !== undefined ||
      dto.quantity !== undefined ||
      dto.unit !== undefined ||
      dto.costPerUnit !== undefined ||
      dto.subtotal !== undefined;

    if (hasExtractedDataUpdate) {
      if (dto.productDescription !== undefined) existing.productSummary = dto.productDescription;
      if (dto.orderNumber !== undefined) existing.orderNumber = dto.orderNumber;
      if (dto.deliveryNoteRef !== undefined) existing.deliveryNoteRef = dto.deliveryNoteRef;
      if (dto.quantity !== undefined) existing.productQuantity = dto.quantity;
      if (dto.unit !== undefined) existing.productUnit = dto.unit;
      if (dto.subtotal !== undefined) existing.subtotal = dto.subtotal;
      if (dto.vatAmount !== undefined) existing.vatAmount = dto.vatAmount ?? null;
      if (dto.costPerUnit !== undefined && dto.quantity !== undefined && dto.quantity > 0) {
        existing.subtotal = Math.round(dto.costPerUnit * dto.quantity * 100) / 100;
      }

      invoice.extractedData = existing;
    }

    await this.taxInvoiceRepository.save(invoice);

    if (corrections.length > 0 && supplierName) {
      const correctionEntities = corrections.map((c) =>
        this.correctionRepository.create({
          taxInvoiceId: id,
          supplierName,
          fieldName: c.field,
          originalValue: c.original,
          correctedValue: c.corrected,
          correctedBy: dto.correctedBy ?? null,
        }),
      );
      await this.correctionRepository.save(correctionEntities);
    }

    const result = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    return this.mapToDto(result!);
  }

  async approveTaxInvoice(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!invoice) return null;

    if (invoice.status === TaxInvoiceStatus.APPROVED) {
      return this.mapToDto(invoice);
    }

    invoice.status = TaxInvoiceStatus.APPROVED;
    await this.taxInvoiceRepository.save(invoice);

    if (invoice.invoiceType === TaxInvoiceType.SUPPLIER) {
      await this.processCompoundStockIn(invoice);
    }

    const result = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    return this.mapToDto(result!);
  }

  private async processCompoundStockIn(invoice: RubberTaxInvoice): Promise<void> {
    const alreadyProcessed = await this.rubberStockService.movementExistsForReference(
      CompoundMovementReferenceType.INVOICE_RECEIPT,
      invoice.id,
    );
    if (alreadyProcessed) return;

    const compoundCoding = await this.compoundCodingFromInvoice(invoice);
    if (!compoundCoding) {
      this.logger.warn(
        `Tax invoice ${invoice.invoiceNumber}: could not resolve compound coding from product summary`,
      );
      return;
    }

    const quantityKg = this.compoundQuantityKgFromInvoice(invoice);
    if (quantityKg === null || quantityKg <= 0) {
      this.logger.warn(
        `Tax invoice ${invoice.invoiceNumber}: could not determine kg quantity from extracted data`,
      );
      return;
    }

    const costPerKg = this.compoundCostPerKgFromInvoice(invoice, quantityKg);

    await this.rubberStockService.addCompoundStockByCoding(
      compoundCoding.id,
      quantityKg,
      costPerKg,
      CompoundMovementReferenceType.INVOICE_RECEIPT,
      invoice.id,
      `Supplier invoice ${invoice.invoiceNumber}`,
    );

    this.logger.log(
      `Tax invoice ${invoice.invoiceNumber}: added ${quantityKg} kg to compound stock for ${compoundCoding.code}`,
    );
  }

  private async compoundCodingFromInvoice(
    invoice: RubberTaxInvoice,
  ): Promise<RubberProductCoding | null> {
    const data = invoice.extractedData;
    if (!data) return null;

    const textToSearch =
      data.productSummary || data.lineItems?.map((item) => item.description).join(" ") || "";

    const snCodeMatch = textToSearch.match(/AU[A-Z]\d{2}[A-Z]{1,2}[A-Z]{2}[A-Z0-9]{2,3}/i);
    if (snCodeMatch) {
      const code = snCodeMatch[0].toUpperCase();
      const coding = await this.productCodingRepository.findOne({
        where: { code, codingType: ProductCodingType.COMPOUND },
      });
      if (coding) return coding;
    }

    const compoundCodes = await this.productCodingRepository.find({
      where: { codingType: ProductCodingType.COMPOUND },
    });

    const upperText = textToSearch.toUpperCase();
    const matched = compoundCodes.find((c) => upperText.includes(c.code.toUpperCase()));
    return matched ?? null;
  }

  private compoundQuantityKgFromInvoice(invoice: RubberTaxInvoice): number | null {
    const data = invoice.extractedData;
    if (!data) return null;

    if (data.productQuantity != null && data.productUnit != null) {
      if (data.productUnit.toLowerCase() === "kg") {
        return data.productQuantity;
      }
    }

    const textToSearch =
      data.productSummary || data.lineItems?.map((item) => item.description).join(" ") || "";

    const kgMatch = textToSearch.match(/(\d[\d,.]*)\s*kg/i);
    if (kgMatch) {
      return Number(kgMatch[1].replace(/,/g, ""));
    }

    return null;
  }

  private compoundCostPerKgFromInvoice(
    invoice: RubberTaxInvoice,
    quantityKg: number,
  ): number | null {
    const data = invoice.extractedData;
    if (!data || !data.subtotal || quantityKg <= 0) return null;
    return Math.round((data.subtotal / quantityKg) * 100) / 100;
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

    const textToSearch =
      data.productSummary || data.lineItems?.map((item) => item.description).join(" ") || "";

    const { quantity, unit } = this.extractQuantityAndUnit(
      textToSearch,
      extractedQuantity,
      extractedUnit,
    );

    const productDescription =
      data.productSummary ||
      (data.lineItems && data.lineItems.length > 0 ? data.lineItems[0].description : null);

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
      sageInvoiceId: invoice.sageInvoiceId ?? null,
      postedToSageAt: invoice.postedToSageAt ? invoice.postedToSageAt.toISOString() : null,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      productDescription: productSummary.productDescription,
      numberOfRolls: productSummary.numberOfRolls,
      unit: productSummary.unit,
      costPerUnit: productSummary.costPerUnit,
    };
  }

  async correctionHintsForSupplier(supplierName: string | null): Promise<string | null> {
    if (!supplierName) return null;

    const recentCorrections = await this.correctionRepository.find({
      where: { supplierName },
      order: { createdAt: "DESC" },
      take: 30,
    });

    if (recentCorrections.length === 0) return null;

    const hints = recentCorrections.map(
      (c) =>
        `- Field "${c.fieldName}" was corrected from "${c.originalValue}" to "${c.correctedValue}"`,
    );

    return `PREVIOUS CORRECTIONS FOR THIS SUPPLIER (learn from these patterns):\n${hints.join("\n")}\n\nApply these patterns to new invoices from the same supplier. For example, if orderNumber was consistently corrected from a long reference to a short number, extract the short number from the header table.`;
  }
}
