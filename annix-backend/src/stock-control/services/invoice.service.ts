import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { fromISO, fromJSDate } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { InvoiceClarification } from "../entities/invoice-clarification.entity";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";
import { InvoiceExtractionService } from "./invoice-extraction.service";

export interface CreateInvoiceDto {
  deliveryNoteId?: number | null;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate?: string;
}

export interface SuggestedDeliveryNote {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  receivedDate: string | null;
  matchReason: string;
}

export interface PriceChangeItem {
  id: number;
  stockItemName: string;
  quantity: number;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  needsApproval: boolean;
}

export interface PriceChangeSummary {
  items: PriceChangeItem[];
  totalOldValue: number;
  totalNewValue: number;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(SupplierInvoiceItem)
    private readonly invoiceItemRepo: Repository<SupplierInvoiceItem>,
    @InjectRepository(InvoiceClarification)
    private readonly clarificationRepo: Repository<InvoiceClarification>,
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly extractionService: InvoiceExtractionService,
    private readonly auditService: AuditService,
  ) {}

  async create(companyId: number, dto: CreateInvoiceDto): Promise<SupplierInvoice> {
    let supplierName = dto.supplierName;

    if (dto.deliveryNoteId) {
      const deliveryNote = await this.deliveryNoteRepo.findOne({
        where: { id: dto.deliveryNoteId, companyId },
      });

      if (!deliveryNote) {
        throw new NotFoundException(`Delivery note ${dto.deliveryNoteId} not found`);
      }

      supplierName = dto.supplierName || deliveryNote.supplierName;
    }

    const invoice = this.invoiceRepo.create({
      companyId,
      deliveryNoteId: dto.deliveryNoteId || null,
      invoiceNumber: dto.invoiceNumber,
      supplierName,
      invoiceDate: dto.invoiceDate ? fromISO(dto.invoiceDate).toJSDate() : null,
      extractionStatus: InvoiceExtractionStatus.PENDING,
    });

    return this.invoiceRepo.save(invoice);
  }

  async findAll(companyId: number, page: number = 1, limit: number = 50): Promise<SupplierInvoice[]> {
    const invoices = await this.invoiceRepo.find({
      where: { companyId },
      relations: ["deliveryNote"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return Promise.all(invoices.map((inv) => this.resolveScanUrl(inv)));
  }

  async findById(companyId: number, id: number): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ["deliveryNote", "items", "items.stockItem", "clarifications"],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return this.resolveScanUrl(invoice);
  }

  async reExtract(companyId: number, invoiceId: number): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (!invoice.scanUrl) {
      throw new NotFoundException("No scan uploaded for this invoice");
    }

    const s3Key = this.extractS3Key(invoice.scanUrl);
    const fileBuffer = await this.storageService.download(s3Key);
    const imageBase64 = fileBuffer.toString("base64");
    const mediaType = this.mimeFromPath(s3Key);

    this.auditService.log({
      entityType: "supplier_invoice",
      entityId: invoiceId,
      action: AuditAction.UPDATE,
      newValues: { reExtracted: true },
    }).catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return this.extractionService.extractFromImage(invoiceId, imageBase64, mediaType);
  }

  private extractS3Key(scanUrl: string): string {
    if (!scanUrl.startsWith("http")) {
      return scanUrl;
    }
    const pathMatch = scanUrl.match(/\.com\/(.+?)(\?|$)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return scanUrl;
  }

  private mimeFromPath(
    path: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
    const ext = path.split(".").pop()?.toLowerCase();
    const mimeMap: Record<
      string,
      "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf"
    > = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
    };
    return mimeMap[ext || ""] || "image/jpeg";
  }

  private async resolveScanUrl(invoice: SupplierInvoice): Promise<SupplierInvoice> {
    if (invoice.scanUrl && !invoice.scanUrl.startsWith("http")) {
      invoice.scanUrl = await this.storageService.getPresignedUrl(invoice.scanUrl, 3600);
    } else if (invoice.scanUrl?.includes("X-Amz-Expires")) {
      const pathMatch = invoice.scanUrl.match(/\.com\/(.+?)\?/);
      if (pathMatch) {
        const s3Key = decodeURIComponent(pathMatch[1]);
        invoice.scanUrl = await this.storageService.getPresignedUrl(s3Key, 3600);
      }
    }
    return invoice;
  }

  async uploadScan(
    companyId: number,
    invoiceId: number,
    file: Express.Multer.File,
  ): Promise<SupplierInvoice> {
    const invoice = await this.findById(companyId, invoiceId);

    const uploadResult = await this.storageService.upload(file, "stock-control/invoices");
    invoice.scanUrl = uploadResult.path;
    await this.invoiceRepo.save(invoice);

    const imageBase64 = file.buffer.toString("base64");
    const mediaType = this.mimeToMediaType(file.mimetype);

    return this.extractionService.extractFromImage(invoiceId, imageBase64, mediaType);
  }

  private mimeToMediaType(
    mime: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
    const mimeMap: Record<
      string,
      "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf"
    > = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };
    return mimeMap[mime] || "image/jpeg";
  }

  async pendingClarifications(
    companyId: number,
    invoiceId: number,
  ): Promise<InvoiceClarification[]> {
    await this.findById(companyId, invoiceId);
    return this.extractionService.pendingClarifications(invoiceId);
  }

  async submitClarification(
    companyId: number,
    invoiceId: number,
    clarificationId: number,
    response: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
    userId: number,
  ): Promise<InvoiceClarification> {
    await this.findById(companyId, invoiceId);
    return this.extractionService.processClarificationResponse(clarificationId, response, userId);
  }

  async skipClarification(
    companyId: number,
    invoiceId: number,
    clarificationId: number,
    userId: number,
  ): Promise<InvoiceClarification> {
    await this.findById(companyId, invoiceId);
    return this.extractionService.skipClarification(clarificationId, userId);
  }

  async approve(companyId: number, invoiceId: number, userId: number): Promise<SupplierInvoice> {
    await this.findById(companyId, invoiceId);
    const result = await this.extractionService.applyPriceUpdates(invoiceId, userId);

    this.auditService.log({
      entityType: "supplier_invoice",
      entityId: invoiceId,
      action: AuditAction.APPROVE,
      newValues: { approvedByUserId: userId, extractionStatus: result.extractionStatus },
    }).catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return result;
  }

  async priceChangeSummary(companyId: number, invoiceId: number): Promise<PriceChangeSummary> {
    const invoice = await this.findById(companyId, invoiceId);

    const items: PriceChangeItem[] = invoice.items
      .filter((item) => item.stockItemId && item.stockItem && item.quantity > 0)
      .map((item) => {
        const oldPrice = item.previousPrice || Number(item.stockItem?.costPerUnit) || 0;
        const newPrice = Number(item.unitPrice) || 0;
        const qty = Number(item.quantity) || 0;
        const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

        return {
          id: item.id,
          stockItemName: item.stockItem?.name || item.extractedDescription || "",
          quantity: qty,
          oldPrice,
          newPrice,
          changePercent,
          needsApproval: Math.abs(changePercent) > 20,
        };
      });

    const totalOldValue = items.reduce((sum, item) => sum + item.oldPrice * item.quantity, 0);
    const totalNewValue = items.reduce((sum, item) => sum + item.newPrice * item.quantity, 0);

    return { items, totalOldValue, totalNewValue };
  }

  async remove(companyId: number, id: number): Promise<void> {
    const invoice = await this.findById(companyId, id);
    await this.invoiceRepo.remove(invoice);
  }

  async reExtractAllFailed(companyId: number): Promise<{ triggered: number; failed: string[] }> {
    const failedInvoices = await this.invoiceRepo.find({
      where: { companyId, extractionStatus: InvoiceExtractionStatus.FAILED },
    });

    const results = await Promise.allSettled(
      failedInvoices
        .filter((inv) => inv.scanUrl)
        .map(async (inv) => {
          const s3Key = this.extractS3Key(inv.scanUrl!);
          const fileBuffer = await this.storageService.download(s3Key);
          const imageBase64 = fileBuffer.toString("base64");
          const mediaType = this.mimeFromPath(s3Key);
          await this.extractionService.extractFromImage(inv.id, imageBase64, mediaType);
          return inv.invoiceNumber;
        }),
    );

    const triggered = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason?.message || r.reason));

    return { triggered, failed };
  }

  async findUnlinked(companyId: number): Promise<SupplierInvoice[]> {
    return this.invoiceRepo.find({
      where: { companyId, deliveryNoteId: IsNull() },
      order: { createdAt: "DESC" },
    });
  }

  async linkToDeliveryNote(
    companyId: number,
    invoiceId: number,
    deliveryNoteId: number,
  ): Promise<SupplierInvoice> {
    const invoice = await this.findById(companyId, invoiceId);

    const deliveryNote = await this.deliveryNoteRepo.findOne({
      where: { id: deliveryNoteId, companyId },
    });

    if (!deliveryNote) {
      throw new NotFoundException(`Delivery note ${deliveryNoteId} not found`);
    }

    const oldDeliveryNoteId = invoice.deliveryNoteId;
    invoice.deliveryNoteId = deliveryNoteId;
    invoice.deliveryNote = deliveryNote;
    const saved = await this.invoiceRepo.save(invoice);

    this.auditService.log({
      entityType: "supplier_invoice",
      entityId: invoiceId,
      action: AuditAction.UPDATE,
      oldValues: { deliveryNoteId: oldDeliveryNoteId },
      newValues: { deliveryNoteId },
    }).catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return saved;
  }

  async autoLinkAllUnlinked(companyId: number): Promise<{ linked: number; details: string[] }> {
    return this.extractionService.autoLinkAllUnlinked(companyId);
  }

  async suggestDeliveryNoteMatches(
    companyId: number,
    invoiceId: number,
  ): Promise<SuggestedDeliveryNote[]> {
    const invoice = await this.findById(companyId, invoiceId);

    const deliveryNotes = await this.deliveryNoteRepo.find({
      where: { companyId },
      order: { receivedDate: "DESC" },
    });

    const suggestions: SuggestedDeliveryNote[] = [];

    const supplierMatches = deliveryNotes.filter(
      (dn) => dn.supplierName.toLowerCase() === invoice.supplierName.toLowerCase(),
    );
    supplierMatches.forEach((dn) => {
      suggestions.push({
        id: dn.id,
        deliveryNumber: dn.deliveryNumber,
        supplierName: dn.supplierName,
        receivedDate: dn.receivedDate ? dn.receivedDate.toISOString() : null,
        matchReason: "Supplier name matches",
      });
    });

    if (invoice.invoiceDate) {
      const invoiceDate = fromJSDate(invoice.invoiceDate);
      const dateMatches = deliveryNotes.filter((dn) => {
        if (!dn.receivedDate) return false;
        const alreadySuggested = suggestions.some((s) => s.id === dn.id);
        if (alreadySuggested) return false;

        const daysDiff = Math.abs(invoiceDate.diff(fromJSDate(dn.receivedDate), "days").days);
        return daysDiff <= 14;
      });

      dateMatches.forEach((dn) => {
        suggestions.push({
          id: dn.id,
          deliveryNumber: dn.deliveryNumber,
          supplierName: dn.supplierName,
          receivedDate: dn.receivedDate ? dn.receivedDate.toISOString() : null,
          matchReason: "Received within 14 days of invoice date",
        });
      });
    }

    return suggestions.slice(0, 10);
  }
}
