import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import { formatISODate, fromISO, generateUniqueId, now } from "../lib/datetime";
import { PaginatedResult } from "../lib/dto/pagination-query.dto";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RollStockStatus } from "./entities/rubber-roll-stock.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import {
  CreditNoteType,
  ExtractedTaxInvoiceData,
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";
import {
  AuRubberDocumentType,
  AuRubberPartyType,
  auRubberDocumentPath,
  sanitizeAuRubberDocNumber,
} from "./lib/au-rubber-document-paths";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberProductRepository } from "./repositories/rubber-product.repository";
import { RubberProductCodingRepository } from "./repositories/rubber-product-coding.repository";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";
import { RubberTaxInvoiceCorrectionRepository } from "./repositories/rubber-tax-invoice-correction.repository";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";
import { RubberRollStockService } from "./rubber-roll-stock.service";
import { RubberStockService } from "./rubber-stock.service";

const TAX_INVOICE_STATUS_LABELS: Record<TaxInvoiceStatus, string> = {
  [TaxInvoiceStatus.PENDING]: "Pending",
  [TaxInvoiceStatus.EXTRACTED]: "Extracted",
  [TaxInvoiceStatus.APPROVED]: "Approved",
  [TaxInvoiceStatus.FAILED]: "Extraction Failed",
};

const TAX_INVOICE_TYPE_LABELS: Record<TaxInvoiceType, string> = {
  [TaxInvoiceType.SUPPLIER]: "Supplier",
  [TaxInvoiceType.CUSTOMER]: "Customer",
};

const TAX_INVOICE_SORT_MAP: Record<string, string> = {
  invoiceNumber: "ti.invoice_number",
  invoiceDate: "ti.invoice_date",
  totalAmount: "ti.total_amount",
  vatAmount: "ti.vat_amount",
  status: "ti.status",
  companyName: "company.name",
  createdAt: "ti.created_at",
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
  version: number;
  versionStatus: DocumentVersionStatus;
  versionStatusLabel: string;
  previousVersionId: number | null;
  isCreditNote: boolean;
  creditNoteType: CreditNoteType | null;
  originalInvoiceId: number | null;
  originalInvoiceNumber: string | null;
  creditNoteRollNumbers: string[];
  customerCreditNeeded: { rollNumber: string; auCocId: number; auCocNumber: string | null }[];
  returnExceptions: { rollNumber: string; reason: string }[];
  linkedCalenderRollCocId: number | null;
  linkedCalenderRollCocNumber: string | null;
}

export interface CreateTaxInvoiceDto {
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceType: TaxInvoiceType;
  companyId: number;
  documentPath?: string;
  totalAmount?: number;
  vatAmount?: number;
  isCreditNote?: boolean;
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

interface CreditNoteReturnShippedRoll {
  rollNumber: string;
  auCocId: number;
  customerDeliveryNoteId: number;
}

export interface CreditNoteReturnResult {
  rejected: number;
  deductedKg: number;
  alreadyShipped: CreditNoteReturnShippedRoll[];
  unmatched: string[];
  // Rolls whose number matched a roll that AU received from a DIFFERENT supplier
  // than the one issuing this credit note — a strong sign of an OCR mis-read, so
  // they are skipped (not rejected/deducted) rather than corrupting the wrong roll.
  wrongSupplier: string[];
  // Rolls that were returned (marked REJECTED) but whose kg could not be
  // auto-deducted — no compound coding, or an implausible weight — so a human
  // must adjust compound stock manually.
  needsManualKg: string[];
}

// A single rubber roll is realistically well under this; a weight above it is
// almost certainly an OCR mis-read (e.g. "5000" for "50.00"), so the kg is not
// auto-deducted and is left for a manual stock adjustment instead.
const MAX_RETURN_ROLL_WEIGHT_KG = 5000;

@Injectable()
export class RubberTaxInvoiceService {
  private readonly logger = new Logger(RubberTaxInvoiceService.name);

  constructor(
    private taxInvoiceRepository: RubberTaxInvoiceRepository,
    private companyRepository: RubberCompanyRepository,
    private productCodingRepository: RubberProductCodingRepository,
    private correctionRepository: RubberTaxInvoiceCorrectionRepository,
    private productRepository: RubberProductRepository,
    private deliveryNoteRepository: RubberDeliveryNoteRepository,
    private rollStockRepository: RubberRollStockRepository,
    private supplierCocRepository: RubberSupplierCocRepository,
    private rubberStockService: RubberStockService,
    private versioningService: RubberDocumentVersioningService,
    private rollStockService: RubberRollStockService,
    private auCocRepository: RubberAuCocRepository,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
  ) {}

  async allTaxInvoices(filters?: {
    invoiceType?: TaxInvoiceType;
    status?: TaxInvoiceStatus;
    companyId?: number;
    includeAllVersions?: boolean;
    isCreditNote?: boolean;
  }): Promise<RubberTaxInvoiceDto[]> {
    const invoices = await this.taxInvoiceRepository.findFilteredWithRelations(filters);
    return this.mapManyToDto(invoices);
  }

