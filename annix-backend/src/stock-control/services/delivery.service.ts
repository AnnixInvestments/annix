import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { fromISO, now, nowMillis } from "../../lib/datetime";
import { SupplierInvoiceFifoBridgeService } from "../../stock-management/services/supplier-invoice-fifo-bridge.service";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { DeliveryNote, SdnStatus } from "../entities/delivery-note.entity";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { SupplierInvoice } from "../entities/supplier-invoice.entity";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { DnExtractionCorrectionRepository } from "../repositories/dn-extraction-correction.repository";
import { InvoiceClarificationRepository } from "../repositories/invoice-clarification.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { SupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository";
import { CpoService } from "./cpo.service";
import { DeliveryExtractionService } from "./delivery-extraction.service";
import { DeliveryInvoiceService } from "./delivery-invoice.service";
import { DeliverySupplierService } from "./delivery-supplier.service";

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly deliveryNoteRepo: DeliveryNoteRepository,
    private readonly deliveryNoteItemRepo: DeliveryNoteItemRepository,
    private readonly dnCorrectionRepo: DnExtractionCorrectionRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => CpoService))
    private readonly cpoService: CpoService,
    private readonly supplierService: DeliverySupplierService,
    private readonly extractionService: DeliveryExtractionService,
    private readonly invoiceService: DeliveryInvoiceService,
    private readonly fifoBridgeService: SupplierInvoiceFifoBridgeService,
    private readonly supplierInvoiceRepo: SupplierInvoiceRepository,
    private readonly supplierInvoiceItemRepo: SupplierInvoiceItemRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly stockMovementRepo: StockMovementRepository,
    private readonly invoiceClarificationRepo: InvoiceClarificationRepository,
  ) {}

  private async bridgeDeliveryReceiptToStockManagement(
    companyId: number,
    deliveryNoteId: number,
  ): Promise<void> {
    try {
      const note = await this.deliveryNoteRepo.findOneForCompanyWithItems(
        deliveryNoteId,
        companyId,
      );
      const noteItems = note ? note.items : null;
      if (!note || !noteItems || noteItems.length === 0) {
        return;
      }

      const alreadyInvoicedStockItemIds = await this.stockItemIdsCoveredByApprovedInvoices(
        companyId,
        deliveryNoteId,
      );

      const quantitiesByStockItem = noteItems.reduce((acc, item) => {
        const itemStockItem = item.stockItem;
        const rawStockItemId = itemStockItem
          ? itemStockItem.id
          : (item as unknown as { stockItemId?: number }).stockItemId;
        const stockItemId = Number(rawStockItemId);
        if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
          return acc;
        }
        if (alreadyInvoicedStockItemIds.has(stockItemId)) {
          return acc;
        }
        const previous = acc.get(stockItemId);
        return acc.set(stockItemId, (previous ? previous : 0) + Number(item.quantityReceived || 0));
      }, new Map<number, number>());

      const lines = Array.from(quantitiesByStockItem.entries())
        .filter(([, quantity]) => quantity > 0)
        .map(([legacyStockItemId, quantity]) => ({
          legacyStockItemId,
          quantity,
          deliveryNoteId,
          supplierName: note.supplierName || null,
          receivedAt: note.receivedDate ? note.receivedDate : null,
        }));
      if (lines.length === 0) {
        return;
      }

      const result = await this.fifoBridgeService.createBatchesFromDelivery(companyId, lines);
      this.logger.log(
        `FIFO bridge for delivery ${deliveryNoteId}: ${result.created} batch(es) created, ${result.skipped} skipped`,
      );
    } catch (error) {
      this.logger.error(
        `FIFO bridge failed for delivery ${deliveryNoteId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async stockItemIdsCoveredByApprovedInvoices(
    companyId: number,
    deliveryNoteId: number,
  ): Promise<Set<number>> {
    const invoices = await this.supplierInvoiceRepo.findCompletedLinkedToDeliveryNote(
      companyId,
      deliveryNoteId,
    );
    const itemLists = await Promise.all(
      invoices.map((invoice) => this.supplierInvoiceItemRepo.findByInvoice(invoice.id)),
    );
    return new Set(
      itemLists
        .flat()
        .map((item) => Number(item.stockItemId))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
  }

  async updateDeliveryNumber(
    companyId: number,
    id: number,
    deliveryNumber: string,
  ): Promise<DeliveryNote> {
    const trimmed = deliveryNumber.trim();
    if (!trimmed) {
      throw new BadRequestException("Delivery number is required");
    }

    const note = await this.deliveryNoteRepo.findOneForCompany(id, companyId);
    if (!note) {
      throw new NotFoundException(`Delivery note ${id} not found`);
    }

    if (trimmed === note.deliveryNumber) {
      return note;
    }

    const existing = await this.deliveryNoteRepo.findOneByNumber(companyId, trimmed);
    if (existing && existing.id !== note.id) {
      throw new ConflictException(`Delivery note ${trimmed} already exists`);
    }

    note.deliveryNumber = trimmed;
    return this.deliveryNoteRepo.save(note);
  }

  async create(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: Date | null;
      notes?: string;
      photoUrl?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number; photoUrl?: string }[];
    },
  ): Promise<DeliveryNote> {
    const existingNote = await this.deliveryNoteRepo.findOneByNumber(
      companyId,
      data.deliveryNumber,
    );
    if (existingNote) {
      throw new ConflictException(`Delivery note ${data.deliveryNumber} has already been uploaded`);
    }

    const savedNote = await this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: data.receivedDate || now().toJSDate(),
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
      receivedBy: data.receivedBy || null,
      companyId,
    });

    await data.items.reduce(async (prev, itemData) => {
      await prev;
      const stockItem = await this.stockItemRepo.findOneForCompany(itemData.stockItemId, companyId);
      if (!stockItem) {
        throw new NotFoundException(`Stock item ${itemData.stockItemId} not found`);
      }

      await this.deliveryNoteItemRepo.create({
        deliveryNote: savedNote,
        stockItem,
        quantityReceived: itemData.quantityReceived,
        photoUrl: itemData.photoUrl || null,
        companyId,
      });

      stockItem.quantity = stockItem.quantity + itemData.quantityReceived;
      await this.stockItemRepo.save(stockItem);

      await this.stockMovementRepo.create({
        stockItemId: stockItem.id,
        movementType: MovementType.IN,
        quantity: itemData.quantityReceived,
        referenceType: ReferenceType.DELIVERY,
        referenceId: savedNote.id,
        notes: `Received via delivery ${data.deliveryNumber}`,
        createdBy: data.receivedBy || null,
        companyId,
      });
    }, Promise.resolve());

    this.cpoService
      .linkDeliveryToCalloffs(companyId, data.supplierName, savedNote.id)
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.logger.warn(`Failed to link DN ${savedNote.id} to calloffs: ${msg}`);
      });

    await this.bridgeDeliveryReceiptToStockManagement(companyId, savedNote.id);

    return this.findById(companyId, savedNote.id);
  }

  async createFromEmail(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      photoUrl?: string | null;
    },
  ): Promise<DeliveryNote> {
    return this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: now().toJSDate(),
      photoUrl: data.photoUrl ?? null,
      companyId,
    });
  }

  async findAll(
    companyId: number,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<DeliveryNote[]> {
    const notes = await this.deliveryNoteRepo.findPaginatedWithItems(
      companyId,
      page,
      limit,
      search,
    );

    return Promise.all(notes.map((note) => this.addPresignedUrl(note)));
  }

  async findById(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepo.findOneForCompanyWithItems(id, companyId);
    if (!note) {
      throw new NotFoundException("Delivery note not found");
    }
    return this.addPresignedUrl(note);
  }

  private async addPresignedUrl(note: DeliveryNote): Promise<DeliveryNote> {
    if (note.photoUrl) {
      try {
        note.photoUrl = await this.storageService.presignedUrl(note.photoUrl, 3600);
      } catch (error) {
        this.logger.warn(
          `Failed to generate presigned URL for ${note.photoUrl}: ${error?.message ?? error}`,
        );
      }
    }
    return note;
  }

  async remove(companyId: number, id: number): Promise<void> {
    const note = await this.findById(companyId, id);

    const movements = await this.stockMovementRepo.findManyWhere({
      referenceType: ReferenceType.DELIVERY,
      referenceId: id,
      companyId,
    });

    await movements.reduce(async (prev, movement) => {
      await prev;
      if (movement.stockItemId) {
        const stockItem = await this.stockItemRepo.findOneForCompany(
          movement.stockItemId,
          companyId,
        );
        if (stockItem) {
          stockItem.quantity = stockItem.quantity - movement.quantity;
          await this.stockItemRepo.save(stockItem);
          this.logger.log(`Reversed stock movement: ${stockItem.sku} -${movement.quantity}`);
        }
      }
      await this.stockMovementRepo.remove(movement);
    }, Promise.resolve());

    const invoicesByNumericKey = await this.supplierInvoiceRepo.findManyWhere({
      deliveryNoteId: id,
      companyId,
    });
    const invoicesByStringKey = await this.supplierInvoiceRepo.findManyWhere({
      deliveryNoteId: String(id) as unknown as number,
      companyId,
    });
    const linkedInvoices = Array.from(
      new Map(
        [...invoicesByNumericKey, ...invoicesByStringKey].map((invoice) => [
          String(invoice.id),
          invoice,
        ]),
      ).values(),
    );
    if (linkedInvoices.length > 0) {
      await linkedInvoices.reduce(async (prev, invoice) => {
        await prev;
        await this.supplierInvoiceItemRepo.deleteByInvoice(invoice.id);
        await this.invoiceClarificationRepo.deleteForInvoice(invoice.id);
        await this.supplierInvoiceRepo.remove(invoice);
      }, Promise.resolve());
      this.logger.warn(
        `Deleted ${linkedInvoices.length} supplier invoice(s) linked to delivery ${id}`,
      );
    }

    if (note.items && note.items.length > 0) {
      await note.items.reduce(async (prev, item) => {
        await prev;
        await this.deliveryNoteItemRepo.remove(item);
      }, Promise.resolve());
    }

    await this.deliveryNoteRepo.remove(note);

    const movementCount = movements.length;

    try {
      await this.fifoBridgeService.voidDeliveryBatches(companyId, id);
    } catch (error) {
      this.logger.error(
        `Failed to write off FIFO batches for deleted delivery ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(`Deleted delivery note ${id} and reversed ${movementCount} stock movements`);
  }

  async uploadPhoto(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/deliveries");
    note.photoUrl = result.path;
    await this.deliveryNoteRepo.save(note);
    return this.findById(companyId, id);
  }

  async extractFromPhoto(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    await this.extractionService.extractFromPhoto(note);
    return this.findById(companyId, id);
  }

  async extractionStatus(
    companyId: number,
    id: number,
  ): Promise<{ status: string | null; data: unknown }> {
    const note = await this.findById(companyId, id);
    return {
      status: note.extractionStatus,
      data: note.extractedData,
    };
  }

  async previewStockMatches(companyId: number, id: number) {
    const note = await this.findById(companyId, id);
    return this.extractionService.previewStockMatches(companyId, note);
  }

  async linkExtractedItemsToStock(
    companyId: number,
    id: number,
    receivedBy?: string,
    overrides?: Array<{ description: string; matchedItemId: number | null }>,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    await this.extractionService.linkExtractedItemsToStock(companyId, note, receivedBy, overrides);
    await this.bridgeDeliveryReceiptToStockManagement(companyId, id);
    return this.findById(companyId, id);
  }

  async resolveOrCreateSupplier(
    companyId: number,
    supplierName: string,
    details?: {
      vatNumber?: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<import("../entities/stock-control-supplier.entity").StockControlSupplier> {
    return this.supplierService.resolveOrCreateSupplier(companyId, supplierName, details);
  }

  async createFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      toCompany?: { name?: string };
      lineItems?: Array<{
        description?: string;
        itemCode?: string;
        productCode?: string;
        quantity?: number;
        unitOfMeasure?: string;
        unitPrice?: number;
        lineTotal?: number;
        isReturned?: boolean;
        isPaint?: boolean;
        isTwoPack?: boolean;
        volumeLitersPerPack?: number;
        totalLiters?: number;
        costPerLiter?: number;
      }>;
    },
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    this.logger.log(`Uploading file for delivery note, size: ${file.size} bytes`);
    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.STOCK_CONTROL}/deliveries`,
    );
    this.logger.log(`File uploaded successfully, path: ${uploadResult.path}`);

    const receivedDate = analyzedData.deliveryDate
      ? fromISO(analyzedData.deliveryDate).toJSDate()
      : now().toJSDate();

    const deliveryNumber = analyzedData.deliveryNoteNumber || `DN-${nowMillis()}`;

    const existingNote = await this.deliveryNoteRepo.findOneByNumber(companyId, deliveryNumber);

    if (existingNote) {
      throw new ConflictException(`Delivery note ${deliveryNumber} has already been uploaded`);
    }

    const supplierName = analyzedData.fromCompany?.name || "Unknown Supplier";

    this.logger.log(
      `Creating delivery note: ${deliveryNumber}, supplier: ${supplierName}, date: ${receivedDate.toISOString()}`,
    );

    let supplierId: number | null = null;
    if (analyzedData.fromCompany?.name) {
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        analyzedData.fromCompany.name,
        {
          vatNumber: analyzedData.fromCompany.vatNumber,
          address: analyzedData.fromCompany.address,
          contactPerson: analyzedData.fromCompany.contactPerson,
          phone: analyzedData.fromCompany.phone,
          email: analyzedData.fromCompany.email,
        },
      );
      supplierId = supplier.id;
    }

    const hasLineItems = analyzedData.lineItems && analyzedData.lineItems.length > 0;

    const savedNote = await this.deliveryNoteRepo.create({
      deliveryNumber,
      supplierName,
      supplierId,
      receivedDate,
      notes: null,
      photoUrl: uploadResult.path,
      receivedBy: receivedBy || null,
      companyId,
      extractionStatus: "completed",
      extractedData: analyzedData as DeliveryNote["extractedData"],
      sdnStatus: hasLineItems ? SdnStatus.STOCK_LINKED : SdnStatus.CONFIRMED,
    });
    this.logger.log(`Delivery note saved with ID: ${savedNote.id}`);

    if (hasLineItems) {
      this.logger.log(
        `Auto-creating ${analyzedData.lineItems!.length} stock items from extracted data`,
      );
      await this.extractionService.createStockItemsFromExtracted(
        companyId,
        savedNote,
        analyzedData.lineItems!,
        receivedBy,
      );
      await this.bridgeDeliveryReceiptToStockManagement(companyId, savedNote.id);
    }

    this.cpoService.linkDeliveryToCalloffs(companyId, supplierName, savedNote.id).catch((err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Failed to link DN ${savedNote.id} to calloffs: ${msg}`);
    });

    return this.findById(companyId, savedNote.id);
  }

  async createPendingFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      toCompany?: { name?: string };
      lineItems?: Array<{
        description?: string;
        itemCode?: string;
        productCode?: string;
        quantity?: number;
        unitOfMeasure?: string;
        unitPrice?: number;
        lineTotal?: number;
        isReturned?: boolean;
        isPaint?: boolean;
        isTwoPack?: boolean;
        volumeLitersPerPack?: number;
        totalLiters?: number;
        costPerLiter?: number;
      }>;
    },
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    this.logger.log(`Saving pending delivery note, file size: ${file.size} bytes`);
    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.STOCK_CONTROL}/deliveries`,
    );

    const receivedDate = analyzedData.deliveryDate
      ? fromISO(analyzedData.deliveryDate).toJSDate()
      : now().toJSDate();

    const deliveryNumber = analyzedData.deliveryNoteNumber || `DN-${nowMillis()}`;

    const existingNote = await this.deliveryNoteRepo.findOneByNumber(companyId, deliveryNumber);

    if (existingNote) {
      throw new ConflictException(`Delivery note ${deliveryNumber} has already been uploaded`);
    }

    const supplierName = analyzedData.fromCompany?.name || "Unknown Supplier";

    let supplierId: number | null = null;
    if (analyzedData.fromCompany?.name) {
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        analyzedData.fromCompany.name,
        {
          vatNumber: analyzedData.fromCompany.vatNumber,
          address: analyzedData.fromCompany.address,
          contactPerson: analyzedData.fromCompany.contactPerson,
          phone: analyzedData.fromCompany.phone,
          email: analyzedData.fromCompany.email,
        },
      );
      supplierId = supplier.id;
    }

    const savedNote = await this.deliveryNoteRepo.create({
      deliveryNumber,
      supplierName,
      supplierId,
      receivedDate,
      notes: null,
      photoUrl: uploadResult.path,
      receivedBy: receivedBy || null,
      companyId,
      extractionStatus: "completed",
      extractedData: analyzedData as DeliveryNote["extractedData"],
      sdnStatus: SdnStatus.PENDING_REVIEW,
    });
    this.logger.log(`Pending delivery note saved with ID: ${savedNote.id}`);

    return this.findById(companyId, savedNote.id);
  }

  async confirmDeliveryNote(
    companyId: number,
    id: number,
    confirmedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      lineItems?: Array<Record<string, unknown>>;
    },
    userId?: number | null,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);
    const originalData = note.extractedData as Record<string, unknown> | null;

    if (confirmedData.deliveryNoteNumber) {
      note.deliveryNumber = confirmedData.deliveryNoteNumber;
    }
    if (confirmedData.deliveryDate) {
      note.receivedDate = fromISO(confirmedData.deliveryDate).toJSDate();
    }
    if (confirmedData.fromCompany?.name) {
      note.supplierName = confirmedData.fromCompany.name;
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        confirmedData.fromCompany.name,
        {
          vatNumber: confirmedData.fromCompany.vatNumber,
          address: confirmedData.fromCompany.address,
          contactPerson: confirmedData.fromCompany.contactPerson,
          phone: confirmedData.fromCompany.phone,
          email: confirmedData.fromCompany.email,
        },
      );
      note.supplierId = supplier.id;
    }

    const merged = { ...(originalData || {}), ...confirmedData };
    note.extractedData = merged as typeof note.extractedData;
    note.sdnStatus = SdnStatus.CONFIRMED;

    await this.deliveryNoteRepo.save(note);
    this.logger.log(`Delivery note ${id} confirmed`);

    const supplierName = confirmedData.fromCompany?.name || note.supplierName;
    this.saveDnCorrections(
      companyId,
      id,
      supplierName,
      originalData,
      confirmedData,
      userId || null,
    ).catch((err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Failed to save DN corrections for ${id}: ${msg}`);
    });

    return this.findById(companyId, id);
  }

  private async saveDnCorrections(
    companyId: number,
    deliveryNoteId: number,
    supplierName: string,
    originalData: Record<string, unknown> | null,
    confirmedData: Record<string, unknown>,
    userId: number | null,
  ): Promise<void> {
    const corrections: Array<{
      fieldName: string;
      originalValue: string | null;
      correctedValue: string;
      itemDescription: string | null;
      itemIndex: number | null;
    }> = [];

    const headerFields = ["deliveryNoteNumber", "deliveryDate"] as const;
    headerFields.forEach((field) => {
      const original = String(originalData?.[field] || "");
      const corrected = String(confirmedData[field] || "");
      if (corrected && corrected !== original) {
        corrections.push({
          fieldName: field,
          originalValue: original || null,
          correctedValue: corrected,
          itemDescription: null,
          itemIndex: null,
        });
      }
    });

    const originalFromCompany = (originalData?.fromCompany || {}) as Record<string, unknown>;
    const confirmedFromCompany = (confirmedData.fromCompany || {}) as Record<string, unknown>;
    const companyFields = ["name", "vatNumber", "address", "contactPerson", "phone", "email"];
    companyFields.forEach((field) => {
      const original = String(originalFromCompany[field] || "");
      const corrected = String(confirmedFromCompany[field] || "");
      if (corrected && corrected !== original) {
        corrections.push({
          fieldName: `fromCompany.${field}`,
          originalValue: original || null,
          correctedValue: corrected,
          itemDescription: null,
          itemIndex: null,
        });
      }
    });

    const originalItems = (originalData?.lineItems || []) as Array<Record<string, unknown>>;
    const confirmedItems = (confirmedData.lineItems || []) as Array<Record<string, unknown>>;
    const itemFields = [
      "description",
      "productCode",
      "compoundCode",
      "quantity",
      "unitOfMeasure",
      "unitPrice",
      "lineTotal",
      "rollNumber",
      "batchNumber",
      "thicknessMm",
      "widthMm",
      "lengthM",
      "weightKg",
      "color",
      "hardnessShoreA",
    ];

    confirmedItems.forEach((confirmedItem, index) => {
      const originalItem = originalItems[index] || {};
      const desc = String(confirmedItem.description || "");

      itemFields.forEach((field) => {
        const original = String(originalItem[field] || "");
        const corrected = String(confirmedItem[field] || "");
        if (corrected && corrected !== original) {
          corrections.push({
            fieldName: `lineItem.${field}`,
            originalValue: original || null,
            correctedValue: corrected,
            itemDescription: desc || null,
            itemIndex: index,
          });
        }
      });
    });

    if (corrections.length === 0) return;

    this.logger.log(
      `Saving ${corrections.length} DN extraction corrections for supplier "${supplierName}"`,
    );

    await this.dnCorrectionRepo.createMany(
      corrections.map((c) => ({
        companyId,
        supplierName,
        deliveryNoteId,
        fieldName: c.fieldName,
        originalValue: c.originalValue,
        correctedValue: c.correctedValue,
        itemDescription: c.itemDescription,
        itemIndex: c.itemIndex,
        correctedBy: userId,
      })),
    );
  }

  async dnCorrectionHintsForCompany(companyId: number): Promise<string | null> {
    const recentCorrections = await this.dnCorrectionRepo.findRecentForCompany(companyId, 30);

    if (recentCorrections.length === 0) return null;

    const hints = recentCorrections.map((c) => {
      const context = c.itemDescription ? ` (item: "${c.itemDescription}")` : "";
      return `- ${c.supplierName}${context}: ${c.fieldName} was corrected from "${c.originalValue}" to "${c.correctedValue}"`;
    });

    return `PREVIOUS CORRECTIONS FOR DELIVERY NOTES (learn from these patterns):\n${hints.join("\n")}\n\nApply these correction patterns when extracting similar documents. For example, if a supplier's compound codes are consistently corrected, use the corrected format. If quantities or dimensions are corrected, pay attention to units.`;
  }

  async createInvoiceFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      invoiceNumber?: string;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      totals?: {
        subtotalExclVat?: number;
        vatTotal?: number;
        grandTotalInclVat?: number;
      };
    },
  ): Promise<SupplierInvoice> {
    return this.invoiceService.createFromAnalyzedData(companyId, file, analyzedData);
  }
}
