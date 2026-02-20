import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, LessThanOrEqual, Repository } from "typeorm";
import { StockItem } from "../entities/stock-item.entity";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
  ) {}

  async create(data: Partial<StockItem>): Promise<StockItem> {
    const item = this.stockItemRepo.create(data);
    return this.stockItemRepo.save(item);
  }

  async findAll(filters?: {
    category?: string;
    belowMinStock?: string;
    search?: string;
    page?: string;
    limit?: string;
  }): Promise<{ items: StockItem[]; total: number }> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      return this.searchItems(filters.search, skip, limit);
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
    search: string,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const [items, total] = await this.stockItemRepo.findAndCount({
      where: [
        { name: ILike(`%${search}%`) },
        { sku: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
      ],
      order: { name: "ASC" },
      skip,
      take: limit,
    });

    return { items, total };
  }

  async findById(id: number): Promise<StockItem> {
    const item = await this.stockItemRepo.findOne({
      where: { id },
      relations: ["allocations", "movements"],
    });
    if (!item) {
      throw new NotFoundException("Stock item not found");
    }
    return item;
  }

  async update(id: number, data: Partial<StockItem>): Promise<StockItem> {
    const item = await this.findById(id);
    Object.assign(item, data);
    return this.stockItemRepo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findById(id);
    await this.stockItemRepo.remove(item);
  }

  async lowStockAlerts(): Promise<StockItem[]> {
    const items = await this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();

    return items;
  }

  async categories(): Promise<string[]> {
    const result = await this.stockItemRepo
      .createQueryBuilder("item")
      .select("DISTINCT item.category", "category")
      .where("item.category IS NOT NULL")
      .orderBy("item.category", "ASC")
      .getRawMany();

    return result.map((r) => r.category);
  }

  async adjustQuantity(id: number, delta: number): Promise<StockItem> {
    const item = await this.findById(id);
    item.quantity = Math.max(0, item.quantity + delta);
    return this.stockItemRepo.save(item);
  }

  async bulkCreate(items: Partial<StockItem>[]): Promise<StockItem[]> {
    const entities = items.map((data) => this.stockItemRepo.create(data));
    return this.stockItemRepo.save(entities);
  }
}
