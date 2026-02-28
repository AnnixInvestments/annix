import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { InvoiceClarification } from "../entities/invoice-clarification.entity";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";
import { InvoiceExtractionService } from "./invoice-extraction.service";

export interface CreateInvoiceDto {
  deliveryNoteId: number;
  invoiceNumber: string;
  supplierName?: string;
  invoiceDate?: string;
}

export interface PriceChangeItem {
  id: number;
  stockItemName: string;
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
  ) {}

  async create(companyId: number, dto: CreateInvoiceDto): Promise<SupplierInvoice> {
    const deliveryNote = await this.deliveryNoteRepo.findOne({
      where: { id: dto.deliveryNoteId, companyId },
    });

    if (!deliveryNote) {
      throw new NotFoundException(`Delivery note ${dto.deliveryNoteId} not found`);
    }

    const invoice = this.invoiceRepo.create({
      companyId,
      deliveryNoteId: dto.deliveryNoteId,
      invoiceNumber: dto.invoiceNumber,
      supplierName: dto.supplierName || deliveryNote.supplierName,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
      extractionStatus: InvoiceExtractionStatus.PENDING,
    });

    return this.invoiceRepo.save(invoice);
  }

  async findAll(companyId: number): Promise<SupplierInvoice[]> {
    return this.invoiceRepo.find({
      where: { companyId },
      relations: ["deliveryNote"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, companyId },
      relations: ["deliveryNote", "items", "items.stockItem", "clarifications"],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
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
    invoice.scanUrl = uploadResult.url;
    await this.invoiceRepo.save(invoice);

    const imageBase64 = file.buffer.toString("base64");
    const mediaType = this.mimeToMediaType(file.mimetype);

    return this.extractionService.extractFromImage(invoiceId, imageBase64, mediaType);
  }

  private mimeToMediaType(mime: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    const mimeMap: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
    };
    return mimeMap[mime] || "image/jpeg";
  }

  async pendingClarifications(companyId: number, invoiceId: number): Promise<InvoiceClarification[]> {
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
    return this.extractionService.applyPriceUpdates(invoiceId, userId);
  }

  async priceChangeSummary(companyId: number, invoiceId: number): Promise<PriceChangeSummary> {
    const invoice = await this.findById(companyId, invoiceId);

    const items: PriceChangeItem[] = invoice.items
      .filter((item) => item.stockItemId && item.stockItem)
      .map((item) => {
        const oldPrice = item.previousPrice || Number(item.stockItem?.costPerUnit) || 0;
        const newPrice = Number(item.unitPrice) || 0;
        const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

        return {
          id: item.id,
          stockItemName: item.stockItem?.name || item.extractedDescription || "",
          oldPrice,
          newPrice,
          changePercent,
          needsApproval: Math.abs(changePercent) > 20,
        };
      });

    const totalOldValue = items.reduce((sum, item) => sum + item.oldPrice, 0);
    const totalNewValue = items.reduce((sum, item) => sum + item.newPrice, 0);

    return { items, totalOldValue, totalNewValue };
  }

  async remove(companyId: number, id: number): Promise<void> {
    const invoice = await this.findById(companyId, id);
    await this.invoiceRepo.remove(invoice);
  }
}
