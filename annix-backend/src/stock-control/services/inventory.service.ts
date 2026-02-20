import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { StockItem } from "../entities/stock-item.entity";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
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

  async update(companyId: number, id: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    Object.assign(item, data);
    return this.stockItemRepo.save(item);
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

  async adjustQuantity(companyId: number, id: number, delta: number): Promise<StockItem> {
    const item = await this.findById(companyId, id);
    item.quantity = Math.max(0, item.quantity + delta);
    return this.stockItemRepo.save(item);
  }

  async bulkCreate(companyId: number, items: Partial<StockItem>[]): Promise<StockItem[]> {
    const entities = items.map((data) => this.stockItemRepo.create({ ...data, companyId }));
    return this.stockItemRepo.save(entities);
  }
}
