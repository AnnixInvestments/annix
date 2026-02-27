import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
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

export interface StaffStockFilters {
  startDate?: string;
  endDate?: string;
  staffMemberId?: number;
  departmentId?: number;
  stockItemId?: number;
  anomalyThreshold?: number;
}

export interface StaffItemBreakdown {
  stockItemId: number;
  stockItemName: string;
  sku: string;
  category: string | null;
  totalQuantity: number;
  totalValue: number;
}

export interface StaffStockSummary {
  staffMemberId: number;
  staffName: string;
  employeeNumber: string | null;
  department: string | null;
  departmentId: number | null;
  totalQuantityReceived: number;
  totalValue: number;
  issuanceCount: number;
  anomalyScore: number;
  isAnomaly: boolean;
  items: StaffItemBreakdown[];
}

export interface StaffStockReportResult {
  summaries: StaffStockSummary[];
  totals: {
    totalStaff: number;
    totalQuantityIssued: number;
    totalValue: number;
    anomalyCount: number;
  };
  averagePerStaff: number;
  anomalyThreshold: number;
  standardDeviation: number;
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
    @InjectRepository(StockIssuance)
    private readonly issuanceRepo: Repository<StockIssuance>,
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

  async staffStockReport(
    companyId: number,
    filters?: StaffStockFilters,
  ): Promise<StaffStockReportResult> {
    const anomalyThreshold = filters?.anomalyThreshold ?? 2.0;

    const query = this.issuanceRepo
      .createQueryBuilder("i")
      .innerJoin("i.recipientStaff", "staff")
      .innerJoin("i.stockItem", "item")
      .select("staff.id", "staffMemberId")
      .addSelect("staff.name", "staffName")
      .addSelect("staff.employee_number", "employeeNumber")
      .addSelect("staff.department", "department")
      .addSelect("staff.department_id", "departmentId")
      .addSelect("SUM(i.quantity)", "totalQuantityReceived")
      .addSelect("SUM(i.quantity * item.cost_per_unit)", "totalValue")
      .addSelect("COUNT(i.id)", "issuanceCount")
      .where("i.company_id = :companyId", { companyId });

    if (filters?.startDate) {
      query.andWhere("i.issued_at >= :startDate", { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere("i.issued_at <= :endDate", { endDate: filters.endDate });
    }

    if (filters?.staffMemberId) {
      query.andWhere("i.recipient_staff_id = :staffMemberId", {
        staffMemberId: filters.staffMemberId,
      });
    }

    if (filters?.departmentId) {
      query.andWhere("staff.department_id = :departmentId", {
        departmentId: filters.departmentId,
      });
    }

    if (filters?.stockItemId) {
      query.andWhere("i.stock_item_id = :stockItemId", { stockItemId: filters.stockItemId });
    }

    query
      .groupBy("staff.id")
      .addGroupBy("staff.name")
      .addGroupBy("staff.employee_number")
      .addGroupBy("staff.department")
      .addGroupBy("staff.department_id")
      .orderBy('"totalQuantityReceived"', "DESC");

    const rawResults = await query.getRawMany();

    const staffSummaries: StaffStockSummary[] = rawResults.map((r) => ({
      staffMemberId: Number(r.staffMemberId),
      staffName: r.staffName,
      employeeNumber: r.employeeNumber,
      department: r.department,
      departmentId: r.departmentId ? Number(r.departmentId) : null,
      totalQuantityReceived: Number(r.totalQuantityReceived || 0),
      totalValue: Number(r.totalValue || 0),
      issuanceCount: Number(r.issuanceCount || 0),
      anomalyScore: 0,
      isAnomaly: false,
      items: [],
    }));

    const quantities = staffSummaries.map((s) => s.totalQuantityReceived);
    const { mean, stdDev } = this.calculateMeanAndStdDev(quantities);

    const summariesWithAnomalies = staffSummaries.map((summary) => {
      const zScore = stdDev > 0 ? (summary.totalQuantityReceived - mean) / stdDev : 0;
      return {
        ...summary,
        anomalyScore: Math.round(zScore * 100) / 100,
        isAnomaly: zScore > anomalyThreshold,
      };
    });

    const staffIds = summariesWithAnomalies.map((s) => s.staffMemberId);
    if (staffIds.length > 0) {
      const itemBreakdownQuery = this.issuanceRepo
        .createQueryBuilder("i")
        .innerJoin("i.stockItem", "item")
        .select("i.recipient_staff_id", "staffMemberId")
        .addSelect("item.id", "stockItemId")
        .addSelect("item.name", "stockItemName")
        .addSelect("item.sku", "sku")
        .addSelect("item.category", "category")
        .addSelect("SUM(i.quantity)", "totalQuantity")
        .addSelect("SUM(i.quantity * item.cost_per_unit)", "totalValue")
        .where("i.company_id = :companyId", { companyId })
        .andWhere("i.recipient_staff_id IN (:...staffIds)", { staffIds });

      if (filters?.startDate) {
        itemBreakdownQuery.andWhere("i.issued_at >= :startDate", { startDate: filters.startDate });
      }

      if (filters?.endDate) {
        itemBreakdownQuery.andWhere("i.issued_at <= :endDate", { endDate: filters.endDate });
      }

      if (filters?.stockItemId) {
        itemBreakdownQuery.andWhere("i.stock_item_id = :stockItemId", {
          stockItemId: filters.stockItemId,
        });
      }

      itemBreakdownQuery
        .groupBy("i.recipient_staff_id")
        .addGroupBy("item.id")
        .addGroupBy("item.name")
        .addGroupBy("item.sku")
        .addGroupBy("item.category");

      const itemBreakdowns = await itemBreakdownQuery.getRawMany();

      const breakdownsByStaff = itemBreakdowns.reduce<Record<number, StaffItemBreakdown[]>>(
        (acc, row) => {
          const staffId = Number(row.staffMemberId);
          const breakdown: StaffItemBreakdown = {
            stockItemId: Number(row.stockItemId),
            stockItemName: row.stockItemName,
            sku: row.sku,
            category: row.category,
            totalQuantity: Number(row.totalQuantity || 0),
            totalValue: Number(row.totalValue || 0),
          };
          if (!acc[staffId]) {
            acc[staffId] = [];
          }
          acc[staffId].push(breakdown);
          return acc;
        },
        {},
      );

      summariesWithAnomalies.forEach((summary) => {
        summary.items = breakdownsByStaff[summary.staffMemberId] || [];
      });
    }

    const totalQuantityIssued = summariesWithAnomalies.reduce(
      (sum, s) => sum + s.totalQuantityReceived,
      0,
    );
    const totalValue = summariesWithAnomalies.reduce((sum, s) => sum + s.totalValue, 0);
    const anomalyCount = summariesWithAnomalies.filter((s) => s.isAnomaly).length;

    return {
      summaries: summariesWithAnomalies,
      totals: {
        totalStaff: summariesWithAnomalies.length,
        totalQuantityIssued,
        totalValue,
        anomalyCount,
      },
      averagePerStaff: mean,
      anomalyThreshold,
      standardDeviation: stdDev,
    };
  }

  async staffStockDetail(
    companyId: number,
    staffMemberId: number,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<StockIssuance[]> {
    const query = this.issuanceRepo
      .createQueryBuilder("i")
      .leftJoinAndSelect("i.stockItem", "item")
      .leftJoinAndSelect("i.jobCard", "jobCard")
      .leftJoinAndSelect("i.issuerStaff", "issuer")
      .where("i.company_id = :companyId", { companyId })
      .andWhere("i.recipient_staff_id = :staffMemberId", { staffMemberId })
      .orderBy("i.issued_at", "DESC");

    if (filters?.startDate) {
      query.andWhere("i.issued_at >= :startDate", { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere("i.issued_at <= :endDate", { endDate: filters.endDate });
    }

    return query.getMany();
  }

  private calculateMeanAndStdDev(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    if (values.length === 1) {
      return { mean, stdDev: 0 };
    }

    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }
}