  async paginatedTaxInvoices(filters?: {
    invoiceType?: TaxInvoiceType;
    status?: TaxInvoiceStatus;
    companyId?: number;
    includeAllVersions?: boolean;
    isCreditNote?: boolean;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<RubberTaxInvoiceDto>> {
    const { items, total, page, pageSize } = await this.taxInvoiceRepository.findPaginated(
      filters ?? {},
      TAX_INVOICE_SORT_MAP,
    );

    return {
      items: await this.mapManyToDto(items),
      total,
      page,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async companyStatements(filters: { invoiceType: TaxInvoiceType }): Promise<
    {
      companyId: number;
      companyName: string;
      companyCode: string | null;
      emailConfig: Record<string, string> | null;
      invoiceCount: number;
      total: number;
      vatTotal: number;
    }[]
  > {
    return this.taxInvoiceRepository.companyStatementRows(filters.invoiceType);
  }

  async eligibleSageInvoiceIds(filters: {
    invoiceType: TaxInvoiceType;
    search?: string;
    includeAllVersions?: boolean;
  }): Promise<number[]> {
    return this.taxInvoiceRepository.eligibleSageInvoiceIds(filters);
  }

  async taxInvoiceById(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompanyAndOriginal(id);
    return invoice ? this.mapSingleToDto(invoice) : null;
  }

  async taxInvoiceEntityById(id: number): Promise<RubberTaxInvoice | null> {
    return this.taxInvoiceRepository.findOneByIdWithCompany(id);
  }

  async createTaxInvoice(
    dto: CreateTaxInvoiceDto,
    createdBy?: string,
  ): Promise<RubberTaxInvoiceDto> {
    const company = await this.companyRepository.findById(dto.companyId);
    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const existingActive = dto.invoiceNumber
      ? await this.versioningService.existingActiveTaxInvoice(
          dto.invoiceNumber,
          dto.companyId,
          dto.invoiceType,
        )
      : null;

    const isDuplicate = existingActive !== null;

    const invoice = this.taxInvoiceRepository.build({
      firebaseUid: `pg_${generateUniqueId()}`,
      invoiceNumber: dto.invoiceNumber,
      invoiceDate: dto.invoiceDate ? fromISO(dto.invoiceDate).toJSDate() : null,
      invoiceType: dto.invoiceType,
      companyId: dto.companyId,
      documentPath: dto.documentPath ?? null,
      status: TaxInvoiceStatus.PENDING,
      totalAmount: dto.totalAmount != null ? String(dto.totalAmount) : null,
      vatAmount: dto.vatAmount != null ? String(dto.vatAmount) : null,
      createdBy: createdBy ?? null,
      version: isDuplicate ? existingActive.version + 1 : 1,
      previousVersionId: isDuplicate ? existingActive.id : null,
      versionStatus: isDuplicate
        ? DocumentVersionStatus.PENDING_AUTHORIZATION
        : DocumentVersionStatus.ACTIVE,
      isCreditNote: dto.isCreditNote ?? false,
      // Required by the schema; populated later from extraction for credit notes.
      creditNoteRollNumbers: [],
    });

    if (isDuplicate) {
      this.logger.log(
        `Duplicate tax invoice detected: ${dto.invoiceNumber} for company ${dto.companyId} - creating v${invoice.version} pending authorization`,
      );
    }

    const saved = await this.taxInvoiceRepository.create(invoice);
    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(saved.id);
    return this.mapSingleToDto(result!);
  }

  async updateTaxInvoice(
    id: number,
    dto: UpdateTaxInvoiceDto,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
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

    const supplierName = invoice.company?.name ?? existing.companyName ?? null;

    const corrections = [
      ...(dto.orderNumber !== undefined && dto.orderNumber !== existing.orderNumber
        ? [
            {
              field: "orderNumber",
              original: existing.orderNumber ?? "",
              corrected: dto.orderNumber ?? "",
            },
          ]
        : []),
      ...(dto.vatAmount !== undefined && dto.vatAmount !== existing.vatAmount
        ? [
            {
              field: "vatAmount",
              original: String(existing.vatAmount ?? ""),
              corrected: String(dto.vatAmount ?? ""),
            },
          ]
        : []),
      ...(dto.totalAmount !== undefined && dto.totalAmount !== (existing.totalAmount ?? null)
        ? [
            {
              field: "totalAmount",
              original: String(existing.totalAmount ?? ""),
              corrected: String(dto.totalAmount ?? ""),
            },
          ]
        : []),
      ...(dto.subtotal !== undefined && dto.subtotal !== existing.subtotal
        ? [
            {
              field: "subtotal",
              original: String(existing.subtotal ?? ""),
              corrected: String(dto.subtotal ?? ""),
            },
          ]
        : []),
      ...(dto.quantity !== undefined && dto.quantity !== existing.productQuantity
        ? [
            {
              field: "quantity",
              original: String(existing.productQuantity ?? ""),
              corrected: String(dto.quantity ?? ""),
            },
          ]
        : []),
    ];

    if (dto.invoiceNumber !== undefined) invoice.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined) {
      invoice.invoiceDate = dto.invoiceDate ? fromISO(dto.invoiceDate).toJSDate() : null;
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
        this.correctionRepository.build({
          taxInvoiceId: id,
          supplierName,
          fieldName: c.field,
          originalValue: c.original,
          correctedValue: c.corrected,
          correctedBy: dto.correctedBy ?? null,
        }),
      );
      await this.correctionRepository.saveMany(correctionEntities);
    }

    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    return this.mapSingleToDto(result!);
  }

  async approveTaxInvoice(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;

    if (invoice.versionStatus === DocumentVersionStatus.PENDING_AUTHORIZATION) {
      throw new BadRequestException(
        "This document version is awaiting authorization and cannot be approved",
      );
    }

    if (invoice.status === TaxInvoiceStatus.APPROVED) {
      return this.mapSingleToDto(invoice);
    }

    invoice.status = TaxInvoiceStatus.APPROVED;
    await this.taxInvoiceRepository.save(invoice);

    if (invoice.isCreditNote) {
      const creditResult = await this.processCreditNoteRollRejections(invoice);
      // Persist the rolls that did not fully process so the detail page can show
      // the operator exactly what still needs attention.
      invoice.returnExceptions = [
        ...creditResult.wrongSupplier.map((rollNumber) => ({
          rollNumber,
          reason: "WRONG_SUPPLIER",
        })),
        ...creditResult.unmatched.map((rollNumber) => ({ rollNumber, reason: "NOT_FOUND" })),
        ...creditResult.needsManualKg.map((rollNumber) => ({ rollNumber, reason: "MANUAL_KG" })),
      ];
      await this.taxInvoiceRepository.save(invoice);
      if (creditResult.alreadyShipped.length > 0) {
        await this.flagCustomerCreditNeeded(invoice, creditResult);
      }
    } else if (invoice.invoiceType === TaxInvoiceType.SUPPLIER) {
      const isCalendarer = await this.isCalendarerCompany(invoice.companyId);
      if (isCalendarer) {
        await this.processCalendarerRollDeduction(invoice);
      } else {
        await this.processCompoundStockIn(invoice);
      }
      await this.processSupplierPerRollIntake(invoice);
    } else if (invoice.invoiceType === TaxInvoiceType.CUSTOMER) {
      await this.processCustomerPerRollShipment(invoice);
    }

    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    return this.mapSingleToDto(result!);
  }

  async classifyCreditNote(
    id: number,
    creditNoteType: CreditNoteType,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;
    if (!invoice.isCreditNote) {
      throw new BadRequestException("Only a credit note can be classified");
    }
    // Classification drives the destructive stock effect at approval time, so it
    // must be locked once approved — otherwise a FINANCIAL_ONLY could be flipped
    // to PHYSICAL_RETURN after the fact, leaving stock and the record out of sync.
    if (invoice.status === TaxInvoiceStatus.APPROVED) {
      throw new BadRequestException("Cannot re-classify an already-approved credit note");
    }
    invoice.creditNoteType = creditNoteType;
    await this.taxInvoiceRepository.save(invoice);
    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    return this.mapSingleToDto(result!);
  }

  async reprocessCompoundStock(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;
    if (invoice.status !== TaxInvoiceStatus.APPROVED) return this.mapSingleToDto(invoice);
    if (invoice.invoiceType !== TaxInvoiceType.SUPPLIER) return this.mapSingleToDto(invoice);

    await this.rubberStockService.deleteMovementsForReference(
      CompoundMovementReferenceType.INVOICE_RECEIPT,
      invoice.id,
    );
    await this.rubberStockService.deleteMovementsForReference(
      CompoundMovementReferenceType.CALENDARING,
      invoice.id,
    );

    const isCalendarer = await this.isCalendarerCompany(invoice.companyId);
    if (isCalendarer) {
      await this.processCalendarerRollDeduction(invoice);
    } else {
      await this.processCompoundStockIn(invoice);
    }

    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    return this.mapSingleToDto(result!);
  }

  async refileStock(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;

    if (invoice.invoiceType === TaxInvoiceType.SUPPLIER) {
      return this.reprocessCompoundStock(id);
    }
    if (!invoice.isCreditNote) {
      await this.dispatchCustomerRollsToStock(invoice);
    }
    return this.mapSingleToDto(invoice);
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

    const snDashMatch = textToSearch.match(/AU-([A-Z])(\d{2})-([A-Z]{1,2}(?:SC|AC|PC|RC))/i);
    if (snDashMatch) {
      const code = snDashMatch[0].replace(/-/g, "").toUpperCase();
      return this.findOrCreateCompoundCoding(code, invoice.invoiceNumber);
    }

    const strippedText = textToSearch.replace(/-/g, "");
    const snCodeMatch = strippedText.match(/AU([A-Z])(\d{2})([A-Z]{1,2}(?:SC|AC|PC|RC))/i);
    if (snCodeMatch) {
      const code = snCodeMatch[0].toUpperCase();
      return this.findOrCreateCompoundCoding(code, invoice.invoiceNumber);
    }

    return null;
  }

  private async findOrCreateCompoundCoding(
    code: string,
    invoiceNumber: string,
  ): Promise<RubberProductCoding> {
    const existing = await this.productCodingRepository.findOneByCodeAndType(
      code,
      ProductCodingType.COMPOUND,
    );
    if (existing) return existing;

    const humanName = this.humanReadableCompoundName(code);
    const saved = await this.productCodingRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      code,
      name: humanName,
      codingType: ProductCodingType.COMPOUND,
    });
    this.logger.log(
      `Tax invoice ${invoiceNumber}: auto-created compound coding ${code} (${humanName})`,
    );
    return saved;
  }

