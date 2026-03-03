import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { InvoiceExtractionService } from "./invoice-extraction.service";

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @InjectRepository(DeliveryNoteItem)
    private readonly deliveryNoteItemRepo: Repository<DeliveryNoteItem>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly extractionService: InvoiceExtractionService,
  ) {}

  async create(
    companyId: number,
    data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: Date;
      notes?: string;
      photoUrl?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number; photoUrl?: string }[];
    },
  ): Promise<DeliveryNote> {
    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber: data.deliveryNumber,
      supplierName: data.supplierName,
      receivedDate: data.receivedDate || new Date(),
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
      receivedBy: data.receivedBy || null,
      companyId,
    });
    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);

    const itemPromises = data.items.map(async (itemData) => {
      const stockItem = await this.stockItemRepo.findOne({
        where: { id: itemData.stockItemId, companyId },
      });
      if (!stockItem) {
        throw new NotFoundException(`Stock item ${itemData.stockItemId} not found`);
      }

      const noteItem = this.deliveryNoteItemRepo.create({
        deliveryNote: savedNote,
        stockItem,
        quantityReceived: itemData.quantityReceived,
        photoUrl: itemData.photoUrl || null,
        companyId,
      });
      await this.deliveryNoteItemRepo.save(noteItem);

      stockItem.quantity = stockItem.quantity + itemData.quantityReceived;
      await this.stockItemRepo.save(stockItem);

      const movement = this.movementRepo.create({
        stockItem,
        movementType: MovementType.IN,
        quantity: itemData.quantityReceived,
        referenceType: ReferenceType.DELIVERY,
        referenceId: savedNote.id,
        notes: `Received via delivery ${data.deliveryNumber}`,
        createdBy: data.receivedBy || null,
        companyId,
      });
      await this.movementRepo.save(movement);

      return noteItem;
    });

    await Promise.all(itemPromises);

    return this.findById(companyId, savedNote.id);
  }

  async findAll(companyId: number): Promise<DeliveryNote[]> {
    const notes = await this.deliveryNoteRepo.find({
      where: { companyId },
      relations: ["items", "items.stockItem"],
      order: { createdAt: "DESC" },
    });

    return Promise.all(notes.map((note) => this.addPresignedUrl(note)));
  }

  async findById(companyId: number, id: number): Promise<DeliveryNote> {
    const note = await this.deliveryNoteRepo.findOne({
      where: { id, companyId },
      relations: ["items", "items.stockItem"],
    });
    if (!note) {
      throw new NotFoundException("Delivery note not found");
    }
    return this.addPresignedUrl(note);
  }

  private async addPresignedUrl(note: DeliveryNote): Promise<DeliveryNote> {
    if (note.photoUrl) {
      try {
        note.photoUrl = await this.storageService.getPresignedUrl(note.photoUrl, 3600);
      } catch {
        // Keep original path if presigned URL generation fails
      }
    }
    return note;
  }

  async remove(companyId: number, id: number): Promise<void> {
    const note = await this.findById(companyId, id);

    const movements = await this.movementRepo.find({
      where: {
        referenceType: ReferenceType.DELIVERY,
        referenceId: id,
        companyId,
      },
      relations: ["stockItem"],
    });

    for (const movement of movements) {
      if (movement.stockItem) {
        movement.stockItem.quantity = movement.stockItem.quantity - movement.quantity;
        await this.stockItemRepo.save(movement.stockItem);
        this.logger.log(`Reversed stock movement: ${movement.stockItem.sku} -${movement.quantity}`);
      }
      await this.movementRepo.remove(movement);
    }

    if (note.items && note.items.length > 0) {
      await this.deliveryNoteItemRepo.remove(note.items);
    }

    await this.deliveryNoteRepo.remove(note);
    this.logger.log(`Deleted delivery note ${id} and reversed ${movements.length} stock movements`);
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

    if (!note.photoUrl) {
      throw new BadRequestException("Delivery note has no photo to extract from");
    }

    note.extractionStatus = "processing";
    await this.deliveryNoteRepo.save(note);

    try {
      const photoBuffer = await this.storageService.download(note.photoUrl);
      const imageBase64 = photoBuffer.toString("base64");
      const mediaType = this.inferMediaTypeFromUrl(note.photoUrl);

      const extractedData = await this.extractionService.extractDeliveryNoteFromImage(
        imageBase64,
        mediaType,
      );

      note.extractedData = extractedData;
      note.extractionStatus = "completed";
      await this.deliveryNoteRepo.save(note);

      return this.findById(companyId, id);
    } catch (error) {
      note.extractionStatus = "failed";
      note.extractedData = { rawText: error.message };
      await this.deliveryNoteRepo.save(note);
      throw error;
    }
  }

  private inferMediaTypeFromUrl(
    url: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    const lower = url.toLowerCase();
    if (lower.includes(".png")) return "image/png";
    if (lower.includes(".gif")) return "image/gif";
    if (lower.includes(".webp")) return "image/webp";
    return "image/jpeg";
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

  async linkExtractedItemsToStock(
    companyId: number,
    id: number,
    receivedBy?: string,
  ): Promise<DeliveryNote> {
    const note = await this.findById(companyId, id);

    if (note.items && note.items.length > 0) {
      this.logger.log(`Delivery note ${id} already has ${note.items.length} linked items`);
      return note;
    }

    const extractedData = note.extractedData as {
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
    } | null;

    if (!extractedData?.lineItems || extractedData.lineItems.length === 0) {
      this.logger.log(`Delivery note ${id} has no extracted line items to link`);
      return note;
    }

    this.logger.log(
      `Linking ${extractedData.lineItems.length} extracted items to stock for delivery note ${id}`,
    );
    await this.createStockItemsFromExtracted(companyId, note, extractedData.lineItems, receivedBy);

    return this.findById(companyId, id);
  }

  async createFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: { name?: string };
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
      ? new Date(analyzedData.deliveryDate)
      : new Date();

    let deliveryNumber = analyzedData.deliveryNoteNumber || `DN-${Date.now()}`;

    const existingNote = await this.deliveryNoteRepo.findOne({
      where: { companyId, deliveryNumber },
    });

    if (existingNote) {
      deliveryNumber = `${deliveryNumber}-${Date.now()}`;
      this.logger.log(
        `Delivery note ${analyzedData.deliveryNoteNumber} already exists, using ${deliveryNumber}`,
      );
    }

    this.logger.log(
      `Creating delivery note: ${deliveryNumber}, supplier: ${analyzedData.fromCompany?.name}, date: ${receivedDate.toISOString()}`,
    );

    const deliveryNote = this.deliveryNoteRepo.create({
      deliveryNumber,
      supplierName: analyzedData.fromCompany?.name || "Unknown Supplier",
      receivedDate,
      notes: null,
      photoUrl: uploadResult.path,
      receivedBy: receivedBy || null,
      companyId,
      extractionStatus: "completed",
      extractedData: analyzedData,
    });

    const savedNote = await this.deliveryNoteRepo.save(deliveryNote);
    this.logger.log(`Delivery note saved with ID: ${savedNote.id}`);

    if (analyzedData.lineItems && analyzedData.lineItems.length > 0) {
      this.logger.log(
        `Auto-creating ${analyzedData.lineItems.length} stock items from extracted data`,
      );
      await this.createStockItemsFromExtracted(
        companyId,
        savedNote,
        analyzedData.lineItems,
        receivedBy,
      );
    }

    return this.findById(companyId, savedNote.id);
  }

  private async createStockItemsFromExtracted(
    companyId: number,
    deliveryNote: DeliveryNote,
    lineItems: Array<{
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
    }>,
    receivedBy?: string,
  ): Promise<void> {
    for (const item of lineItems) {
      if (!item.description) {
        continue;
      }

      const isReturned = item.isReturned || /\breturned?\b/i.test(item.description);

      if (isReturned) {
        await this.handleReturnedItem(companyId, deliveryNote, item, receivedBy);
        continue;
      }

      const sku = this.generateSku(item);

      let quantity: number;
      let costPerUnit: number;
      let unitOfMeasure: string;

      if (item.isPaint) {
        const totalLiters =
          item.totalLiters ??
          (item.volumeLitersPerPack && item.quantity
            ? item.volumeLitersPerPack * item.quantity
            : (item.volumeLitersPerPack ?? 1));
        quantity = totalLiters;
        unitOfMeasure = "L";
        costPerUnit = item.costPerLiter ?? (item.lineTotal ? item.lineTotal / totalLiters : 0);
        this.logger.log(
          `Paint item: ${item.description} - ${quantity}L @ R${costPerUnit.toFixed(2)}/L`,
        );
      } else {
        quantity = item.quantity ?? 1;
        unitOfMeasure = item.unitOfMeasure || "each";
        costPerUnit =
          item.unitPrice ?? (item.lineTotal && item.quantity ? item.lineTotal / item.quantity : 0);
      }

      let stockItem = await this.stockItemRepo.findOne({
        where: { sku, companyId },
      });

      if (stockItem) {
        stockItem.quantity = stockItem.quantity + quantity;
        if (costPerUnit > 0) {
          stockItem.costPerUnit = costPerUnit;
        }
        await this.stockItemRepo.save(stockItem);
        this.logger.log(`Updated existing stock item ${sku}: +${quantity}`);
      } else {
        stockItem = this.stockItemRepo.create({
          sku,
          name: item.description,
          description: null,
          category: item.isPaint ? "Paint" : "Uncategorized",
          unitOfMeasure,
          costPerUnit,
          quantity,
          minStockLevel: 0,
          needsQrPrint: true,
          companyId,
        });
        await this.stockItemRepo.save(stockItem);
        this.logger.log(
          `Created new stock item ${sku}: ${item.description} @ R${costPerUnit.toFixed(2)}`,
        );
      }

      const noteItem = this.deliveryNoteItemRepo.create({
        deliveryNote,
        stockItem,
        quantityReceived: quantity,
        photoUrl: null,
        companyId,
      });
      await this.deliveryNoteItemRepo.save(noteItem);

      const movement = this.movementRepo.create({
        stockItem,
        movementType: MovementType.IN,
        quantity,
        referenceType: ReferenceType.DELIVERY,
        referenceId: deliveryNote.id,
        notes: `Received via delivery ${deliveryNote.deliveryNumber}`,
        createdBy: receivedBy || null,
        companyId,
      });
      await this.movementRepo.save(movement);
    }
  }

  private async handleReturnedItem(
    companyId: number,
    deliveryNote: DeliveryNote,
    item: {
      description?: string;
      itemCode?: string;
      productCode?: string;
      quantity?: number;
      unitOfMeasure?: string;
      unitPrice?: number;
      lineTotal?: number;
      isPaint?: boolean;
      volumeLitersPerPack?: number;
      totalLiters?: number;
    },
    receivedBy?: string,
  ): Promise<void> {
    const sku = this.generateSku(item);

    const stockItem = await this.stockItemRepo.findOne({
      where: { sku, companyId },
    });

    if (!stockItem) {
      this.logger.log(`Returned item not found in stock, skipping: ${item.description} (SKU: ${sku})`);
      return;
    }

    let quantity: number;
    if (item.isPaint) {
      quantity =
        item.totalLiters ??
        (item.volumeLitersPerPack && item.quantity
          ? item.volumeLitersPerPack * item.quantity
          : (item.volumeLitersPerPack ?? 1));
    } else {
      quantity = item.quantity ?? 1;
    }

    stockItem.quantity = Math.max(0, stockItem.quantity - quantity);
    await this.stockItemRepo.save(stockItem);
    this.logger.log(`Reduced stock for returned item ${sku}: -${quantity} (new qty: ${stockItem.quantity})`);

    const movement = this.movementRepo.create({
      stockItem,
      movementType: MovementType.OUT,
      quantity,
      referenceType: ReferenceType.DELIVERY,
      referenceId: deliveryNote.id,
      notes: `Returned via delivery ${deliveryNote.deliveryNumber}`,
      createdBy: receivedBy || null,
      companyId,
    });
    await this.movementRepo.save(movement);
  }

  private generateSku(item: {
    itemCode?: string;
    productCode?: string;
    description?: string;
  }): string {
    if (item.itemCode) {
      return item.itemCode.toUpperCase().replace(/\s+/g, "-");
    }
    if (item.productCode) {
      return item.productCode.toUpperCase().replace(/\s+/g, "-");
    }
    const descWords = (item.description || "ITEM")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .slice(0, 4)
      .join("-");
    return descWords || `ITEM-${Date.now()}`;
  }
}
