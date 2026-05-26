import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockIssuance } from "../entities/stock-issuance.entity";
import {
  type StaffItemBreakdownRow,
  type StaffStockFilters,
  type StaffStockReportRow,
  StockIssuanceRepository,
} from "./stock-issuance.repository";

@Injectable()
export class PostgresStockIssuanceRepository
  extends TypeOrmCrudRepository<StockIssuance>
  implements StockIssuanceRepository
{
  constructor(@InjectRepository(StockIssuance) repository: Repository<StockIssuance>) {
    super(repository);
  }

  staffStockReportRows(
    companyId: number,
    filters: StaffStockFilters | undefined,
  ): Promise<StaffStockReportRow[]> {
    const query = this.repository
      .createQueryBuilder("i")
      .innerJoin("i.recipientStaff", "staff")
      .innerJoin("i.stockItem", "item")
      .leftJoin("staff.departmentEntity", "dept")
      .select("staff.id", "staffMemberId")
      .addSelect("staff.name", "staffName")
      .addSelect("staff.employee_number", "employeeNumber")
      .addSelect("COALESCE(dept.name, staff.department)", "department")
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
      .addGroupBy("dept.name")
      .orderBy('"totalQuantityReceived"', "DESC");

    return query.getRawMany();
  }

  staffItemBreakdownRows(
    companyId: number,
    staffIds: number[],
    filters: StaffStockFilters | undefined,
  ): Promise<StaffItemBreakdownRow[]> {
    const itemBreakdownQuery = this.repository
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

    return itemBreakdownQuery.getRawMany();
  }

  staffStockDetail(
    companyId: number,
    staffMemberId: number,
    filters: { startDate?: string; endDate?: string } | undefined,
  ): Promise<StockIssuance[]> {
    const query = this.repository
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
}