  private async isCalendarerCompany(companyId: number): Promise<boolean> {
    const company = await this.companyRepository.findById(companyId);
    if (!company) return false;
    return company.name?.toLowerCase().includes("impilo") || false;
  }

  async updateLineItemRolls(
    invoiceId: number,
    lineIdx: number,
    rolls: Array<{ rollNumber: string; weightKg: number | null }>,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(invoiceId);
    if (!invoice) return null;
    const data = invoice.extractedData;
    if (!data?.lineItems || lineIdx < 0 || lineIdx >= data.lineItems.length) {
      throw new BadRequestException("Line item not found");
    }
    const updated = data.lineItems.map((li, idx) =>
      idx === lineIdx ? { ...li, rolls, quantity: rolls.length } : li,
    );
    invoice.extractedData = { ...data, lineItems: updated };
    await this.taxInvoiceRepository.save(invoice);

    if (invoice.invoiceType === TaxInvoiceType.CUSTOMER && !invoice.isCreditNote) {
      await this.dispatchCustomerRollsToStock(invoice);
    }

    return this.mapSingleToDto(invoice);
  }

  private async processSupplierPerRollIntake(invoice: RubberTaxInvoice): Promise<void> {
    const lineItems = invoice.extractedData?.lineItems;
    if (!lineItems || lineItems.length === 0) return;
    const hasRolls = lineItems.some((li) => li.rolls && li.rolls.length > 0);
    if (!hasRolls) return;
    const result = await this.rollStockService.createRollsFromSupplierTaxInvoice(
      invoice.id,
      lineItems.map((li) => ({
        description: li.description,
        unitPrice: li.unitPrice,
        rolls: li.rolls ?? null,
      })),
    );
    this.logger.log(
      `Supplier tax invoice ${invoice.invoiceNumber}: created ${result.created} per-roll stock records, reconciled ${result.reconciled} CTI placeholders, ${result.skipped} skipped (already linked to another STI)`,
    );
    const propagated = await this.rollStockService.propagateCompoundCostsForImpiloInvoice(
      invoice.id,
    );
    if (propagated.updated > 0 && propagated.unitPrice != null) {
      this.logger.log(
        `Supplier tax invoice ${invoice.invoiceNumber}: applied compound cost R${propagated.unitPrice}/kg to ${propagated.updated} rolls`,
      );
    } else {
      this.logger.warn(
        `Supplier tax invoice ${invoice.invoiceNumber}: no S&N compound cost matched — rolls saved with toll cost only (compound_cost_r=null)`,
      );
    }
  }

  private async processCustomerPerRollShipment(invoice: RubberTaxInvoice): Promise<void> {
    const lineItems = invoice.extractedData?.lineItems;
    if (!lineItems || lineItems.length === 0) return;
    const allRollNumbers = lineItems.flatMap((li) => (li.rolls ?? []).map((r) => r.rollNumber));
    if (allRollNumbers.length === 0) return;
    const result = await this.rollStockService.markRollsSoldByNumbers(
      allRollNumbers,
      invoice.companyId,
      invoice.id,
    );
    if (result.missing.length > 0) {
      this.logger.warn(
        `Customer tax invoice ${invoice.invoiceNumber}: ${result.missing.length} rolls not found in stock — ${result.missing.join(", ")}`,
      );
    }
    this.logger.log(
      `Customer tax invoice ${invoice.invoiceNumber}: marked ${result.marked} rolls as sold to company ${invoice.companyId}`,
    );
  }

  private async processCalendarerRollDeduction(invoice: RubberTaxInvoice): Promise<void> {
    const alreadyByInvoice = await this.rubberStockService.movementExistsForReference(
      CompoundMovementReferenceType.CALENDARING,
      invoice.id,
    );
    if (alreadyByInvoice) return;

    const data = invoice.extractedData;
    if (!data) return;

    const textToSearch =
      data.productSummary || data.lineItems?.map((item) => item.description).join(" ") || "";

    const rollInfo = this.parseCalendarerRollDescription(textToSearch);
    if (!rollInfo) {
      this.logger.warn(
        `Tax invoice ${invoice.invoiceNumber}: could not parse calendarer roll description`,
      );
      return;
    }

    const compoundCode = this.compoundCodeFromRollInfo(rollInfo);
    const compoundCoding = await this.findOrCreateCompoundCoding(
      compoundCode,
      invoice.invoiceNumber,
    );

    const linkedDn = await this.linkedSupplierDeliveryNote(data.deliveryNoteRef);

    if (linkedDn) {
      const alreadyByDn = await this.rubberStockService.movementExistsForReference(
        CompoundMovementReferenceType.CALENDARING,
        linkedDn.id,
      );
      if (alreadyByDn) return;
    }
    const dnRolls = linkedDn?.extractedData?.rolls || [];
    const rollWeights = dnRolls
      .filter((r) => r.weightKg != null && Number(r.weightKg) > 0)
      .map((r) => ({ rollNumber: r.rollNumber, weightKg: Number(r.weightKg) }));

    if (rollWeights.length > 0 && linkedDn) {
      const referenceId = linkedDn.id;
      const totalKg = rollWeights.reduce((sum, r) => sum + r.weightKg, 0);

      await rollWeights.reduce<Promise<void>>(async (prev, roll, idx) => {
        await prev;
        await this.rubberStockService.deductCompoundStockByCoding(
          compoundCoding.id,
          roll.weightKg,
          CompoundMovementReferenceType.CALENDARING,
          referenceId,
          `Calendarer invoice ${invoice.invoiceNumber}, DN ${linkedDn.deliveryNoteNumber || linkedDn.id} (roll ${roll.rollNumber || idx + 1}, ${roll.weightKg.toFixed(1)} kg)`,
        );
      }, Promise.resolve());

      this.logger.log(
        `Tax invoice ${invoice.invoiceNumber}: deducted ${totalKg.toFixed(1)} kg from ${compoundCode} using SDN ${linkedDn.deliveryNoteNumber} weights (${rollWeights.length} rolls)`,
      );
    } else {
      const specificGravity = await this.specificGravityForCoding(compoundCoding.id);
      const quantity = data.productQuantity || rollInfo.quantity || 1;
      const rollWeightKg =
        (rollInfo.thicknessMm / 1000) *
        (rollInfo.widthMm / 1000) *
        rollInfo.lengthM *
        specificGravity *
        1000;

      if (rollWeightKg <= 0) {
        this.logger.warn(
          `Tax invoice ${invoice.invoiceNumber}: calculated roll weight is zero or negative`,
        );
        return;
      }

      const referenceId = linkedDn?.id || invoice.id;

      await Array.from({ length: quantity }).reduce(async (prev, _, idx) => {
        await prev;
        const rollNum = idx + 1;
        return this.rubberStockService.deductCompoundStockByCoding(
          compoundCoding.id,
          rollWeightKg,
          CompoundMovementReferenceType.CALENDARING,
          referenceId,
          `Calendarer invoice ${invoice.invoiceNumber} (roll ${rollNum}/${quantity}, ${rollWeightKg.toFixed(1)} kg, calculated)`,
        );
      }, Promise.resolve());

      this.logger.log(
        `Tax invoice ${invoice.invoiceNumber}: deducted ${(rollWeightKg * quantity).toFixed(1)} kg from ${compoundCode} using calculated weights (${quantity} rolls, no SDN roll weights available)`,
      );
    }
  }

