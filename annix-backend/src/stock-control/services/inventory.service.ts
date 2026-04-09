import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { LearningSource, LearningType, NixLearning } from "../../nix/entities/nix-learning.entity";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
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
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(NixLearning)
    private readonly nixLearningRepo: Repository<NixLearning>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(DeliveryNoteItem)
    private readonly deliveryNoteItemRepo: Repository<DeliveryNoteItem>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockIssuance)
    private readonly issuanceRepo: Repository<StockIssuance>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly dataSource: DataSource,
    private readonly aiChatService: AiChatService,
    private readonly supplierService: DeliverySupplierService,
  ) {}

  async create(companyId: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = this.stockItemRepo.create({ ...data, companyId });
    const saved = await this.stockItemRepo.save(item);

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

    const qb = this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.companyId = :companyId", { companyId });

    if (filters?.category) {
      qb.andWhere("item.category = :category", { category: filters.category });
    }

    if (filters?.belowMinStock === "true") {
      qb.andWhere("item.quantity <= item.min_stock_level");
    }

    if (filters?.locationId === "null") {
      qb.andWhere("item.location_id IS NULL");
    } else if (filters?.locationId) {
      const parsedLocId = Number(filters.locationId);
      if (Number.isInteger(parsedLocId) && parsedLocId > 0) {
        qb.andWhere("item.location_id = :locationId", { locationId: parsedLocId });
      }
    }

    qb.orderBy("item.name", "ASC");
    if (limit > 0) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();

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
    const qb = this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.companyId = :companyId", { companyId })
      .andWhere(
        "(item.name ILIKE :search OR item.sku ILIKE :search OR item.description ILIKE :search)",
        { search: `%${search}%` },
      );

    if (belowMinStock) {
      qb.andWhere("item.quantity <= item.min_stock_level");
    }

    if (locationId === "null") {
      qb.andWhere("item.location_id IS NULL");
    } else if (locationId) {
      const parsedLocId = Number(locationId);
      if (Number.isInteger(parsedLocId) && parsedLocId > 0) {
        qb.andWhere("item.location_id = :locationId", { locationId: parsedLocId });
      }
    }

    qb.orderBy("item.name", "ASC");
    if (limit > 0) {
      qb.skip(skip).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  async findById(companyId: number, id: number): Promise<StockItem> {
    const item = await this.stockItemRepo.findOne({
      where: { id, companyId },
      relations: ["allocations", "movements"],
    });
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
    return this.stockItemRepo.find({
      where: { companyId, id: In(ids) },
      order: { name: "ASC" },
    });
  }

  async update(companyId: number, id: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const previousCategory = item.category;
    const storedPhotoUrl = item.photoUrl;
    Object.assign(item, data);
    if (!data.photoUrl) {
      item.photoUrl = storedPhotoUrl;
    }
    const saved = await this.stockItemRepo.save(item);

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
    await this.stockItemRepo.remove(item);
  }

  async lowStockAlerts(companyId: number): Promise<StockItem[]> {
    const items = await this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();

    return this.refreshPhotoUrls(items);
  }

  async categories(companyId: number): Promise<string[]> {
    const result = await this.stockItemRepo
      .createQueryBuilder("item")
      .select("DISTINCT item.category", "category")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.category IS NOT NULL")
      .orderBy("item.category", "ASC")
      .getRawMany();

    return result.map((r) => r.category);
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
    const queryBuilder = this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId });

    if (search) {
      queryBuilder.andWhere(
        "(item.name ILIKE :search OR item.sku ILIKE :search OR item.description ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (locationId) {
      queryBuilder.andWhere("item.location_id = :locationId", { locationId });
    }

    queryBuilder
      .orderBy("item.category", "ASC")
      .addOrderBy("item.name", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rawItems, total] = await queryBuilder.getManyAndCount();
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
    const learnings = await this.nixLearningRepo.find({
      where: {
        learningType: LearningType.CORRECTION,
        category: "delivery_stock_matching",
        isActive: true,
      },
      order: { confidence: "DESC", confirmationCount: "DESC" },
    });

    const skuMappings = learnings.filter((l) => l.patternKey.startsWith("delivery_sku_map:"));

    const stockItemIds = skuMappings
      .map((l) => Number(l.learnedValue))
      .filter((id) => !Number.isNaN(id) && id > 0);
    const stockItems =
      stockItemIds.length > 0
        ? await this.stockItemRepo.find({ where: { id: In(stockItemIds), companyId } })
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
    const learning = await this.nixLearningRepo.findOne({
      where: { id, category: "delivery_stock_matching" },
    });
    if (!learning) {
      throw new NotFoundException("Mapping not found");
    }
    learning.isActive = false;
    await this.nixLearningRepo.save(learning);
    return { deleted: true };
  }

  async detectDuplicates(companyId: number): Promise<DuplicateGroup[]> {
    const allItems = await this.stockItemRepo.find({
      where: { companyId },
      order: { name: "ASC" },
    });

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

      const strongMatches = candidates.filter((c) => c.score >= 0.6);
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetItem = await queryRunner.manager.findOne(StockItem, {
        where: { id: targetItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (!targetItem) {
        throw new NotFoundException("Target stock item not found");
      }

      const sourceItems = await queryRunner.manager.find(StockItem, {
        where: { id: In(sourceItemIds), companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (sourceItems.length !== sourceItemIds.length) {
        const foundIds = new Set(sourceItems.map((s) => s.id));
        const missing = sourceItemIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(`Source stock items not found: ${missing.join(", ")}`);
      }

      let quantityAdded = 0;
      let movementsTransferred = 0;

      for (const source of sourceItems) {
        quantityAdded += Number(source.quantity);

        const movedMovements = await queryRunner.manager.update(
          StockMovement,
          { stockItem: { id: source.id }, companyId },
          { stockItem: { id: targetItemId } as any },
        );
        movementsTransferred += movedMovements.affected || 0;

        await queryRunner.manager.update(
          DeliveryNoteItem,
          { stockItem: { id: source.id }, companyId },
          { stockItem: { id: targetItemId } as any },
        );

        await queryRunner.manager.update(
          StockAllocation,
          { stockItem: { id: source.id }, companyId },
          { stockItem: { id: targetItemId } as any },
        );

        await queryRunner.manager.update(
          StockIssuance,
          { stockItemId: source.id, companyId },
          { stockItemId: targetItemId },
        );

        const mergeMovement = queryRunner.manager.create(StockMovement, {
          stockItem: { id: targetItemId } as StockItem,
          movementType: MovementType.IN,
          quantity: Number(source.quantity),
          referenceType: ReferenceType.MANUAL,
          referenceId: source.id,
          notes: `Merged from "${source.name}" (SKU: ${source.sku}) — duplicate consolidation`,
          createdBy: mergedBy,
          companyId,
        });
        await queryRunner.manager.save(StockMovement, mergeMovement);

        await queryRunner.manager.remove(StockItem, source);

        this.logger.log(
          `Merged stock item "${source.name}" (id=${source.id}, qty=${source.quantity}) into "${targetItem.name}" (id=${targetItemId})`,
        );
      }

      targetItem.quantity = Number(targetItem.quantity) + quantityAdded;
      const saved = await queryRunner.manager.save(StockItem, targetItem);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Merge complete: ${sourceItems.length} items into "${targetItem.name}", total qty now ${saved.quantity}`,
      );

      return {
        targetItem: saved,
        mergedCount: sourceItems.length,
        quantityAdded,
        movementsTransferred,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async adjustQuantity(companyId: number, id: number, delta: number): Promise<StockItem> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(StockItem, {
        where: { id, companyId },
        lock: { mode: "pessimistic_write" },
      });
      if (!item) {
        throw new NotFoundException("Stock item not found");
      }

      item.quantity = Math.max(0, item.quantity + delta);
      const saved = await queryRunner.manager.save(StockItem, item);

      await queryRunner.commitTransaction();

      if (delta < 0 && saved.minStockLevel > 0 && saved.quantity < saved.minStockLevel) {
        this.requisitionService
          .createReorderRequisition(companyId, saved.id)
          .catch((err) =>
            this.logger.error(`Failed to create reorder requisition: ${err.message}`),
          );
      }

      const [refreshed] = await this.refreshPhotoUrls([{ ...saved }]);
      return refreshed;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async bulkCreate(companyId: number, items: Partial<StockItem>[]): Promise<StockItem[]> {
    const entities = items.map((data) => this.stockItemRepo.create({ ...data, companyId }));
    return this.stockItemRepo.save(entities);
  }

  async uploadPhoto(companyId: number, id: number, file: Express.Multer.File): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/inventory");
    item.photoUrl = result.path;
    const saved = await this.stockItemRepo.save(item);
    const [refreshed] = await this.refreshPhotoUrls([{ ...saved }]);
    return refreshed;
  }

  async backfillRubberRollStock(companyId: number): Promise<{
    diagnostics: {
      stockItemsWithRollPattern: number;
      rubberRollStockTotal: number;
      sampleStockItems: Array<{ id: number; name: string; sku: string }>;
      sampleRollStock: Array<{ rollNumber: string }>;
    };
    updated: number;
    details: Array<{ stockItemId: number; sku: string; extractedRoll: string; matched: boolean }>;
  }> {
    const candidateItems: Array<{ id: number; name: string; sku: string }> =
      await this.dataSource.query(
        `SELECT id, name, sku FROM stock_items
       WHERE company_id = $1
         AND roll_number IS NULL
         AND (name ~* 'ROLL[\\s#-]*(\\d{4,6})' OR sku ~* 'Roll\\s*#?\\s*(\\d{4,6})')
       LIMIT 200`,
        [companyId],
      );

    const rollStockCount: Array<{ count: string }> = await this.dataSource.query(
      "SELECT COUNT(*) as count FROM rubber_roll_stock",
    );

    const sampleRollStock: Array<{ roll_number: string }> = await this.dataSource.query(
      "SELECT roll_number FROM rubber_roll_stock ORDER BY id DESC LIMIT 10",
    );

    this.logger.log(
      `Backfill diagnostics: ${candidateItems.length} candidate stock items, ` +
        `${rollStockCount[0]?.count || 0} rubber_roll_stock rows, ` +
        `sample roll numbers: ${sampleRollStock.map((r) => r.roll_number).join(", ")}`,
    );

    const details: Array<{
      stockItemId: number;
      sku: string;
      extractedRoll: string;
      matched: boolean;
    }> = [];
    let updated = 0;

    for (const item of candidateItems) {
      const combined = `${item.name || ""} ${item.sku || ""}`;
      const match = combined.match(/ROLL[\s#-]*(\d{4,6})/i);
      if (!match) continue;

      const extractedRoll = match[1];

      const matchingRolls: Array<{
        roll_number: string;
        compound_name: string | null;
        compound_code: string | null;
        thickness_mm: number | null;
        width_mm: number | null;
        length_m: number | null;
      }> = await this.dataSource.query(
        `SELECT rrs.roll_number, rpc.name as compound_name, rpc.code as compound_code,
                rrs.thickness_mm, rrs.width_mm, rrs.length_m
         FROM rubber_roll_stock rrs
         LEFT JOIN rubber_product_coding rpc ON rpc.id = rrs.compound_coding_id
         WHERE rrs.roll_number = $1
            OR rrs.roll_number LIKE '%' || $1
            OR rrs.roll_number LIKE $1 || '%'`,
        [extractedRoll],
      );

      if (matchingRolls.length > 0) {
        const roll = matchingRolls[0];
        const dimensionParts = [
          roll.thickness_mm ? `${roll.thickness_mm}mm thick` : null,
          roll.width_mm ? `${roll.width_mm}mm wide` : null,
          roll.length_m ? `${roll.length_m}m long` : null,
        ].filter((p): p is string => p !== null);

        const enrichedSku = roll.compound_code
          ? `${roll.compound_code}-R${extractedRoll}`
          : item.sku;
        const rollLabel = `Roll #${extractedRoll}`;
        const description =
          dimensionParts.length > 0 ? `${rollLabel} — ${dimensionParts.join(" x ")}` : rollLabel;

        await this.dataSource.query(
          `UPDATE stock_items SET
            name = COALESCE($2, name),
            sku = $3,
            description = CASE WHEN $4 != '' THEN $4 ELSE description END,
            category = 'RUBBER',
            compound_code = COALESCE($5, compound_code),
            thickness_mm = COALESCE($6, thickness_mm),
            width_mm = COALESCE($7, width_mm),
            length_m = COALESCE($8, length_m),
            roll_number = $9
           WHERE id = $1`,
          [
            item.id,
            roll.compound_name,
            enrichedSku,
            description,
            roll.compound_code,
            roll.thickness_mm,
            roll.width_mm,
            roll.length_m,
            roll.roll_number,
          ],
        );
        updated++;
        details.push({ stockItemId: item.id, sku: item.sku, extractedRoll, matched: true });
      } else {
        this.logger.log(
          `No rubber_roll_stock match for extracted roll "${extractedRoll}" (item ${item.id}: ${item.sku})`,
        );
        details.push({ stockItemId: item.id, sku: item.sku, extractedRoll, matched: false });
      }
    }

    this.logger.log(`Backfill complete: ${updated}/${candidateItems.length} items enriched`);

    return {
      diagnostics: {
        stockItemsWithRollPattern: candidateItems.length,
        rubberRollStockTotal: Number(rollStockCount[0]?.count || 0),
        sampleStockItems: candidateItems.slice(0, 5),
        sampleRollStock: sampleRollStock.map((r) => ({ rollNumber: r.roll_number })),
      },
      updated,
      details,
    };
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
    const rubberItems = await this.stockItemRepo.find({
      where: { companyId, category: "RUBBER" },
      order: { name: "ASC" },
    });

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

      await this.stockItemRepo.update({ id: item.id, companyId }, { name: newName, sku: newSku });

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

    const uncategorized = await this.stockItemRepo.find({
      where: { companyId, category: IsNull() },
      select: ["id", "name", "sku"],
      order: { name: "ASC" },
    });

    if (uncategorized.length === 0) {
      return { categorized: 0, total: 0, categories: {} };
    }

    const categoryCounts: Record<string, number> = {};
    let categorized = 0;

    const allLearnings = await this.nixLearningRepo.find({
      where: {
        learningType: LearningType.CORRECTION,
        category: "stock_categorization",
        isActive: true,
      },
    });
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
        await this.stockItemRepo.update({ id: item.id, companyId }, { category: learned });
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
          await this.stockItemRepo.update(
            { id: update.id, companyId },
            { category: update.category },
          );
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

    const existing = await this.nixLearningRepo.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category: "stock_categorization",
        learnedValue: newCategory,
      },
    });

    if (existing) {
      existing.confirmationCount += 1;
      existing.confidence = Math.min(1, Number(existing.confidence) + 0.1);
      await this.nixLearningRepo.save(existing);
    } else {
      const learning = this.nixLearningRepo.create({
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

    const exact = await this.nixLearningRepo.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category: "stock_categorization",
        isActive: true,
      },
      order: { confidence: "DESC", confirmationCount: "DESC" },
    });

    if (exact) return exact.learnedValue;

    return null;
  }

  private async inferCategoryForItem(companyId: number, item: StockItem): Promise<void> {
    const learned = await this.learnedCategoryFor(item.name);
    if (learned) {
      await this.stockItemRepo.update({ id: item.id, companyId }, { category: learned });
      this.logger.log(`Auto-categorized item ${item.id} from learning: "${learned}"`);
      return;
    }

    const available = await this.aiChatService.isAvailable();
    if (!available) return;

    const existingCategories = await this.categories(companyId);
    if (existingCategories.length === 0) return;

    const allLearnings = await this.nixLearningRepo.find({
      where: {
        learningType: LearningType.CORRECTION,
        category: "stock_categorization",
        isActive: true,
      },
      order: { confidence: "DESC" },
      take: 50,
    });

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
        await this.stockItemRepo.update({ id: item.id, companyId }, { category });
        this.logger.log(`Auto-categorized item ${item.id} via AI: "${category}"`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI categorize for item ${item.id} failed: ${message}`);
    }
  }
}
