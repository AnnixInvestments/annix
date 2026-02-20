import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";

export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  activeJobs: number;
}

export interface RecentActivity {
  id: number;
  movementType: string;
  quantity: number;
  itemName: string;
  itemSku: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
  ) {}

  async stats(companyId: number): Promise<DashboardStats> {
    const totalItems = await this.stockItemRepo.count({ where: { companyId } });

    const valueResult = await this.stockItemRepo
      .createQueryBuilder("item")
      .select("COALESCE(SUM(item.quantity * item.cost_per_unit), 0)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .getRawOne();

    const lowStockCount = await this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.quantity <= item.min_stock_level")
      .getCount();

    const activeJobs = await this.jobCardRepo.count({
      where: { status: JobCardStatus.ACTIVE, companyId },
    });

    return {
      totalItems,
      totalValue: Number(valueResult?.totalValue || 0),
      lowStockCount,
      activeJobs,
    };
  }

  async sohSummary(
    companyId: number,
  ): Promise<{ category: string; totalQuantity: number; totalValue: number }[]> {
    const result = await this.stockItemRepo
      .createQueryBuilder("item")
      .select("COALESCE(item.category, 'Uncategorized')", "category")
      .addSelect("SUM(item.quantity)", "totalQuantity")
      .addSelect("SUM(item.quantity * item.cost_per_unit)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .groupBy("COALESCE(item.category, 'Uncategorized')")
      .orderBy("category", "ASC")
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  async recentActivity(companyId: number, limit = 10): Promise<RecentActivity[]> {
    const movements = await this.movementRepo.find({
      where: { companyId },
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
    });

    return movements.map((m) => ({
      id: m.id,
      movementType: m.movementType,
      quantity: m.quantity,
      itemName: m.stockItem?.name || "Unknown",
      itemSku: m.stockItem?.sku || "Unknown",
      notes: m.notes,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
    }));
  }

  async reorderAlerts(companyId: number): Promise<StockItem[]> {
    return this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();
  }
}
