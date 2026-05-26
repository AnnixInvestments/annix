import { Injectable } from "@nestjs/common";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockIssuanceRepository } from "../repositories/stock-issuance.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";

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
    private readonly allocationRepo: StockAllocationRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly issuanceRepo: StockIssuanceRepository,
  ) {}

  async costByJob(companyId: number): Promise<CostByJob[]> {
    return this.allocationRepo.costByJob(companyId);
  }

  async stockValuation(companyId: number): Promise<{
    items: StockValuationItem[];
    totalValue: number;
  }> {
    const items = await this.stockItemRepo.findAllForCompanyOrderedByName(companyId);

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
    return this.movementRepo.movementHistoryForCompany(companyId, filters);
  }

  async staffStockReport(
    companyId: number,
    filters?: StaffStockFilters,
  ): Promise<StaffStockReportResult> {
    const anomalyThreshold = filters?.anomalyThreshold ?? 2.0;

    const rawResults = await this.issuanceRepo.staffStockReportRows(companyId, filters);

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
      const itemBreakdowns = await this.issuanceRepo.staffItemBreakdownRows(
        companyId,
        staffIds,
        filters,
      );

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
    return this.issuanceRepo.staffStockDetail(companyId, staffMemberId, filters);
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
