import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { formatISODate, fromISO, generateUniqueId } from "../lib/datetime";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { RubberCompany } from "./entities/rubber-company.entity";
import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import {
  ExtractedTaxInvoiceData,
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";
import { RubberTaxInvoiceCorrection } from "./entities/rubber-tax-invoice-correction.entity";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";
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
  version: number;
  versionStatus: DocumentVersionStatus;
  versionStatusLabel: string;
  previousVersionId: number | null;
  isCreditNote: boolean;
  originalInvoiceId: number | null;
  originalInvoiceNumber: string | null;
  creditNoteRollNumbers: string[];
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
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    @InjectRepository(RubberDeliveryNote)
    private deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberRollStock)
    private rollStockRepository: Repository<RubberRollStock>,
    private rubberStockService: RubberStockService,
    private versioningService: RubberDocumentVersioningService,
  ) {}

  async allTaxInvoices(filters?: {
    invoiceType?: TaxInvoiceType;
    status?: TaxInvoiceStatus;
    companyId?: number;
    includeAllVersions?: boolean;
    isCreditNote?: boolean;
  }): Promise<RubberTaxInvoiceDto[]> {
    const query = this.taxInvoiceRepository
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

    const invoices = await query.getMany();
    return invoices.map((inv) => this.mapToDto(inv));
  }

  async taxInvoiceById(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company", "originalInvoice"],
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

    const existingActive = dto.invoiceNumber
      ? await this.versioningService.existingActiveTaxInvoice(
          dto.invoiceNumber,
          dto.companyId,
          dto.invoiceType,
        )
      : null;

    const isDuplicate = existingActive !== null;

    const invoice = this.taxInvoiceRepository.create({
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
    });

    if (isDuplicate) {
      this.logger.log(
        `Duplicate tax invoice detected: ${dto.invoiceNumber} for company ${dto.companyId} - creating v${invoice.version} pending authorization`,
      );
    }

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

    if (invoice.versionStatus === DocumentVersionStatus.PENDING_AUTHORIZATION) {
      throw new BadRequestException(
        "This document version is awaiting authorization and cannot be approved",
      );
    }

    if (invoice.status === TaxInvoiceStatus.APPROVED) {
      return this.mapToDto(invoice);
    }

    invoice.status = TaxInvoiceStatus.APPROVED;
    await this.taxInvoiceRepository.save(invoice);

    if (invoice.isCreditNote) {
      await this.processCreditNoteRollRejections(invoice);
    } else if (invoice.invoiceType === TaxInvoiceType.SUPPLIER) {
      const isCalendarer = await this.isCalendarerCompany(invoice.companyId);
      if (isCalendarer) {
        await this.processCalendarerRollDeduction(invoice);
      } else {
        await this.processCompoundStockIn(invoice);
      }
    }

    const result = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    return this.mapToDto(result!);
  }

  async reprocessCompoundStock(id: number): Promise<RubberTaxInvoiceDto | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!invoice) return null;
    if (invoice.status !== TaxInvoiceStatus.APPROVED) return this.mapToDto(invoice);
    if (invoice.invoiceType !== TaxInvoiceType.SUPPLIER) return this.mapToDto(invoice);

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
    const existing = await this.productCodingRepository.findOne({
      where: { code, codingType: ProductCodingType.COMPOUND },
    });
    if (existing) return existing;

    const humanName = this.humanReadableCompoundName(code);
    const newCoding = this.productCodingRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      code,
      name: humanName,
      codingType: ProductCodingType.COMPOUND,
    });
    const saved = await this.productCodingRepository.save(newCoding);
    this.logger.log(
      `Tax invoice ${invoiceNumber}: auto-created compound coding ${code} (${humanName})`,
    );
    return saved;
  }

  private async isCalendarerCompany(companyId: number): Promise<boolean> {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) return false;
    return company.name?.toLowerCase().includes("impilo") || false;
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
    const dn = await this.deliveryNoteRepository.findOne({
      where: { deliveryNoteNumber: deliveryNoteRef },
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

    const coding = await this.productCodingRepository.findOne({
      where: { id: compoundCodingId },
    });
    if (!coding) return DEFAULT_SG;

    const product = await this.productRepository.findOne({
      where: { compoundFirebaseUid: coding.firebaseUid },
    });
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
      invoice.invoiceDate = fromISO(data.invoiceDate).toJSDate();
    }
    if (data.totalAmount != null) {
      invoice.totalAmount = String(data.totalAmount);
    }
    if (data.vatAmount != null) {
      invoice.vatAmount = String(data.vatAmount);
    }
    invoice.status = TaxInvoiceStatus.EXTRACTED;

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
        const originalInvoice = await this.taxInvoiceRepository
          .createQueryBuilder("ti")
          .where("REPLACE(REPLACE(ti.invoice_number, '-', ''), ' ', '') = :ref", {
            ref: normalizedRef,
          })
          .andWhere("ti.company_id = :companyId", { companyId: invoice.companyId })
          .andWhere("ti.is_credit_note = false")
          .getOne();

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

  private async processCreditNoteRollRejections(invoice: RubberTaxInvoice): Promise<void> {
    const rollNumbers = invoice.creditNoteRollNumbers;
    if (!rollNumbers || rollNumbers.length === 0) {
      this.logger.log(`Credit note ${invoice.invoiceNumber} has no roll numbers to reject`);
      return;
    }

    const rolls = await this.rollStockRepository.find({
      where: { rollNumber: In(rollNumbers) },
    });

    const rejectedCount = await rolls.reduce(async (prevPromise, roll) => {
      const count = await prevPromise;
      if (roll.status === RollStockStatus.REJECTED) {
        this.logger.log(`Roll ${roll.rollNumber} already rejected, skipping`);
        return count;
      }
      roll.status = RollStockStatus.REJECTED;
      await this.rollStockRepository.save(roll);
      this.logger.log(
        `Rejected roll ${roll.rollNumber} (id=${roll.id}) via credit note ${invoice.invoiceNumber}`,
      );
      return count + 1;
    }, Promise.resolve(0));

    const unmatched = rollNumbers.filter((rn) => !rolls.some((r) => r.rollNumber === rn));
    if (unmatched.length > 0) {
      this.logger.warn(
        `Credit note ${invoice.invoiceNumber}: could not find rolls in stock: ${unmatched.join(", ")}`,
      );
    }

    this.logger.log(
      `Credit note ${invoice.invoiceNumber}: rejected ${rejectedCount} roll(s), ${unmatched.length} not found in stock`,
    );
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
      version: invoice.version,
      versionStatus: invoice.versionStatus,
      versionStatusLabel: DOCUMENT_VERSION_STATUS_LABELS[invoice.versionStatus],
      previousVersionId: invoice.previousVersionId,
      isCreditNote: invoice.isCreditNote ?? false,
      originalInvoiceId: invoice.originalInvoiceId ?? null,
      originalInvoiceNumber: invoice.originalInvoice?.invoiceNumber ?? null,
      creditNoteRollNumbers: invoice.creditNoteRollNumbers ?? [],
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
