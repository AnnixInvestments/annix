import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { nowMillis } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { DeliverySupplierService } from "./delivery-supplier.service";
import { validPositiveNumber } from "./extraction-validation";
import { InvoiceExtractionService } from "./invoice-extraction.service";

interface ExtractedLineItem {
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
}

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

@Injectable()
export class DeliveryExtractionService {
  private readonly logger = new Logger(DeliveryExtractionService.name);

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
    private readonly supplierService: DeliverySupplierService,
  ) {}

  async extractFromPhoto(note: DeliveryNote): Promise<void> {
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
    } catch (error) {
      note.extractionStatus = "failed";
      note.extractedData = { rawText: error.message };
      await this.deliveryNoteRepo.save(note);
      throw error;
    }
  }

  async linkExtractedItemsToStock(
    companyId: number,
    note: DeliveryNote,
    receivedBy?: string,
  ): Promise<void> {
    if (note.items && note.items.length > 0) {
      this.logger.log(`Delivery note ${note.id} already has ${note.items.length} linked items`);
      return;
    }

    const extractedData = note.extractedData as {
      lineItems?: Array<ExtractedLineItem>;
    } | null;

    if (!extractedData?.lineItems || extractedData.lineItems.length === 0) {
      this.logger.log(`Delivery note ${note.id} has no extracted line items to link`);
      return;
    }

    this.logger.log(
      `Linking ${extractedData.lineItems.length} extracted items to stock for delivery note ${note.id}`,
    );
    await this.createStockItemsFromExtracted(companyId, note, extractedData.lineItems, receivedBy);
  }

  async createStockItemsFromExtracted(
    companyId: number,
    deliveryNote: DeliveryNote,
    lineItems: Array<ExtractedLineItem>,
    receivedBy?: string,
  ): Promise<void> {
    const processItem = async (item: ExtractedLineItem): Promise<void> => {
      if (!item.description) {
        return;
      }

      const isReturned = item.isReturned || /\breturned?\b/i.test(item.description);

      if (isReturned) {
        await this.handleReturnedItem(companyId, deliveryNote, item, receivedBy);
        return;
      }

      const sku = this.generateSku(item);
      const { quantity, costPerUnit, unitOfMeasure } = this.calculateItemMetrics(item);

      const stockItem = await this.resolveOrCreateStockItem(
        companyId,
        deliveryNote.supplierName,
        item,
        sku,
        quantity,
        costPerUnit,
        unitOfMeasure,
      );

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
    };

    let failedCount = 0;
    await lineItems.reduce(
      (chain, item) =>
        chain.then(async () => {
          try {
            await processItem(item);
          } catch (error) {
            failedCount++;
            this.logger.error(
              `Failed to process item "${item.description}" for delivery ${deliveryNote.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
            if (failedCount >= lineItems.length) {
              throw error;
            }
          }
        }),
      Promise.resolve(),
    );
  }

  calculateItemMetrics(item: ExtractedLineItem): {
    quantity: number;
    costPerUnit: number;
    unitOfMeasure: string;
  } {
    if (item.isPaint) {
      const totalLiters =
        item.totalLiters ??
        (item.volumeLitersPerPack && item.quantity
          ? item.volumeLitersPerPack * item.quantity
          : (item.volumeLitersPerPack ?? 1));
      const quantity = validPositiveNumber(totalLiters, 1);
      const costPerUnit =
        item.costPerLiter ?? (item.lineTotal && quantity > 0 ? item.lineTotal / quantity : 0);
      this.logger.log(
        `Paint item: ${item.description} - ${quantity}L @ R${costPerUnit.toFixed(2)}/L`,
      );
      return { quantity, costPerUnit, unitOfMeasure: "L" };
    }

    const quantity = validPositiveNumber(item.quantity, 1);
    const costPerUnit =
      validPositiveNumber(item.unitPrice, 0) ||
      (item.lineTotal && quantity > 0 ? item.lineTotal / quantity : 0);
    return { quantity, costPerUnit, unitOfMeasure: item.unitOfMeasure || "each" };
  }

  generateSku(item: { itemCode?: string; productCode?: string; description?: string }): string {
    const raw = (() => {
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
      return descWords || `ITEM-${nowMillis()}`;
    })();
    return raw.slice(0, 100);
  }

  inferMediaTypeFromUrl(url: string): MediaType {
    const lower = url.toLowerCase();
    if (lower.includes(".pdf")) return "application/pdf";
    if (lower.includes(".png")) return "image/png";
    if (lower.includes(".gif")) return "image/gif";
    if (lower.includes(".webp")) return "image/webp";
    return "image/jpeg";
  }

  private async resolveOrCreateStockItem(
    companyId: number,
    supplierName: string,
    item: ExtractedLineItem,
    sku: string,
    quantity: number,
    costPerUnit: number,
    unitOfMeasure: string,
  ): Promise<StockItem> {
    const existingBySku = await this.stockItemRepo.findOne({
      where: { sku, companyId },
    });

    if (existingBySku) {
      existingBySku.quantity = existingBySku.quantity + quantity;
      if (Number.isFinite(costPerUnit) && costPerUnit > 0) {
        existingBySku.costPerUnit = costPerUnit;
      }
      await this.stockItemRepo.save(existingBySku);
      this.logger.log(`Updated existing stock item ${sku}: +${quantity}`);
      return existingBySku;
    }

    const matchResult = await this.supplierService.findMatchingStockItem(
      companyId,
      supplierName,
      item.description!,
      sku,
    );

    if (matchResult.existingItem && matchResult.sameSupplier) {
      const matched = matchResult.existingItem;
      const oldSku = matched.sku;
      matched.sku = sku;
      matched.quantity = matched.quantity + quantity;
      if (Number.isFinite(costPerUnit) && costPerUnit > 0) {
        matched.costPerUnit = costPerUnit;
      }
      await this.stockItemRepo.save(matched);
      this.logger.log(
        `Merged item: updated SKU from ${oldSku} to ${sku}, added ${quantity} (same supplier: ${supplierName})`,
      );
      return matched;
    }

    const safeCost = Number.isFinite(costPerUnit) ? costPerUnit : 0;
    const category = this.inferCategory(item);
    const inferredLocationId = await this.inferLocationForCategory(companyId, category);

    const created = this.stockItemRepo.create({
      sku,
      name: (item.description || "Unknown Item").slice(0, 255),
      description: null,
      category,
      unitOfMeasure,
      costPerUnit: safeCost,
      quantity,
      minStockLevel: 0,
      needsQrPrint: true,
      companyId,
      locationId: inferredLocationId,
    });
    await this.stockItemRepo.save(created);
    const locLabel = inferredLocationId ? `location=${inferredLocationId}` : "no location";
    this.logger.log(
      `Created new stock item ${sku}: ${item.description} @ R${safeCost.toFixed(2)} (${locLabel})`,
    );
    return created;
  }

  private inferCategory(item: ExtractedLineItem): string {
    if (item.isPaint) return "Paint";

    const desc = (item.description || "").toLowerCase();
    const code = (item.itemCode || "").toLowerCase();
    const combined = `${desc} ${code}`;

    const rubberPatterns =
      /\brubber\b|\bshore\b|\bcured\b|\broll\b|\bcompound\b|\blagging\b|\bliner\b|\blining\b/;
    if (rubberPatterns.test(combined)) return "RUBBER";

    const consumablePatterns = /\bbrush\b|\btape\b|\bpaper\b|\bglove\b|\brag\b|\bstrap/;
    if (consumablePatterns.test(combined)) return "CONSUMABLES";

    return "Uncategorized";
  }

  private async inferLocationForCategory(
    companyId: number,
    category: string,
  ): Promise<number | null> {
    const rows: Array<{ location_id: number; cnt: string }> = await this.stockItemRepo.query(
      `SELECT location_id, COUNT(*) AS cnt
       FROM stock_items
       WHERE company_id = $1
         AND category = $2
         AND location_id IS NOT NULL
       GROUP BY location_id
       ORDER BY cnt DESC
       LIMIT 1`,
      [companyId, category],
    );

    if (rows.length > 0) {
      return rows[0].location_id;
    }
    return null;
  }

  private async handleReturnedItem(
    companyId: number,
    deliveryNote: DeliveryNote,
    item: ExtractedLineItem,
    receivedBy?: string,
  ): Promise<void> {
    const sku = this.generateSku(item);

    const stockItem = await this.stockItemRepo.findOne({
      where: { sku, companyId },
    });

    if (!stockItem) {
      this.logger.log(
        `Returned item not found in stock, skipping: ${item.description} (SKU: ${sku})`,
      );
      return;
    }

    const quantity = item.isPaint
      ? (item.totalLiters ??
        (item.volumeLitersPerPack && item.quantity
          ? item.volumeLitersPerPack * item.quantity
          : (item.volumeLitersPerPack ?? 1)))
      : (item.quantity ?? 1);

    stockItem.quantity = Math.max(0, stockItem.quantity - quantity);
    await this.stockItemRepo.save(stockItem);
    this.logger.log(
      `Reduced stock for returned item ${sku}: -${quantity} (new qty: ${stockItem.quantity})`,
    );

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
}
