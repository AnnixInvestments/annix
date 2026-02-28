import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockItem } from "../entities/stock-item.entity";
import { PriceChangeReason, StockPriceHistory } from "../entities/stock-price-history.entity";

@Injectable()
export class PriceHistoryService {
  constructor(
    @InjectRepository(StockPriceHistory)
    private readonly priceHistoryRepo: Repository<StockPriceHistory>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
  ) {}

  async historyForItem(companyId: number, stockItemId: number): Promise<StockPriceHistory[]> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: stockItemId, companyId },
    });

    if (!stockItem) {
      throw new NotFoundException(`Stock item ${stockItemId} not found`);
    }

    return this.priceHistoryRepo.find({
      where: { stockItemId, companyId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async recentChanges(companyId: number, limit = 20): Promise<StockPriceHistory[]> {
    return this.priceHistoryRepo.find({
      where: { companyId },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async recordManualChange(
    companyId: number,
    stockItemId: number,
    oldPrice: number | null,
    newPrice: number,
    changedBy: number,
  ): Promise<StockPriceHistory> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: stockItemId, companyId },
    });

    if (!stockItem) {
      throw new NotFoundException(`Stock item ${stockItemId} not found`);
    }

    const history = new StockPriceHistory();
    history.stockItemId = stockItemId;
    history.companyId = companyId;
    history.oldPrice = oldPrice;
    history.newPrice = newPrice;
    history.changeReason = PriceChangeReason.MANUAL;
    history.changedBy = changedBy;

    return this.priceHistoryRepo.save(history);
  }

  async priceStatistics(
    companyId: number,
    stockItemId: number,
  ): Promise<{
    currentPrice: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    priceChangeCount: number;
    lastChangeDate: Date | null;
  }> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: stockItemId, companyId },
    });

    if (!stockItem) {
      throw new NotFoundException(`Stock item ${stockItemId} not found`);
    }

    const history = await this.priceHistoryRepo.find({
      where: { stockItemId, companyId },
      order: { createdAt: "DESC" },
    });

    if (history.length === 0) {
      return {
        currentPrice: Number(stockItem.costPerUnit) || 0,
        averagePrice: Number(stockItem.costPerUnit) || 0,
        minPrice: Number(stockItem.costPerUnit) || 0,
        maxPrice: Number(stockItem.costPerUnit) || 0,
        priceChangeCount: 0,
        lastChangeDate: null,
      };
    }

    const prices = history.map((h) => Number(h.newPrice));
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      currentPrice: Number(stockItem.costPerUnit) || 0,
      averagePrice,
      minPrice,
      maxPrice,
      priceChangeCount: history.length,
      lastChangeDate: history[0]?.createdAt || null,
    };
  }
}
