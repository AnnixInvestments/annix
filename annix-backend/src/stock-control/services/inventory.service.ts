import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository } from "typeorm";
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
  ) {}

  async create(companyId: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = this.stockItemRepo.create({ ...data, companyId });
    return this.stockItemRepo.save(item);
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
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 50));
    const skip = (page - 1) * limit;

    if (filters?.search) {
      return this.searchItems(companyId, filters.search, skip, limit);
    }

    const where: Record<string, unknown> = { companyId };

    if (filters?.category) {
      where.category = filters.category;
    }

    const [items, total] = await this.stockItemRepo.findAndCount({
      where,
      order: { name: "ASC" },
      skip,
      take: limit,
    });

    if (filters?.belowMinStock === "true") {
      const lowStockItems = items.filter((item) => item.quantity <= item.minStockLevel);
      return { items: lowStockItems, total: lowStockItems.length };
    }

    return { items, total };
  }

  private async searchItems(
    companyId: number,
    search: string,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const [items, total] = await this.stockItemRepo.findAndCount({
      where: [
        { companyId, name: ILike(`%${search}%`) },
        { companyId, sku: ILike(`%${search}%`) },
        { companyId, description: ILike(`%${search}%`) },
      ],
      order: { name: "ASC" },
      skip,
      take: limit,
    });

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

  async findByIds(companyId: number, ids: number[]): Promise<StockItem[]> {
    return this.stockItemRepo.find({
      where: { companyId, id: In(ids) },
      order: { name: "ASC" },
    });
  }

  async update(companyId: number, id: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    Object.assign(item, data);
    const saved = await this.stockItemRepo.save(item);

    if (saved.minStockLevel > 0 && saved.quantity < saved.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, saved.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    return saved;
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

    return items;
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
  ): Promise<{ category: string; items: StockItem[] }[]> {
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

    queryBuilder.orderBy("item.category", "ASC").addOrderBy("item.name", "ASC");

    const allItems = await queryBuilder.getMany();

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
    if (uncategorizedIndex > 0) {
      const uncategorized = grouped[uncategorizedIndex];
      return [
        ...grouped.slice(0, uncategorizedIndex),
        ...grouped.slice(uncategorizedIndex + 1),
        uncategorized,
      ];
    }

    return grouped;
  }

  async adjustQuantity(companyId: number, id: number, delta: number): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    item.quantity = Math.max(0, item.quantity + delta);
    const saved = await this.stockItemRepo.save(item);

    if (delta < 0 && saved.minStockLevel > 0 && saved.quantity < saved.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, saved.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    return saved;
  }

  async bulkCreate(companyId: number, items: Partial<StockItem>[]): Promise<StockItem[]> {
    const entities = items.map((data) => this.stockItemRepo.create({ ...data, companyId }));
    return this.stockItemRepo.save(entities);
  }

  async uploadPhoto(companyId: number, id: number, file: Express.Multer.File): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    const result = await this.storageService.upload(file, "stock-control/inventory");
    item.photoUrl = result.url;
    return this.stockItemRepo.save(item);
  }
}
