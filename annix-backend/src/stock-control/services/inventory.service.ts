import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { StockItem } from "../entities/stock-item.entity";
import { RequisitionService } from "./requisition.service";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly dataSource: DataSource,
  ) {}

  async create(companyId: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = this.stockItemRepo.create({ ...data, companyId });
    return this.stockItemRepo.save(item);
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
    const storedPhotoUrl = item.photoUrl;
    Object.assign(item, data);
    if (!data.photoUrl) {
      item.photoUrl = storedPhotoUrl;
    }
    const saved = await this.stockItemRepo.save(item);

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
}
