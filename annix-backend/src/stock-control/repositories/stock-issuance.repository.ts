import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockIssuance } from "../entities/stock-issuance.entity";

export interface StaffStockFilters {
  startDate?: string;
  endDate?: string;
  staffMemberId?: number;
  departmentId?: number;
  stockItemId?: number;
}

export interface StaffStockReportRow {
  staffMemberId: string;
  staffName: string;
  employeeNumber: string | null;
  department: string | null;
  departmentId: string | null;
  totalQuantityReceived: string | null;
  totalValue: string | null;
  issuanceCount: string | null;
}

export interface StaffItemBreakdownRow {
  staffMemberId: string;
  stockItemId: string;
  stockItemName: string;
  sku: string;
  category: string | null;
  totalQuantity: string | null;
  totalValue: string | null;
}

export abstract class StockIssuanceRepository extends CrudRepository<StockIssuance> {
  abstract staffStockReportRows(
    companyId: number,
    filters: StaffStockFilters | undefined,
  ): Promise<StaffStockReportRow[]>;
  abstract staffItemBreakdownRows(
    companyId: number,
    staffIds: number[],
    filters: StaffStockFilters | undefined,
  ): Promise<StaffItemBreakdownRow[]>;
  abstract staffStockDetail(
    companyId: number,
    staffMemberId: number,
    filters: { startDate?: string; endDate?: string } | undefined,
  ): Promise<StockIssuance[]>;
}