  private async linkedSupplierDeliveryNote(
    deliveryNoteRef: string | null | undefined,
  ): Promise<RubberDeliveryNote | null> {
    if (!deliveryNoteRef) return null;
    const dn = await this.deliveryNoteRepository.findOneWhere({
      deliveryNoteNumber: deliveryNoteRef,
    });
    return dn || null;
  }

  private parseCalendarerRollDescription(text: string): {
    quantity: number;
    curingMethod: string;
    shore: number;
    color: string;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
  } | null {
    const match = text.match(
      /(\d+)\s*rolls?\s*(Steam(?:\s*cure)?|Autoclave|Press|Rotocure)\s*(\d+)\s*(Black|Red|Grey|White|Natural|Yellow|Orange|Green)\s*(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i,
    );
    if (!match) return null;

    return {
      quantity: Number(match[1]),
      curingMethod: match[2],
      shore: Number(match[3]),
      color: match[4],
      thicknessMm: Number(match[5]),
      widthMm: Number(match[6]),
      lengthM: Number(match[7]),
    };
  }

  private compoundCodeFromRollInfo(rollInfo: {
    curingMethod: string;
    shore: number;
    color: string;
  }): string {
    const REVERSE_COLOR: Record<string, string> = {
      red: "R",
      black: "B",
      grey: "G",
      white: "W",
      natural: "N",
      yellow: "Y",
      orange: "O",
      green: "GR",
    };

    const curingLower = rollInfo.curingMethod.toLowerCase().replace(/\s+/g, "");
    const curingCode = curingLower.includes("steam")
      ? "SC"
      : curingLower.includes("autoclave")
        ? "AC"
        : curingLower.includes("press")
          ? "PC"
          : curingLower.includes("rotocure")
            ? "RC"
            : "SC";

    const colorCode =
      REVERSE_COLOR[rollInfo.color.toLowerCase()] || rollInfo.color[0].toUpperCase();
    const shore = String(rollInfo.shore).padStart(2, "0");

    return `AUA${shore}${colorCode}${curingCode}`;
  }

  private async specificGravityForCoding(compoundCodingId: number): Promise<number> {
    const DEFAULT_SG = 1.5;

    const coding = await this.productCodingRepository.findOneById(compoundCodingId);
    if (!coding) return DEFAULT_SG;

    const product = await this.productRepository.findOneByCompoundFirebaseUid(coding.firebaseUid);
    if (product?.specificGravity) {
      return Number(product.specificGravity);
    }
    return DEFAULT_SG;
  }

  private humanReadableCompoundName(code: string): string {
    const COLOR_MAP: Record<string, string> = {
      R: "Red",
      B: "Black",
      G: "Grey",
      W: "White",
      N: "Natural",
      Y: "Yellow",
      O: "Orange",
      GR: "Green",
    };
    const CURING_MAP: Record<string, string> = {
      SC: "Steam Cured",
      AC: "Autoclave Cured",
      PC: "Press Cured",
      RC: "Rotocure",
    };

    const match = code.match(/^AU([A-Z])(\d{2})([A-Z]{1,2})([A-Z]{2})/);
    if (!match) return code;

    const grade = match[1];
    const shore = match[2];
    const colorCode = match[3];
    const curingCode = match[4];

    const color = COLOR_MAP[colorCode] || colorCode;
    const curing = CURING_MAP[curingCode] || curingCode;

    return `SNR ${grade}-Grade ${shore} Shore ${color} ${curing}`;
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
    if (!data?.subtotal || quantityKg <= 0) return null;
    return Math.round((data.subtotal / quantityKg) * 100) / 100;
  }

  async deleteTaxInvoice(id: number): Promise<boolean> {
    return this.taxInvoiceRepository.deleteById(id);
  }

  async updateDocumentPath(id: number, documentPath: string): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;

    invoice.documentPath = documentPath;
    await this.taxInvoiceRepository.save(invoice);
    return this.mapSingleToDto(invoice);
  }

  async linkCalenderRollCoc(id: number, cocId: number | null): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompanyAndOriginal(id);
    if (!invoice) return null;

    if (cocId != null) {
      const coc = await this.supplierCocRepository.findById(cocId);
      if (!coc) {
        throw new BadRequestException("Calender Roll CoC not found");
      }
      if (
        coc.cocType !== SupplierCocType.CALENDER_ROLL &&
        coc.cocType !== SupplierCocType.CALENDARER
      ) {
        throw new BadRequestException("Linked CoC must be a Calender Roll or Calenderer CoC");
      }
    }

    invoice.linkedCalenderRollCocId = cocId;
    await this.taxInvoiceRepository.save(invoice);
    return this.mapSingleToDto(invoice);
  }

  async markExtractionFailed(id: number): Promise<void> {
    await this.taxInvoiceRepository.updatePendingToFailed(id);
  }

  async setExtractedData(
    id: number,
    data: ExtractedTaxInvoiceData,
  ): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;

    invoice.extractedData = data;
    if (data.invoiceNumber) {
      invoice.invoiceNumber = data.invoiceNumber;
    }
    if (data.invoiceDate) {
      invoice.invoiceDate = fromISO(data.invoiceDate).toJSDate();
    }
    if (data.totalAmount != null) {
      invoice.totalAmount = String(data.totalAmount);
    }
    if (data.vatAmount != null) {
      invoice.vatAmount = String(data.vatAmount);
    }
    invoice.status = TaxInvoiceStatus.EXTRACTED;

