import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { nowMillis } from "../../lib/datetime";
import { RubberProductCoding } from "../../rubber-lining/entities/rubber-product-coding.entity";
import { RubberRollStock } from "../../rubber-lining/entities/rubber-roll-stock.entity";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote, SdnStatus } from "../entities/delivery-note.entity";
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
    @InjectRepository(RubberRollStock)
    private readonly rubberRollStockRepo: Repository<RubberRollStock>,
    @InjectRepository(RubberProductCoding)
    private readonly rubberProductCodingRepo: Repository<RubberProductCoding>,
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

    note.sdnStatus = SdnStatus.STOCK_LINKED;
    await this.deliveryNoteRepo.save(note);
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
      const rollNumber = this.extractRollNumber(item, sku);

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

      const movementNotes = rollNumber
        ? `Received via delivery ${deliveryNote.deliveryNumber} (Roll #${rollNumber})`
        : `Received via delivery ${deliveryNote.deliveryNumber}`;
      const movement = this.movementRepo.create({
        stockItem,
        movementType: MovementType.IN,
        quantity,
        referenceType: ReferenceType.DELIVERY,
        referenceId: deliveryNote.id,
        notes: movementNotes,
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
      if (item.isPaint && item.volumeLitersPerPack && !existingBySku.packSizeLitres) {
        existingBySku.packSizeLitres = item.volumeLitersPerPack;
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
      if (item.isPaint && item.volumeLitersPerPack && !matched.packSizeLitres) {
        matched.packSizeLitres = item.volumeLitersPerPack;
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

    const rubberData = await this.enrichFromRubberRollStock(item, sku);
    const rollNumber = this.extractRollNumber(item, sku);
    const isRubberItem = rubberData !== null || rollNumber !== null || category === "RUBBER";
    const finalSku = rubberData?.sku || sku;

    const existingByEnrichedSku = rubberData
      ? await this.stockItemRepo.findOne({ where: { sku: finalSku, companyId } })
      : null;
    if (existingByEnrichedSku) {
      existingByEnrichedSku.quantity = existingByEnrichedSku.quantity + quantity;
      if (Number.isFinite(costPerUnit) && costPerUnit > 0) {
        existingByEnrichedSku.costPerUnit = costPerUnit;
      }
      await this.stockItemRepo.save(existingByEnrichedSku);
      this.logger.log(`Updated existing enriched stock item ${finalSku}: +${quantity}`);
      return existingByEnrichedSku;
    }

    const itemName =
      rubberData?.name ||
      (item.productCode ? item.productCode : null) ||
      item.description ||
      "Unknown Item";
    const itemDescription = rubberData?.description || null;

    const packSizeLitres =
      item.isPaint && item.volumeLitersPerPack ? item.volumeLitersPerPack : null;

    const created = this.stockItemRepo.create({
      sku: finalSku,
      name: itemName.slice(0, 255),
      description: itemDescription,
      category: isRubberItem ? "RUBBER" : category,
      unitOfMeasure,
      costPerUnit: safeCost,
      quantity,
      minStockLevel: 0,
      needsQrPrint: true,
      companyId,
      locationId: inferredLocationId,
      packSizeLitres,
      thicknessMm: rubberData?.thicknessMm || null,
      widthMm: rubberData?.widthMm || null,
      lengthM: rubberData?.lengthM || null,
      compoundCode: rubberData?.compoundCode || null,
      rollNumber: null,
    });
    await this.stockItemRepo.save(created);
    const locLabel = inferredLocationId ? `location=${inferredLocationId}` : "no location";
    this.logger.log(
      `Created new stock item ${sku}: ${created.name} @ R${safeCost.toFixed(2)} (${locLabel})`,
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

  private extractRollNumber(item: ExtractedLineItem, sku: string): string | null {
    const combined = `${item.description || ""} ${item.itemCode || ""} ${sku}`;
    const match = combined.match(/ROLL[\s#-]*(\d{4,6})/i);
    if (match) {
      return match[1];
    }
    return null;
  }

  private async enrichFromRubberRollStock(
    item: ExtractedLineItem,
    sku: string,
  ): Promise<{
    name: string;
    sku: string;
    description: string;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
    compoundCode: string | null;
    rollNumber: string;
  } | null> {
    const rollNumber = this.extractRollNumber(item, sku);
    if (!rollNumber) {
      return null;
    }

    const roll =
      (await this.rubberRollStockRepo.findOne({
        where: { rollNumber },
        relations: ["compoundCoding"],
      })) ||
      (await this.rubberRollStockRepo.findOne({
        where: { rollNumber: ILike(`%-${rollNumber}`) },
        relations: ["compoundCoding"],
      }));

    if (!roll) {
      this.logger.log(`Roll #${rollNumber} not found in AU Rubber roll stock`);
      return null;
    }

    const compoundCode = roll.compoundCoding?.code || null;
    const compoundName = roll.compoundCoding?.name || item.description || "Rubber Roll";
    const dimensionSuffix = [
      roll.thicknessMm ? `${roll.thicknessMm}` : null,
      roll.widthMm ? `${roll.widthMm}` : null,
    ]
      .filter((p): p is string => p !== null)
      .join("x");
    const enrichedSku = compoundCode
      ? dimensionSuffix
        ? `${compoundCode}-${dimensionSuffix}`
        : compoundCode
      : dimensionSuffix
        ? `RUBBER-${dimensionSuffix}`
        : `RUBBER-${rollNumber}`;
    const dimensionParts = [
      roll.thicknessMm ? `${roll.thicknessMm}mm thick` : null,
      roll.widthMm ? `${roll.widthMm}mm wide` : null,
    ].filter((p): p is string => p !== null);
    const description = dimensionParts.length > 0 ? dimensionParts.join(" x ") : null;

    this.logger.log(
      `Enriched roll #${rollNumber} from AU Rubber: ${compoundName} / ${enrichedSku} (${description})`,
    );

    return {
      name: compoundName,
      sku: enrichedSku,
      description,
      thicknessMm: roll.thicknessMm ? Number(roll.thicknessMm) : null,
      widthMm: roll.widthMm ? Number(roll.widthMm) : null,
      lengthM: roll.lengthM ? Number(roll.lengthM) : null,
      compoundCode,
      rollNumber,
    };
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
