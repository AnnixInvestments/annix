import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";

export interface CostByJob {
  jobCardId: number;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  totalCost: number;
  totalItemsAllocated: number;
}

export interface StockValuationItem {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  costPerUnit: number;
  totalValue: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
  ) {}

  async costByJob(companyId: number): Promise<CostByJob[]> {
    const result = await this.allocationRepo
      .createQueryBuilder("a")
      .innerJoin("a.jobCard", "j")
      .innerJoin("a.stockItem", "i")
      .select("j.id", "jobCardId")
      .addSelect("j.job_number", "jobNumber")
      .addSelect("j.job_name", "jobName")
      .addSelect("j.customer_name", "customerName")
      .addSelect("SUM(a.quantity_used * i.cost_per_unit)", "totalCost")
      .addSelect("SUM(a.quantity_used)", "totalItemsAllocated")
      .where("a.company_id = :companyId", { companyId })
      .groupBy("j.id")
      .addGroupBy("j.job_number")
      .addGroupBy("j.job_name")
      .addGroupBy("j.customer_name")
      .orderBy('"totalCost"', "DESC")
      .getRawMany();

    return result.map((r) => ({
      jobCardId: Number(r.jobCardId),
      jobNumber: r.jobNumber,
      jobName: r.jobName,
      customerName: r.customerName,
      totalCost: Number(r.totalCost || 0),
      totalItemsAllocated: Number(r.totalItemsAllocated || 0),
    }));
  }

  async stockValuation(companyId: number): Promise<{
    items: StockValuationItem[];
    totalValue: number;
  }> {
    const items = await this.stockItemRepo.find({
      where: { companyId },
      order: { name: "ASC" },
    });

    const valuationItems = items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      costPerUnit: Number(item.costPerUnit),
      totalValue: item.quantity * Number(item.costPerUnit),
    }));

    const totalValue = valuationItems.reduce((sum, item) => sum + item.totalValue, 0);

    return { items: valuationItems, totalValue };
  }

  async movementHistory(
    companyId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
      movementType?: string;
      stockItemId?: number;
    },
  ): Promise<StockMovement[]> {
    const query = this.movementRepo
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.stockItem", "item")
      .where("m.company_id = :companyId", { companyId })
      .orderBy("m.created_at", "DESC");

    if (filters?.startDate) {
      query.andWhere("m.created_at >= :startDate", { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere("m.created_at <= :endDate", { endDate: filters.endDate });
    }

    if (filters?.movementType) {
      query.andWhere("m.movement_type = :movementType", { movementType: filters.movementType });
    }

    if (filters?.stockItemId) {
      query.andWhere("m.stock_item_id = :stockItemId", { stockItemId: filters.stockItemId });
    }

    return query.take(500).getMany();
  }
}