    if (data.companyName) {
      const targetType = invoice.invoiceType === TaxInvoiceType.CUSTOMER ? "CUSTOMER" : "SUPPLIER";
      const matched = await this.companyRepository.findOneByTrimmedNameAndType(
        data.companyName,
        targetType,
      );
      if (matched && matched.id !== invoice.companyId) {
        this.logger.log(
          `Reassigning tax invoice ${invoice.id} from company ${invoice.companyId} to ${matched.id} (${matched.name}) based on extracted companyName`,
        );
        invoice.companyId = matched.id;
      }
    }

    if (
      data.invoiceNumber &&
      invoice.versionStatus === DocumentVersionStatus.ACTIVE &&
      invoice.version === 1
    ) {
      const existingActive = await this.versioningService.existingActiveTaxInvoice(
        data.invoiceNumber,
        invoice.companyId,
        invoice.invoiceType,
      );
      if (existingActive && existingActive.id !== invoice.id) {
        invoice.version = existingActive.version + 1;
        invoice.previousVersionId = existingActive.id;
        invoice.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
        this.logger.log(
          `Post-extraction duplicate detected: tax invoice ${data.invoiceNumber} matches existing #${existingActive.id} - marking v${invoice.version} pending authorization`,
        );
      }
    }

    if (invoice.isCreditNote) {
      if (data.originalInvoiceRef) {
        const normalizedRef = data.originalInvoiceRef.replace(/[-\s]/g, "");
        const originalInvoice = await this.taxInvoiceRepository.findOneByNormalizedRefAndCompany(
          normalizedRef,
          invoice.companyId,
        );

        if (originalInvoice) {
          invoice.originalInvoiceId = originalInvoice.id;
          this.logger.log(
            `Linked credit note ${invoice.invoiceNumber} to original invoice #${originalInvoice.id} (${originalInvoice.invoiceNumber})`,
          );
        } else {
          this.logger.warn(
            `Could not find original invoice "${data.originalInvoiceRef}" for credit note ${invoice.invoiceNumber}`,
          );
        }
      }

      if (data.rollNumbers && data.rollNumbers.length > 0) {
        invoice.creditNoteRollNumbers = data.rollNumbers;
      }
    }

    await this.taxInvoiceRepository.save(invoice);

    if (invoice.invoiceType === TaxInvoiceType.CUSTOMER && !invoice.isCreditNote) {
      await this.dispatchCustomerRollsToStock(invoice);
    }

