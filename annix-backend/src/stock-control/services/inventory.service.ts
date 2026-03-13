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
            item.photoUrl = await this.storageService.getPresignedUrl(
              decodeURIComponent(pathMatch[1]),
              3600,
            );
          }
        } else if (!item.photoUrl.startsWith("http://") && !item.photoUrl.startsWith("https://")) {
          item.photoUrl = await this.storageService.getPresignedUrl(item.photoUrl, 3600);
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
    locationId?: number,
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
}
