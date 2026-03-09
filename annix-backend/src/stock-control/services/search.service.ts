import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard } from "../entities/job-card.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockItem } from "../entities/stock-item.entity";
import { SupplierInvoice } from "../entities/supplier-invoice.entity";

export interface SearchResultItem {
  id: number;
  type: "job_card" | "stock_item" | "staff" | "delivery_note" | "invoice" | "purchase_order";
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  updatedAt: string | null;
  matchRank: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  query: string;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StaffMember)
    private readonly staffRepo: Repository<StaffMember>,
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
  ) {}

  async search(
    companyId: number,
    query: string,
    userRole: string,
    limit: number = 20,
  ): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return { results: [], totalCount: 0, query };
    }

    const searchPattern = `%${trimmed}%`;
    const exactPattern = trimmed;

    const searches = [
      this.searchJobCards(companyId, searchPattern, exactPattern, limit),
      this.searchStockItems(companyId, searchPattern, exactPattern, limit),
      this.searchStaff(companyId, searchPattern, exactPattern, limit),
      this.searchDeliveryNotes(companyId, searchPattern, exactPattern, limit),
      this.searchCpos(companyId, searchPattern, exactPattern, limit),
    ];

    const canViewInvoices = ["accounts", "manager", "admin"].includes(userRole);
    if (canViewInvoices) {
      searches.push(this.searchInvoices(companyId, searchPattern, exactPattern, limit));
    }

    const allResults = (await Promise.all(searches)).flat();

    const sorted = allResults
      .sort((a, b) => {
        if (a.matchRank !== b.matchRank) {
          return a.matchRank - b.matchRank;
        }
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    return { results: sorted, totalCount: allResults.length, query };
  }

  private async searchJobCards(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.jobCardRepo
      .createQueryBuilder("jc")
      .select([
        "jc.id",
        "jc.jobNumber",
        "jc.jcNumber",
        "jc.jobName",
        "jc.customerName",
        "jc.description",
        "jc.status",
        "jc.updatedAt",
      ])
      .where("jc.companyId = :companyId", { companyId })
      .andWhere(
        "(jc.jobNumber ILIKE :pattern OR jc.jcNumber ILIKE :pattern OR jc.jobName ILIKE :pattern OR jc.customerName ILIKE :pattern OR jc.description ILIKE :pattern OR jc.poNumber ILIKE :pattern)",
        { pattern },
      )
      .orderBy("jc.updatedAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((jc) => {
      const exactMatch =
        jc.jobNumber?.toLowerCase() === lowerExact ||
        jc.jcNumber?.toLowerCase() === lowerExact ||
        jc.jobName?.toLowerCase() === lowerExact;

      return {
        id: jc.id,
        type: "job_card" as const,
        title: `${jc.jobNumber}${jc.jcNumber ? ` / ${jc.jcNumber}` : ""} — ${jc.jobName}`,
        subtitle: [jc.customerName, jc.description].filter(Boolean).join(" · ") || null,
        status: jc.status,
        href: `/stock-control/portal/job-cards/${jc.id}`,
        updatedAt: jc.updatedAt?.toISOString() ?? null,
        matchRank: exactMatch ? 1 : 2,
      };
    });
  }

  private async searchStockItems(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.stockItemRepo
      .createQueryBuilder("si")
      .select([
        "si.id",
        "si.sku",
        "si.name",
        "si.description",
        "si.category",
        "si.quantity",
        "si.unitOfMeasure",
        "si.updatedAt",
      ])
      .where("si.companyId = :companyId", { companyId })
      .andWhere(
        "(si.name ILIKE :pattern OR si.sku ILIKE :pattern OR si.description ILIKE :pattern OR si.category ILIKE :pattern)",
        { pattern },
      )
      .orderBy("si.updatedAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((si) => {
      const exactMatch =
        si.sku?.toLowerCase() === lowerExact || si.name?.toLowerCase() === lowerExact;

      return {
        id: si.id,
        type: "stock_item" as const,
        title: `${si.sku} — ${si.name}`,
        subtitle:
          [si.category, `${si.quantity} ${si.unitOfMeasure}`].filter(Boolean).join(" · ") || null,
        status: null,
        href: `/stock-control/portal/inventory/${si.id}`,
        updatedAt: si.updatedAt?.toISOString() ?? null,
        matchRank: exactMatch ? 1 : 2,
      };
    });
  }

  private async searchStaff(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.staffRepo
      .createQueryBuilder("s")
      .select(["s.id", "s.name", "s.employeeNumber", "s.department", "s.active", "s.updatedAt"])
      .where("s.companyId = :companyId", { companyId })
      .andWhere(
        "(s.name ILIKE :pattern OR s.employeeNumber ILIKE :pattern OR s.department ILIKE :pattern)",
        { pattern },
      )
      .orderBy("s.updatedAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((s) => ({
      id: s.id,
      type: "staff" as const,
      title: s.name,
      subtitle: [s.employeeNumber, s.department].filter(Boolean).join(" · ") || null,
      status: s.active ? "active" : "inactive",
      href: `/stock-control/portal/staff/${s.id}`,
      updatedAt: s.updatedAt?.toISOString() ?? null,
      matchRank: s.name?.toLowerCase() === lowerExact ? 1 : 2,
    }));
  }

  private async searchDeliveryNotes(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.deliveryNoteRepo
      .createQueryBuilder("dn")
      .select(["dn.id", "dn.deliveryNumber", "dn.supplierName", "dn.notes", "dn.createdAt"])
      .where("dn.companyId = :companyId", { companyId })
      .andWhere(
        "(dn.deliveryNumber ILIKE :pattern OR dn.supplierName ILIKE :pattern OR dn.notes ILIKE :pattern)",
        { pattern },
      )
      .orderBy("dn.createdAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((dn) => ({
      id: dn.id,
      type: "delivery_note" as const,
      title: `DN ${dn.deliveryNumber}`,
      subtitle: dn.supplierName || null,
      status: null,
      href: `/stock-control/portal/deliveries/${dn.id}`,
      updatedAt: dn.createdAt?.toISOString() ?? null,
      matchRank: dn.deliveryNumber?.toLowerCase() === lowerExact ? 1 : 2,
    }));
  }

  private async searchInvoices(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder("inv")
      .select([
        "inv.id",
        "inv.invoiceNumber",
        "inv.supplierName",
        "inv.totalAmount",
        "inv.extractionStatus",
        "inv.updatedAt",
      ])
      .where("inv.companyId = :companyId", { companyId })
      .andWhere("(inv.invoiceNumber ILIKE :pattern OR inv.supplierName ILIKE :pattern)", {
        pattern,
      })
      .orderBy("inv.updatedAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      title: `Invoice ${inv.invoiceNumber}`,
      subtitle:
        [inv.supplierName, inv.totalAmount ? `R ${Number(inv.totalAmount).toFixed(2)}` : null]
          .filter(Boolean)
          .join(" · ") || null,
      status: inv.extractionStatus,
      href: `/stock-control/portal/invoices/${inv.id}`,
      updatedAt: inv.updatedAt?.toISOString() ?? null,
      matchRank: inv.invoiceNumber?.toLowerCase() === lowerExact ? 1 : 2,
    }));
  }

  private async searchCpos(
    companyId: number,
    pattern: string,
    exact: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.cpoRepo
      .createQueryBuilder("cpo")
      .select([
        "cpo.id",
        "cpo.cpoNumber",
        "cpo.jobNumber",
        "cpo.jobName",
        "cpo.customerName",
        "cpo.poNumber",
        "cpo.status",
        "cpo.updatedAt",
      ])
      .where("cpo.companyId = :companyId", { companyId })
      .andWhere(
        "(cpo.cpoNumber ILIKE :pattern OR cpo.jobNumber ILIKE :pattern OR cpo.jobName ILIKE :pattern OR cpo.customerName ILIKE :pattern OR cpo.poNumber ILIKE :pattern)",
        { pattern },
      )
      .orderBy("cpo.updatedAt", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    const lowerExact = exact.toLowerCase();

    return rows.map((cpo) => ({
      id: cpo.id,
      type: "purchase_order" as const,
      title: `CPO ${cpo.cpoNumber} — ${cpo.jobName || cpo.jobNumber}`,
      subtitle:
        [cpo.customerName, cpo.poNumber ? `PO: ${cpo.poNumber}` : null]
          .filter(Boolean)
          .join(" · ") || null,
      status: cpo.status,
      href: `/stock-control/portal/purchase-orders/${cpo.id}`,
      updatedAt: cpo.updatedAt?.toISOString() ?? null,
      matchRank:
        cpo.cpoNumber?.toLowerCase() === lowerExact || cpo.jobNumber?.toLowerCase() === lowerExact
          ? 1
          : 2,
    }));
  }
}