    return this.mapSingleToDto(invoice);
  }

  async dispatchCustomerRollsToStock(invoice: RubberTaxInvoice): Promise<void> {
    const data = invoice.extractedData;
    const lineItems = data ? data.lineItems : null;
    if (!lineItems || lineItems.length === 0) return;
    const result = await this.rollStockService.upsertCustomerRollDispatch(
      invoice.id,
      invoice.companyId,
      lineItems.map((li) => ({
        description: li.description,
        compoundCode: li.compoundCode ?? null,
        rolls: li.rolls ?? null,
      })),
    );
    this.logger.log(
      `CTI ${invoice.invoiceNumber}: linked ${result.linked} existing rolls, created ${result.created} placeholder rolls, unlinked ${result.unlinked} orphans${result.skippedNoCompound > 0 ? `, skipped ${result.skippedNoCompound} (no compound coding)` : ""}`,
    );
  }

  async splitTaxInvoiceExtraction(
    parentId: number,
    invoices: ExtractedTaxInvoiceData[],
    sourceBuffer?: Buffer,
  ): Promise<{ taxInvoiceIds: number[] }> {
    const parent = await this.taxInvoiceRepository.findOneByIdWithCompany(parentId);
    if (!parent) {
      throw new BadRequestException("Tax invoice not found");
    }

    if (!invoices || invoices.length === 0) {
      return { taxInvoiceIds: [parentId] };
    }

    const distinct = invoices.reduce((map, inv) => {
      const key = (inv?.invoiceNumber ?? "").trim() || `__unkeyed_${map.size}`;
      if (map.has(key)) return map;
      return new Map(map).set(key, inv);
    }, new Map<string, ExtractedTaxInvoiceData>());

    const ordered = Array.from(distinct.values());

    if (ordered.length <= 1) {
      await this.setExtractedData(parentId, ordered[0]);
      return { taxInvoiceIds: [parentId] };
    }

    const parentInvoiceNumber = (parent.invoiceNumber ?? "").trim();
    const looksLikeRealInvoiceNumber =
      parentInvoiceNumber.length > 0 && !/^SCAN_/i.test(parentInvoiceNumber);
    const matchingForParent = looksLikeRealInvoiceNumber
      ? ordered.find((inv) => (inv.invoiceNumber ?? "").trim() === parentInvoiceNumber)
      : null;
    if (matchingForParent) {
      const slicedPaths = await this.slicePdfPerInvoice(parent, [matchingForParent], sourceBuffer);
      if (slicedPaths[0]) {
        parent.documentPath = slicedPaths[0];
        await this.taxInvoiceRepository.save(parent);
      }
      await this.setExtractedData(parentId, matchingForParent);
      this.logger.log(
        `Re-extract on existing tax invoice ${parentInvoiceNumber} (#${parentId}) — kept own data, sliced PDF to its own page(s), skipped splitting against ${ordered.length - 1} sibling invoice(s) already in the system`,
      );
      return { taxInvoiceIds: [parentId] };
    }

    const perInvoicePaths = await this.slicePdfPerInvoice(parent, ordered, sourceBuffer);

    if (perInvoicePaths[0]) {
      parent.documentPath = perInvoicePaths[0];
      await this.taxInvoiceRepository.save(parent);
    }
    await this.setExtractedData(parentId, ordered[0]);

    const additionalIds = await ordered.slice(1).reduce(
      async (accPromise, invoiceData, idx) => {
        const acc = await accPromise;
        const placeholderNumber =
          invoiceData.invoiceNumber?.trim() || `${parent.invoiceNumber}-${acc.length + 2}`;
        const created = await this.createTaxInvoice(
          {
            invoiceNumber: placeholderNumber,
            invoiceDate: invoiceData.invoiceDate ?? undefined,
            invoiceType: parent.invoiceType,
            companyId: parent.companyId,
            documentPath: perInvoicePaths[idx + 1] ?? parent.documentPath ?? undefined,
            totalAmount: invoiceData.totalAmount ?? undefined,
            vatAmount: invoiceData.vatAmount ?? undefined,
          },
          parent.createdBy ?? undefined,
        );
        await this.setExtractedData(created.id, invoiceData);
        return [...acc, created.id];
      },
      Promise.resolve([] as number[]),
    );

    this.logger.log(
      `Split tax invoice ${parentId} into ${ordered.length} records (parent + ${additionalIds.join(", ")})`,
    );

    return { taxInvoiceIds: [parentId, ...additionalIds] };
  }

  private async slicePdfPerInvoice(
    parent: RubberTaxInvoice,
    invoices: ExtractedTaxInvoiceData[],
    providedBuffer?: Buffer,
  ): Promise<(string | null)[]> {
    const sourcePath = parent.documentPath;
    if (!sourcePath?.toLowerCase().endsWith(".pdf")) {
      return invoices.map(() => null);
    }
    const allHavePages = invoices.every(
      (inv) => Array.isArray(inv.sourcePages) && inv.sourcePages.length > 0,
    );
    if (!allHavePages) {
      this.logger.warn(
        `Tax invoice ${parent.id} split skipped per-invoice PDF slicing — at least one invoice has no sourcePages from extraction`,
      );
      return invoices.map(() => null);
    }

    try {
      const sourceBuffer = providedBuffer ?? (await this.storageService.download(sourcePath));
      const sourcePdf = await PDFDocument.load(sourceBuffer);
      const totalPages = sourcePdf.getPageCount();
      const party: AuRubberPartyType =
        parent.invoiceType === TaxInvoiceType.CUSTOMER ? "customers" : "suppliers";

      return await Promise.all(
        invoices.map(async (inv, idx) => {
          const requestedPages = (inv.sourcePages ?? [])
            .map((p) => Math.round(p))
            .filter((p) => p >= 1 && p <= totalPages)
            .map((p) => p - 1);
          const uniquePages = Array.from(new Set(requestedPages)).sort((a, b) => a - b);
          if (uniquePages.length === 0) {
            return null;
          }
          const sliced = await PDFDocument.create();
          const copied = await sliced.copyPages(sourcePdf, uniquePages);
          copied.forEach((page) => sliced.addPage(page));
          const slicedBytes = await sliced.save();
          const slicedBuffer = Buffer.from(slicedBytes);
          const safeNumber = sanitizeAuRubberDocNumber(inv.invoiceNumber ?? `inv-${idx + 1}`);
          const filename = `${safeNumber}.pdf`;
          const targetPath = auRubberDocumentPath(
            party,
            AuRubberDocumentType.TAX_INVOICE,
            inv.invoiceNumber ?? `inv-${idx + 1}`,
            filename,
          );
          const subdir = targetPath.substring(0, targetPath.lastIndexOf("/"));
          const file: Express.Multer.File = {
            fieldname: "file",
            originalname: filename,
            mimetype: "application/pdf",
            buffer: slicedBuffer,
            size: slicedBuffer.length,
          } as Express.Multer.File;
          const upload = await this.storageService.upload(file, subdir);
          this.logger.log(
            `Sliced ${uniquePages.length} page(s) for tax invoice ${inv.invoiceNumber ?? `(idx ${idx})`} → ${upload.path}`,
          );
          return upload.path;
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to slice PDF for tax invoice ${parent.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return invoices.map(() => null);
    }
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

    const hasMultipleLineItems = data.lineItems && data.lineItems.length > 1;

    if (hasMultipleLineItems) {
      const totalQty = data.lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const productDescription = data.lineItems.map((item) => item.description).join("; ");
      return {
        productDescription,
        numberOfRolls: totalQty > 0 ? totalQty : null,
        unit: "each",
        costPerUnit: null,
      };
    }

    const subtotalExVat = data.subtotal;
    const onlyLineItem = data.lineItems && data.lineItems.length === 1 ? data.lineItems[0] : null;

    const extractedQuantity =
      data.productQuantity ||
      (onlyLineItem && onlyLineItem.quantity != null && onlyLineItem.quantity > 0
        ? onlyLineItem.quantity
        : null);
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

    let costPerUnit: number | null = null;
    if (onlyLineItem && onlyLineItem.unitPrice != null && onlyLineItem.unitPrice > 0) {
      costPerUnit = onlyLineItem.unitPrice;
    } else if (subtotalExVat != null && quantity != null && quantity > 0) {
      costPerUnit = Math.round((subtotalExVat / quantity) * 100) / 100;
    }

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

    if (aiQuantity != null) {
      return { quantity: aiQuantity, unit: aiUnit ? aiUnit.toLowerCase() : "kg" };
    }

    return { quantity: aiQuantity, unit: aiUnit };
  }

  private async processCreditNoteRollRejections(
    invoice: RubberTaxInvoice,
  ): Promise<CreditNoteReturnResult> {
    const empty: CreditNoteReturnResult = {
      rejected: 0,
      deductedKg: 0,
      alreadyShipped: [],
      unmatched: [],
      wrongSupplier: [],
      needsManualKg: [],
    };

    // Only a physical return removes rolls from stock. A financial-only credit
    // (price adjustment / rebate / short delivery), or one not yet classified,
    // never touches stock or allocations.
    if (invoice.creditNoteType !== CreditNoteType.PHYSICAL_RETURN) {
      this.logger.log(
        `Credit note ${invoice.invoiceNumber}: creditNoteType=${invoice.creditNoteType ?? "unclassified"} — no stock effect (only a PHYSICAL_RETURN removes rolls)`,
      );
      return empty;
    }

    const rollNumbers = invoice.creditNoteRollNumbers;
    if (!rollNumbers || rollNumbers.length === 0) {
      this.logger.log(`Credit note ${invoice.invoiceNumber} has no roll numbers to return`);
      return empty;
    }

    // Idempotency: re-approving must not deduct kg twice.
    const alreadyDeducted = await this.rubberStockService.movementExistsForReference(
      CompoundMovementReferenceType.CREDIT_NOTE_RETURN,
      invoice.id,
    );

    const rolls = await this.rollStockRepository.findManyByRollNumbers(rollNumbers);

    // Resolve each matched roll's source supplier (the company on the supplier
    // tax invoice it was received against) so we can reject only rolls that AU
    // actually got from THIS supplier. A roll number from OCR can collide with an
    // unrelated roll from another supplier; rejecting that would corrupt the
    // wrong stock, so any positive cross-supplier mismatch is skipped.
    const sourceInvoiceIds = Array.from(
      new Set(rolls.map((r) => r.supplierTaxInvoiceId).filter((idv): idv is number => idv != null)),
    );
    const supplierByInvoiceId = new Map<number, number>();
    if (sourceInvoiceIds.length > 0) {
      const sourceInvoices =
        await this.taxInvoiceRepository.findManyByIdsWithCompany(sourceInvoiceIds);
      for (const si of sourceInvoices) {
        supplierByInvoiceId.set(si.id, si.companyId);
      }
    }

    const tallied = await rolls.reduce<Promise<CreditNoteReturnResult>>(
      async (prevPromise, roll) => {
        const acc = await prevPromise;

        // Skip a roll whose KNOWN source supplier differs from this credit note's
        // supplier — almost certainly an OCR mis-read onto an unrelated roll.
        // Rolls with no traceable source (e.g. opening stock) are left alone.
        const rollSupplierId =
          roll.supplierTaxInvoiceId != null
            ? supplierByInvoiceId.get(roll.supplierTaxInvoiceId)
            : undefined;
        if (rollSupplierId != null && rollSupplierId !== invoice.companyId) {
          this.logger.warn(
            `Credit note ${invoice.invoiceNumber}: roll ${roll.rollNumber} belongs to supplier #${rollSupplierId}, not this credit note's supplier #${invoice.companyId} — skipped (likely OCR mis-read)`,
          );
          return { ...acc, wrongSupplier: [...acc.wrongSupplier, roll.rollNumber] };
        }

        // A roll already certified AND shipped to a customer (on an AU CoC + a
        // customer delivery note) is FLAGGED, never silently un-allocated — its
        // certificate is already with the customer. Returning it requires a
        // customer credit note to bring the books straight.
        const isAlreadyShipped = roll.auCocId != null && roll.customerDeliveryNoteId != null;
        const alreadyShipped = isAlreadyShipped
          ? [
              ...acc.alreadyShipped,
              {
                rollNumber: roll.rollNumber,
                auCocId: roll.auCocId as number,
                customerDeliveryNoteId: roll.customerDeliveryNoteId as number,
              },
            ]
          : acc.alreadyShipped;

        const wasRejected = roll.status === RollStockStatus.REJECTED;
        if (!wasRejected) {
          roll.status = RollStockStatus.REJECTED;
          await this.rollStockRepository.save(roll);
          this.logger.log(
            `Returned roll ${roll.rollNumber} (id=${roll.id}) via credit note ${invoice.invoiceNumber}`,
          );
        }

        const weightKg = roll.weightKg ?? 0;
        const weightSane = weightKg > 0 && weightKg <= MAX_RETURN_ROLL_WEIGHT_KG;
        const canDeduct = !alreadyDeducted && roll.compoundCodingId != null && weightSane;
        let needsManualKg = acc.needsManualKg;
        if (canDeduct) {
          await this.rubberStockService.deductCompoundStockByCoding(
            roll.compoundCodingId as number,
            weightKg,
            CompoundMovementReferenceType.CREDIT_NOTE_RETURN,
            invoice.id,
            `Credit note ${invoice.invoiceNumber} return (roll ${roll.rollNumber}, ${weightKg.toFixed(1)} kg)`,
          );
        } else if (!alreadyDeducted && roll.compoundCodingId == null) {
          needsManualKg = [...needsManualKg, roll.rollNumber];
          this.logger.warn(
            `Credit note ${invoice.invoiceNumber}: roll ${roll.rollNumber} has no compound coding — kg not deducted, manual stock adjustment needed`,
          );
        } else if (!alreadyDeducted && roll.compoundCodingId != null && !weightSane) {
          needsManualKg = [...needsManualKg, roll.rollNumber];
          this.logger.warn(
            `Credit note ${invoice.invoiceNumber}: roll ${roll.rollNumber} has an implausible weight (${weightKg} kg) — kg not deducted, manual stock adjustment needed`,
          );
        }

        return {
          rejected: acc.rejected + (wasRejected ? 0 : 1),
          deductedKg: acc.deductedKg + (canDeduct ? weightKg : 0),
          alreadyShipped,
          unmatched: acc.unmatched,
          wrongSupplier: acc.wrongSupplier,
          needsManualKg,
        };
      },
      Promise.resolve(empty),
    );

    const unmatched = rollNumbers.filter((rn) => !rolls.some((r) => r.rollNumber === rn));
    const result: CreditNoteReturnResult = { ...tallied, unmatched };

    if (result.wrongSupplier.length > 0) {
      this.logger.warn(
        `Credit note ${invoice.invoiceNumber}: ${result.wrongSupplier.length} roll(s) skipped — they belong to a different supplier (likely OCR mis-read): ${result.wrongSupplier.join(", ")}`,
      );
    }

    if (result.alreadyShipped.length > 0) {
      this.logger.warn(
        `Credit note ${invoice.invoiceNumber}: ${result.alreadyShipped.length} returned roll(s) were ALREADY shipped to a customer — a customer credit note is required: ${result.alreadyShipped
          .map((s) => `${s.rollNumber}→AU CoC ${s.auCocId}`)
          .join(", ")}`,
      );
    }
    if (unmatched.length > 0) {
      this.logger.warn(
        `Credit note ${invoice.invoiceNumber}: rolls not found in stock: ${unmatched.join(", ")}`,
      );
    }
    this.logger.log(
      `Credit note ${invoice.invoiceNumber}: returned ${result.rejected} roll(s), deducted ${result.deductedKg.toFixed(1)} kg, ${result.alreadyShipped.length} already-shipped, ${unmatched.length} unmatched, ${result.wrongSupplier.length} wrong-supplier`,
    );
    return result;
  }

  // A returned roll that was already certified + shipped to a customer needs a
  // customer credit note to balance the books. Default behaviour is prompt-only
  // (the UI surfaces the rejected-but-still-allocated rolls); flipping
  // AU_RUBBER_AUTO_CREATE_CUSTOMER_CREDIT=true switches on auto-drafting, which
  // a human still approves before it is issued.
  private async flagCustomerCreditNeeded(
    invoice: RubberTaxInvoice,
    result: CreditNoteReturnResult,
  ): Promise<void> {
    // Always record the shipped rolls on the invoice so the UI can prompt the
    // user to raise the customer credit note (manual path).
    invoice.customerCreditNeeded = result.alreadyShipped.map((s) => ({
      rollNumber: s.rollNumber,
      auCocId: s.auCocId,
      customerDeliveryNoteId: s.customerDeliveryNoteId,
    }));
    await this.taxInvoiceRepository.save(invoice);

    const autoCreate = process.env.AU_RUBBER_AUTO_CREATE_CUSTOMER_CREDIT === "true";
    if (!autoCreate) {
      this.logger.log(
        `Credit note ${invoice.invoiceNumber}: ${result.alreadyShipped.length} shipped roll(s) need a customer credit note — prompting in the UI (auto-create off)`,
      );
      return;
    }

    // Auto-create path (env-gated): raise the draft customer credit notes now and
    // clear the prompt, since they no longer need a manual trigger. Warn loudly —
    // this issues financial documents without an explicit per-event human click,
    // so it must be visible in the logs whenever it fires.
    this.logger.warn(
      `Credit note ${invoice.invoiceNumber}: AU_RUBBER_AUTO_CREATE_CUSTOMER_CREDIT is ON — auto-drafting customer credit note(s) for ${result.alreadyShipped.length} shipped roll(s) without an explicit operator action`,
    );
    await this.autoCreateCustomerCreditDrafts(invoice, result);
    invoice.customerCreditNeeded = [];
    await this.taxInvoiceRepository.save(invoice);
  }

  // Manual trigger for the UI "Create customer credit note(s)" prompt: raises a
  // draft customer credit note per affected AU CoC from the rolls recorded on
  // this supplier credit note, then clears the prompt. Reuses the same drafting
  // logic as the env-gated auto-create path.
  async createCustomerCreditNotesForReturn(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    if (!invoice) return null;
    const pending =
      (invoice.customerCreditNeeded as
        | { rollNumber: string; auCocId: number; customerDeliveryNoteId: number }[]
        | undefined) ?? [];
    if (pending.length === 0) {
      throw new BadRequestException("No shipped rolls awaiting a customer credit note");
    }
    // Claim the work before drafting: clear the pending list and persist first so
    // a concurrent/double-clicked call sees an empty list and is rejected, rather
    // than both calls drafting a duplicate customer credit note per CoC.
    invoice.customerCreditNeeded = [];
    await this.taxInvoiceRepository.save(invoice);
    await this.autoCreateCustomerCreditDrafts(invoice, {
      rejected: 0,
      deductedKg: 0,
      alreadyShipped: pending,
      unmatched: [],
      wrongSupplier: [],
      needsManualKg: [],
    });
    const result = await this.taxInvoiceRepository.findOneByIdWithCompany(id);
    return this.mapSingleToDto(result!);
  }

  private async autoCreateCustomerCreditDrafts(
    invoice: RubberTaxInvoice,
    result: CreditNoteReturnResult,
  ): Promise<void> {
    // One draft customer credit note per affected AU CoC's customer; amounts are
    // left null for a human to set from AU's own sale value (never the supplier
    // credit value).
    const rollsByCoc = result.alreadyShipped.reduce<Record<number, string[]>>(
      (acc, shipped) => ({
        ...acc,
        [shipped.auCocId]: [...(acc[shipped.auCocId] ?? []), shipped.rollNumber],
      }),
      {},
    );

    await Object.entries(rollsByCoc).reduce<Promise<void>>(
      async (prev, [cocIdStr, rollNumbers]) => {
        await prev;
        const auCoc = await this.auCocRepository.findById(Number(cocIdStr));
        if (!auCoc?.customerCompanyId) {
          this.logger.warn(
            `Credit note ${invoice.invoiceNumber}: cannot auto-draft customer credit for AU CoC ${cocIdStr} — no customer on the CoC`,
          );
          return;
        }

        const draft = this.taxInvoiceRepository.build({
          firebaseUid: `pg_${generateUniqueId()}`,
          invoiceNumber: `CCN-${auCoc.cocNumber}`,
          invoiceDate: now().toJSDate(),
          invoiceType: TaxInvoiceType.CUSTOMER,
          companyId: auCoc.customerCompanyId,
          documentPath: null,
          status: TaxInvoiceStatus.PENDING,
          totalAmount: null,
          vatAmount: null,
          createdBy: `auto: return on supplier credit #${invoice.id} (${invoice.invoiceNumber})`,
          version: 1,
          previousVersionId: null,
          versionStatus: DocumentVersionStatus.ACTIVE,
          isCreditNote: true,
          creditNoteType: CreditNoteType.PHYSICAL_RETURN,
          creditNoteRollNumbers: rollNumbers,
        });
        await this.taxInvoiceRepository.create(draft);
        this.logger.log(
          `Auto-drafted customer credit note CCN-${auCoc.cocNumber} for customer ${auCoc.customerCompanyId} (${rollNumbers.length} roll(s)) from supplier credit ${invoice.invoiceNumber}`,
        );
      },
      Promise.resolve(),
    );
  }

  private async mapManyToDto(invoices: RubberTaxInvoice[]): Promise<RubberTaxInvoiceDto[]> {
    const cocIds = Array.from(
      new Set(
        invoices.map((inv) => inv.linkedCalenderRollCocId).filter((id): id is number => id != null),
      ),
    );
    const cocNumberById = new Map<number, string | null>();
    if (cocIds.length > 0) {
      const cocs = await this.supplierCocRepository.findIdAndCocNumberByIds(cocIds);
      for (const coc of cocs) {
        cocNumberById.set(coc.id, coc.cocNumber);
      }
    }

    // customerCreditNeeded references AU CoC ids (a different id space from the
    // supplier CoCs above), so resolve their numbers from the AU CoC repository
    // into a separate map — mixing the two id spaces would risk a wrong label.
    const auCocIds = Array.from(
      new Set(
        invoices.flatMap(
          (inv) =>
            (inv.customerCreditNeeded as { auCocId: number }[] | undefined)?.map(
              (r) => r.auCocId,
            ) ?? [],
        ),
      ),
    );
    const auCocNumberById = new Map<number, string | null>();
    if (auCocIds.length > 0) {
      const auCocs = await this.auCocRepository.findByIdsOrderedById(auCocIds);
      for (const coc of auCocs) {
        auCocNumberById.set(coc.id, coc.cocNumber);
      }
    }

    return invoices.map((inv) => this.mapToDto(inv, cocNumberById, auCocNumberById));
  }

  private async mapSingleToDto(invoice: RubberTaxInvoice): Promise<RubberTaxInvoiceDto> {
    const [dto] = await this.mapManyToDto([invoice]);
    return dto;
  }

  private mapToDto(
    invoice: RubberTaxInvoice,
    cocNumberById?: Map<number, string | null>,
    auCocNumberById?: Map<number, string | null>,
  ): RubberTaxInvoiceDto {
    const productSummary = this.extractProductSummary(invoice.extractedData);
    const linkedCalenderRollCocId = invoice.linkedCalenderRollCocId ?? null;
    const linkedCalenderRollCocNumber =
      linkedCalenderRollCocId != null
        ? (cocNumberById?.get(linkedCalenderRollCocId) ?? null)
        : null;

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
      version: invoice.version,
      versionStatus: invoice.versionStatus,
      versionStatusLabel: DOCUMENT_VERSION_STATUS_LABELS[invoice.versionStatus],
      previousVersionId: invoice.previousVersionId,
      isCreditNote: invoice.isCreditNote ?? false,
      creditNoteType: (invoice.creditNoteType as CreditNoteType | null) ?? null,
      originalInvoiceId: invoice.originalInvoiceId ?? null,
      originalInvoiceNumber: invoice.originalInvoice?.invoiceNumber ?? null,
      creditNoteRollNumbers: invoice.creditNoteRollNumbers ?? [],
      customerCreditNeeded: (
        (invoice.customerCreditNeeded as { rollNumber: string; auCocId: number }[] | undefined) ??
        []
      ).map((r) => ({
        rollNumber: r.rollNumber,
        auCocId: r.auCocId,
        auCocNumber: auCocNumberById?.get(r.auCocId) ?? null,
      })),
      returnExceptions:
        (invoice.returnExceptions as { rollNumber: string; reason: string }[] | undefined) ?? [],
      linkedCalenderRollCocId,
      linkedCalenderRollCocNumber,
    };
  }

  async correctionHintsForSupplier(supplierName: string | null): Promise<string | null> {
    if (!supplierName) return null;

    const recentCorrections = await this.correctionRepository.findRecentBySupplierName(
      supplierName,
      30,
    );

    if (recentCorrections.length === 0) return null;

    const hints = recentCorrections.map(
      (c) =>
        `- Field "${c.fieldName}" was corrected from "${c.originalValue}" to "${c.correctedValue}"`,
    );

    return `PREVIOUS CORRECTIONS FOR THIS SUPPLIER (learn from these patterns):\n${hints.join("\n")}\n\nApply these patterns to new invoices from the same supplier. For example, if orderNumber was consistently corrected from a long reference to a short number, extract the short number from the header table.`;
  }
}
