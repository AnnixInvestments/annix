import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { LearningSource, LearningType } from "../../nix/entities/nix-learning.entity";
import { NixLearningRepository } from "../../nix/nix-learning.repository";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockIssuanceRepository } from "../repositories/stock-issuance.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { DeliverySupplierService } from "./delivery-supplier.service";
import { RequisitionService } from "./requisition.service";

export interface DuplicateGroup {
  canonicalItem: StockItem;
  duplicates: Array<{
    item: StockItem;
    score: number;
    matchType: string;
  }>;
  totalQuantity: number;
}

export interface MergeResult {
  targetItem: StockItem;
  mergedCount: number;
  quantityAdded: number;
  movementsTransferred: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly stockItemRepo: StockItemRepository,
    private readonly nixLearningRepo: NixLearningRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly deliveryNoteItemRepo: DeliveryNoteItemRepository,
    private readonly allocationRepo: StockAllocationRepository,
    private readonly issuanceRepo: StockIssuanceRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly aiChatService: AiChatService,
    private readonly supplierService: DeliverySupplierService,
  ) {}

  async create(companyId: number, data: Partial<StockItem>): Promise<StockItem> {
    const saved = await this.stockItemRepo.create({ ...data, companyId });

    if (!saved.category && saved.name) {
      this.inferCategoryForItem(companyId, saved).catch((err) =>
        this.logger.error(`Auto-categorize on create failed: ${err.message}`),
      );
    }

    return saved;
  }

  private async refreshPhotoUrls(items: StockItem[]): Promise<StockItem[]> {
    return Promise.all(
      items.map(async (item) => {
        if (!item.photoUrl) {
          return item;
        }
        if (item.photoUrl.includes("X-Amz-Signature") || item.photoUrl.includes("X-Amz-Expires")) {
          const pathMatch = item.photoUrl.match(/\.com\/(.+?)(\?|$)/);
          if (pathMatch) {
            item.photoUrl = await this.storageService.presignedUrl(
              decodeURIComponent(pathMatch[1]),
              3600,
            );
          }
        } else if (!item.photoUrl.startsWith("http://") && !item.photoUrl.startsWith("https://")) {
          item.photoUrl = await this.storageService.presignedUrl(item.photoUrl, 3600);
        }
        return item;
      }),
    );
  }

  async findAll(
    companyId: number,
    filters?: {
      category?: string;
      belowMinStock?: string;
      search?: string;
      page?: string;
      limit?: string;
      locationId?: string;
    },
  ): Promise<{ items: StockItem[]; total: number }> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const rawLimit = Number(filters?.limit) || 0;
    const limit = rawLimit > 0 ? Math.max(1, rawLimit) : 0;
    const skip = limit > 0 ? (page - 1) * limit : 0;

    if (filters?.search) {
      const result = await this.searchItems(
        companyId,
        filters.search,
        skip,
        limit,
        filters?.belowMinStock === "true",
        filters?.locationId,
      );
      return { items: await this.refreshPhotoUrls(result.items), total: result.total };
    }

    const { items, total } = await this.stockItemRepo.findFilteredForCompany(
      companyId,
      {
        category: filters?.category,
        belowMinStock: filters?.belowMinStock === "true",
        locationId: filters?.locationId,
      },
      skip,
      limit,
    );

    return { items: await this.refreshPhotoUrls(items), total };
  }

  private async searchItems(
    companyId: number,
    search: string,
    skip: number,
    limit: number,
    belowMinStock = false,
    locationId?: string,
  ): Promise<{ items: StockItem[]; total: number }> {
    return this.stockItemRepo.searchForCompany(
      companyId,
      search,
      skip,
      limit,
      belowMinStock,
      locationId,
    );
  }

  async findById(companyId: number, id: number): Promise<StockItem> {
    const item = await this.stockItemRepo.findOneForCompanyWithRelations(id, companyId, [
      "allocations",
      "movements",
    ]);
    if (!item) {
      throw new NotFoundException("Stock item not found");
    }
    return item;
  }

  async findByIdWithPhoto(companyId: number, id: number): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const [refreshed] = await this.refreshPhotoUrls([{ ...item }]);
    return refreshed;
  }

  async findByIds(companyId: number, ids: number[]): Promise<StockItem[]> {
    return this.stockItemRepo.findByIdsForCompanyOrderedByName(ids, companyId);
  }

  async update(companyId: number, id: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const previousCategory = item.category;
    const storedPhotoUrl = item.photoUrl;
    Object.assign(item, data);
    if (!data.photoUrl) {
      item.photoUrl = storedPhotoUrl;
    }
    const saved = await this.stockItemRepo.saveForCompany(companyId, item);

    if (
      data.category !== undefined &&
      data.category !== previousCategory &&
      data.category &&
      saved.name
    ) {
      this.recordCategoryLearning(saved.name, data.category, previousCategory).catch((err) =>
        this.logger.error(`Failed to record category learning: ${err.message}`),
      );
    }

    if (saved.minStockLevel > 0 && saved.quantity < saved.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, saved.id)
        .catch((err) =>
          this.logger.error(`Failed to create reorder requisition: ${err.message}`, err.stack),
        );
    }

    const [refreshed] = await this.refreshPhotoUrls([{ ...saved }]);
    return refreshed;
  }

  async remove(companyId: number, id: number): Promise<void> {
    const item = await this.findById(companyId, id);
    await this.stockItemRepo.removeForCompany(companyId, item);
  }

  async lowStockAlerts(companyId: number): Promise<StockItem[]> {
    const items = await this.stockItemRepo.lowStockForCompany(companyId);

    return this.refreshPhotoUrls(items);
  }

  async categories(companyId: number): Promise<string[]> {
    return this.stockItemRepo.categoriesForCompany(companyId);
  }

  async groupedByCategory(
    companyId: number,
    search?: string,
    locationId: number | null = null,
    page = 1,
    limit = 500,
  ): Promise<{
    groups: { category: string; items: StockItem[] }[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items: rawItems, total } = await this.stockItemRepo.groupedForCompany(
      companyId,
      search,
      locationId,
      (page - 1) * limit,
      limit,
    );
    const allItems = await this.refreshPhotoUrls(rawItems);

    const grouped = allItems.reduce(
      (acc, item) => {
        const cat = item.category || "Uncategorized";
        const existing = acc.find((g) => g.category === cat);
        if (existing) {
          return acc.map((g) => (g.category === cat ? { ...g, items: [...g.items, item] } : g));
        }
        return [...acc, { category: cat, items: [item] }];
      },
      [] as { category: string; items: StockItem[] }[],
    );

    const uncategorizedIndex = grouped.findIndex((g) => g.category === "Uncategorized");
    const groups =
      uncategorizedIndex > 0
        ? [
            ...grouped.slice(0, uncategorizedIndex),
            ...grouped.slice(uncategorizedIndex + 1),
            grouped[uncategorizedIndex],
          ]
        : grouped;

    return { groups, total, page, limit };
  }

  async supplierSkuMappings(companyId: number): Promise<
    Array<{
      id: number;
      supplier: string;
      supplierSku: string;
      stockItemId: number;
      stockItemName: string | null;
      stockItemSku: string | null;
      confidence: number;
      confirmationCount: number;
    }>
  > {
    const learnings =
      await this.nixLearningRepo.findActiveCorrectionsByCategoryOrderedByConfidence(
        "delivery_stock_matching",
      );

    const skuMappings = learnings.filter((l) => l.patternKey.startsWith("delivery_sku_map:"));

    const stockItemIds = skuMappings
      .map((l) => Number(l.learnedValue))
      .filter((id) => !Number.isNaN(id) && id > 0);
    const stockItems =
      stockItemIds.length > 0
        ? await this.stockItemRepo.findByIdsForCompanyOrderedByName(stockItemIds, companyId)
        : [];
    const itemMap = new Map(stockItems.map((si) => [si.id, si]));

    return skuMappings
      .map((l) => {
        const parts = l.patternKey.replace("delivery_sku_map:", "").split(":");
        const supplier = l.context?.supplier || parts[0] || "Unknown";
        const supplierSku = l.originalValue || parts.slice(1).join(":") || "Unknown";
        const stockItemId = Number(l.learnedValue);
        const item = itemMap.get(stockItemId);
        if (!item) return null;
        return {
          id: l.id,
          supplier,
          supplierSku,
          stockItemId,
          stockItemName: item.name,
          stockItemSku: item.sku,
          confidence: Number(l.confidence),
          confirmationCount: l.confirmationCount,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }

  async deleteSupplierSkuMapping(id: number): Promise<{ deleted: boolean }> {
    const learning = await this.nixLearningRepo.findOneByIdAndCategory(
      id,
      "delivery_stock_matching",
    );
    if (!learning) {
      throw new NotFoundException("Mapping not found");
    }
    learning.isActive = false;
    await this.nixLearningRepo.save(learning);
    return { deleted: true };
  }

  async detectDuplicates(companyId: number): Promise<DuplicateGroup[]> {
    const allItems = await this.stockItemRepo.findAllForCompanyOrderedByName(companyId);

    if (allItems.length < 2) return [];

    const processed = new Set<number>();
    const groups: DuplicateGroup[] = [];

    allItems.forEach((item) => {
      if (processed.has(item.id)) return;

      const candidates = this.supplierService.scoreCandidates(
        allItems.filter((other) => other.id !== item.id && !processed.has(other.id)),
        item.name,
        item.sku,
      );

      const strongMatches = candidates.filter((c) => c.score >= 0.75);
      if (strongMatches.length === 0) return;

      processed.add(item.id);
      const duplicates = strongMatches.map((c) => {
        processed.add(c.item.id);
        return { item: c.item, score: c.score, matchType: c.matchType };
      });

      const totalQuantity =
        Number(item.quantity) + duplicates.reduce((sum, d) => sum + Number(d.item.quantity), 0);

      groups.push({ canonicalItem: item, duplicates, totalQuantity });
    });

    return groups.sort((a, b) => b.duplicates.length - a.duplicates.length);
  }

  async mergeItems(
    companyId: number,
    targetItemId: number,
    sourceItemIds: number[],
    mergedBy: string,
  ): Promise<MergeResult> {
    if (sourceItemIds.includes(targetItemId)) {
      throw new BadRequestException("Target item cannot be in the source list");
    }

    if (sourceItemIds.length === 0) {
      throw new BadRequestException("At least one source item is required");
    }

    const targetItem = await this.stockItemRepo.findOneForCompany(targetItemId, companyId);

    if (!targetItem) {
      throw new NotFoundException("Target stock item not found");
    }

    const sourceItems = await this.stockItemRepo.findByIdsForCompanyOrderedByName(
      sourceItemIds,
      companyId,
    );

    if (sourceItems.length !== sourceItemIds.length) {
      const foundIds = new Set(sourceItems.map((s) => s.id));
      const missing = sourceItemIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Source stock items not found: ${missing.join(", ")}`);
    }

    let quantityAdded = 0;
    let movementsTransferred = 0;

    for (const source of sourceItems) {
      quantityAdded += Number(source.quantity);

      const movements = await this.movementRepo.findManyByStockItemForCompany(companyId, source.id);
      await Promise.all(
        movements.map((movement) =>
          this.movementRepo.saveForCompany(companyId, { ...movement, stockItemId: targetItemId }),
        ),
      );
      movementsTransferred += movements.length;

      const deliveryItems = await this.deliveryNoteItemRepo.findManyByStockItemForCompany(
        companyId,
        source.id,
      );
      await Promise.all(
        deliveryItems.map((deliveryItem) =>
          this.deliveryNoteItemRepo.saveForCompany(companyId, {
            ...deliveryItem,
            stockItemId: targetItemId,
          } as DeliveryNoteItem),
        ),
      );

      const allocations = await this.allocationRepo.findManyByStockItemForCompany(
        companyId,
        source.id,
      );
      await Promise.all(
        allocations.map((allocation) =>
          this.allocationRepo.saveForCompany(companyId, {
            ...allocation,
            stockItemId: targetItemId,
          }),
        ),
      );

      const issuances = await this.issuanceRepo.findManyByStockItemForCompany(companyId, source.id);
      await Promise.all(
        issuances.map((issuance) =>
          this.issuanceRepo.saveForCompany(companyId, { ...issuance, stockItemId: targetItemId }),
        ),
      );

      await this.movementRepo.create({
        stockItemId: targetItemId,
        movementType: MovementType.IN,
        quantity: Number(source.quantity),
        referenceType: ReferenceType.MANUAL,
        referenceId: source.id,
        notes: `Merged from "${source.name}" (SKU: ${source.sku}) — duplicate consolidation`,
        createdBy: mergedBy,
        companyId,
      });

      await this.stockItemRepo.removeForCompany(companyId, source);

      this.logger.log(
        `Merged stock item "${source.name}" (id=${source.id}, qty=${source.quantity}) into "${targetItem.name}" (id=${targetItemId})`,
      );
    }

    await this.stockItemRepo.incrementQuantityForCompany(targetItemId, companyId, quantityAdded);
    const saved = await this.stockItemRepo.findOneForCompany(targetItemId, companyId);
    if (!saved) {
      throw new NotFoundException("Target stock item not found");
    }

    this.logger.log(
      `Merge complete: ${sourceItems.length} items into "${targetItem.name}", total qty now ${saved.quantity}`,
    );

    return {
      targetItem: saved,
      mergedCount: sourceItems.length,
      quantityAdded,
      movementsTransferred,
    };
  }

  async adjustQuantity(companyId: number, id: number, delta: number): Promise<StockItem> {
    const item = await this.stockItemRepo.findOneForCompany(id, companyId);
    if (!item) {
      throw new NotFoundException("Stock item not found");
    }

    if (delta >= 0) {
      await this.stockItemRepo.incrementQuantityForCompany(id, companyId, delta);
    } else {
      const decremented = await this.stockItemRepo.decrementQuantityForCompany(
        id,
        companyId,
        Math.abs(delta),
        true,
      );
      if (!decremented) {
        await this.stockItemRepo.setQuantityForCompany(id, companyId, 0);
      }
    }

    const saved = await this.stockItemRepo.findOneForCompany(id, companyId);
    if (!saved) {
      throw new NotFoundException("Stock item not found");
    }

    if (delta < 0 && saved.minStockLevel > 0 && saved.quantity < saved.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, saved.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    const [refreshed] = await this.refreshPhotoUrls([{ ...saved }]);
    return refreshed;
  }

  async bulkCreate(companyId: number, items: Partial<StockItem>[]): Promise<StockItem[]> {
    const entities = this.stockItemRepo.buildMany(items.map((data) => ({ ...data, companyId })));
    return this.stockItemRepo.saveMany(entities);
  }

  async uploadPhoto(companyId: number, id: number, file: Express.Multer.File): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/inventory");
    item.photoUrl = result.path;
    const saved = await this.stockItemRepo.saveForCompany(companyId, item);
    const [refreshed] = await this.refreshPhotoUrls([{ ...saved }]);
    return refreshed;
  }

  async backfillRubberRollStock(_companyId: number): Promise<{
    diagnostics: {
      stockItemsWithRollPattern: number;
      rubberRollStockTotal: number;
      sampleStockItems: Array<{ id: number; name: string; sku: string }>;
      sampleRollStock: Array<{ rollNumber: string }>;
    };
    updated: number;
    details: Array<{ stockItemId: number; sku: string; extractedRoll: string; matched: boolean }>;
  }> {
    throw new BadRequestException(
      "Rubber roll backfill is no longer available. This was a one-off data migration tool and has been retired.",
    );
  }

  async normalizeRubberItems(companyId: number): Promise<{
    updated: number;
    total: number;
    details: Array<{
      id: number;
      oldSku: string;
      oldName: string;
      newSku: string;
      newName: string;
    }>;
  }> {
    const rubberItems =
      await this.stockItemRepo.findRubberCategoryForCompanyOrderedByName(companyId);

    const details: Array<{
      id: number;
      oldSku: string;
      oldName: string;
      newSku: string;
      newName: string;
    }> = [];

    for (const item of rubberItems) {
      const parsed = this.parseRubberDimensions(item.name, item.sku);
      if (!parsed) continue;

      const { productCode, thicknessMm, widthMm, lengthM } = parsed;

      const lengthStr = String(lengthM);
      const lengthSku = lengthM % 1 === 0 ? String(lengthM) : String(Math.round(lengthM * 10));

      const newName = `${productCode} ${thicknessMm}mm x ${widthMm}mm x ${lengthStr}m`;
      const newSku = `${productCode}-${thicknessMm}.${widthMm}.${lengthSku}`;

      if (newName === item.name && newSku === item.sku) continue;

      await this.stockItemRepo.updateByIdForCompany(item.id, companyId, {
        name: newName,
        sku: newSku,
      });

      details.push({
        id: item.id,
        oldSku: item.sku,
        oldName: item.name,
        newSku,
        newName,
      });
    }

    this.logger.log(
      `Rubber normalize complete: ${details.length}/${rubberItems.length} items updated`,
    );

    return { updated: details.length, total: rubberItems.length, details };
  }

  private parseRubberDimensions(
    name: string,
    sku: string,
  ): {
    productCode: string;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
  } | null {
    const dimMatch = name.match(
      /(\d+(?:\.\d+)?)\s*mm\s*x\s*(\d+(?:\.\d+)?)\s*mm\s*x\s*(\d+(?:\.\d+)?)\s*m/i,
    );
    if (!dimMatch) return null;

    const thicknessMm = Number(dimMatch[1]);
    const widthMm = Number(dimMatch[2]);
    const lengthM = Number(dimMatch[3]);

    if (Number.isNaN(thicknessMm) || Number.isNaN(widthMm) || Number.isNaN(lengthM)) return null;

    const codeMatch = sku.match(/^([A-Z]{2,}[A-Z0-9]*\d{1,2})/i);
    const productCode = codeMatch ? codeMatch[1].toUpperCase() : null;

    if (!productCode) {
      const nameCodeMatch = name.match(
        /\b(R[SP]CA\d{2}|B[SP]CA\d{2}|RPCA\d{2}|BPCA\d{2}|NR\d{2})\b/i,
      );
      if (nameCodeMatch)
        return { productCode: nameCodeMatch[1].toUpperCase(), thicknessMm, widthMm, lengthM };
      return null;
    }

    return { productCode, thicknessMm, widthMm, lengthM };
  }

  async autoCategorize(companyId: number): Promise<{
    categorized: number;
    total: number;
    categories: Record<string, number>;
  }> {
    const available = await this.aiChatService.isAvailable();
    if (!available) {
      throw new Error("AI service is not available for categorization");
    }

    const uncategorized = await this.stockItemRepo.findUncategorizedForCompany(companyId);

    if (uncategorized.length === 0) {
      return { categorized: 0, total: 0, categories: {} };
    }

    const categoryCounts: Record<string, number> = {};
    let categorized = 0;

    const allLearnings =
      await this.nixLearningRepo.findActiveCorrectionsByCategory("stock_categorization");
    const learnedMap = new Map<string, string>();
    for (const l of allLearnings) {
      const name = (l.context?.itemName || l.originalValue || "").toLowerCase().trim();
      if (name) {
        learnedMap.set(name, l.learnedValue);
      }
    }

    const needsAi: typeof uncategorized = [];
    for (const item of uncategorized) {
      const learned = learnedMap.get(item.name.toLowerCase().trim());
      if (learned) {
        await this.stockItemRepo.updateByIdForCompany(item.id, companyId, { category: learned });
        const count = categoryCounts[learned] || 0;
        categoryCounts[learned] = count + 1;
        categorized++;
      } else {
        needsAi.push(item);
      }
    }

    const existingCategories = await this.categories(companyId);

    const BATCH_SIZE = 50;

    for (let i = 0; i < needsAi.length; i += BATCH_SIZE) {
      const batch = needsAi.slice(i, i + BATCH_SIZE);
      const itemNames = batch.map((item) => `${item.id}:${item.name}`);

      const learnedExamples = Array.from(learnedMap.entries())
        .slice(0, 20)
        .map(([name, cat]) => `"${name}" → "${cat}"`)
        .join("; ");

      const systemPrompt = [
        "You are a stock inventory categorization assistant for an industrial rubber lining and coating company.",
        "Analyze item names and assign each to a category.",
        existingCategories.length > 0
          ? `Prefer using existing categories: ${existingCategories.join(", ")}.`
          : "Create sensible general categories (e.g., Rollers, Grinding Discs, Brushes, Rubber Sheets, Adhesives, Solvents, PPE, Tools, Paint, Hardware, Consumables).",
        learnedExamples.length > 0
          ? `Here are examples of user-confirmed categorizations: ${learnedExamples}.`
          : "",
        "For items that don't fit existing categories, suggest a new appropriate category name.",
        "Keep category names short (1-2 words), capitalised, and consistent.",
        "Return a JSON object mapping each item ID (the number before the colon) to its category.",
        "Respond with JSON only, no markdown fences.",
      ]
        .filter((s) => s.length > 0)
        .join(" ");

      const userMessage = `Categorize these inventory items (format is id:name): ${JSON.stringify(itemNames)}`;

      try {
        const { content } = await this.aiChatService.chat(
          [{ role: "user", content: userMessage }],
          systemPrompt,
        );

        const cleaned = content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        const parsed = JSON.parse(cleaned) as Record<string, string>;

        const updates = Object.entries(parsed)
          .filter(([, category]) => typeof category === "string" && category.trim().length > 0)
          .map(([idStr, category]) => ({
            id: Number(idStr),
            category: category.trim(),
          }))
          .filter((u) => !Number.isNaN(u.id));

        for (const update of updates) {
          await this.stockItemRepo.updateByIdForCompany(update.id, companyId, {
            category: update.category,
          });
          const count = categoryCounts[update.category] || 0;
          categoryCounts[update.category] = count + 1;
          categorized++;
        }

        if (i + BATCH_SIZE < needsAi.length) {
          existingCategories.push(
            ...Object.values(parsed).filter(
              (c) =>
                typeof c === "string" &&
                c.trim().length > 0 &&
                !existingCategories.includes(c.trim()),
            ),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`AI category inference failed for batch starting at ${i}: ${message}`);
      }
    }

    this.logger.log(
      `Auto-categorize complete: ${categorized}/${uncategorized.length} items categorized`,
    );

    return { categorized, total: uncategorized.length, categories: categoryCounts };
  }

  private async recordCategoryLearning(
    itemName: string,
    newCategory: string,
    previousCategory: string | null,
  ): Promise<void> {
    const normalizedName = itemName.toLowerCase().trim();
    const patternKey = `category_assignment:${normalizedName.slice(0, 200)}`;

    const existing = await this.nixLearningRepo.findOneCorrectionByPatternKeyCategoryAndValue(
      patternKey,
      "stock_categorization",
      newCategory,
    );

    if (existing) {
      existing.confirmationCount += 1;
      existing.confidence = Math.min(1, Number(existing.confidence) + 0.1);
      await this.nixLearningRepo.save(existing);
    } else {
      const learning = this.nixLearningRepo.build({
        learningType: LearningType.CORRECTION,
        source: LearningSource.USER_CORRECTION,
        category: "stock_categorization",
        patternKey,
        originalValue: previousCategory || itemName,
        learnedValue: newCategory,
        context: { itemName, previousCategory },
        confidence: 0.8,
        confirmationCount: 1,
        applicableProducts: ["stock_item"],
        isActive: true,
      });
      await this.nixLearningRepo.save(learning);
    }

    this.logger.log(`Recorded category learning: "${itemName}" → "${newCategory}"`);
  }

  private async learnedCategoryFor(itemName: string): Promise<string | null> {
    const normalizedName = itemName.toLowerCase().trim();
    const patternKey = `category_assignment:${normalizedName.slice(0, 200)}`;

    const exact = await this.nixLearningRepo.findActiveCorrectionByPatternKeyAndCategory(
      patternKey,
      "stock_categorization",
    );

    if (exact) return exact.learnedValue;

    return null;
  }

  private async inferCategoryForItem(companyId: number, item: StockItem): Promise<void> {
    const learned = await this.learnedCategoryFor(item.name);
    if (learned) {
      await this.stockItemRepo.updateByIdForCompany(item.id, companyId, { category: learned });
      this.logger.log(`Auto-categorized item ${item.id} from learning: "${learned}"`);
      return;
    }

    const available = await this.aiChatService.isAvailable();
    if (!available) return;

    const existingCategories = await this.categories(companyId);
    if (existingCategories.length === 0) return;

    const allLearnings = await this.nixLearningRepo.findActiveCorrectionsByCategoryTopByConfidence(
      "stock_categorization",
      50,
    );

    const examples = allLearnings
      .map((l) => {
        const name = l.context?.itemName || l.originalValue || "";
        return `"${name}" → "${l.learnedValue}"`;
      })
      .filter((e) => e.length > 6);

    const systemPrompt = [
      "You are a stock inventory categorization assistant for an industrial rubber lining and coating company.",
      `Available categories: ${existingCategories.join(", ")}.`,
      examples.length > 0
        ? `Here are examples of how items have been categorized before: ${examples.slice(0, 20).join("; ")}.`
        : "",
      "Assign the item to the most fitting existing category.",
      "Respond with the category name only, no explanation.",
    ]
      .filter((s) => s.length > 0)
      .join(" ");

    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: `Categorize this item: "${item.name}"` }],
        systemPrompt,
      );

      const category = content.replace(/['"]+/g, "").trim();
      if (category && category.length < 100) {
        await this.stockItemRepo.updateByIdForCompany(item.id, companyId, { category });
        this.logger.log(`Auto-categorized item ${item.id} via AI: "${category}"`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI categorize for item ${item.id} failed: ${message}`);
    }
  }
}
