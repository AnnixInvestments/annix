import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";
import { DashboardPreference } from "../entities/dashboard-preference.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard, JobCardStatus, WORKFLOW_STATUS_DRAFT } from "../entities/job-card.entity";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";
import { Requisition, RequisitionStatus } from "../entities/requisition.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockControlLocation } from "../entities/stock-control-location.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";

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

export interface WorkflowLaneCounts {
  inbound: {
    deliveriesPending: number;
    deliveriesProcessed: number;
    invoicesPending: number;
    invoicesNeedClarification: number;
    invoicesAwaitingApproval: number;
  };
  workshop: {
    jobCardsDraft: number;
    jobCardsPendingAdmin: number;
    jobCardsPendingManager: number;
    jobCardsPendingAllocation: number;
    coatingPending: number;
    coatingAnalysed: number;
    requisitionsPending: number;
    requisitionsApproved: number;
    requisitionsOrdered: number;
  };
  outbound: {
    jobCardsDispatched: number;
    jobCardsFileClosed: number;
    lowStockAlerts: number;
  };
}

export interface StoremanDashboard {
  incomingDeliveries: number;
  dispatchReadyJobs: number;
  todayMovements: number;
  reorderAlerts: number;
}

export interface AccountsDashboard {
  pendingExtraction: number;
  processing: number;
  needsClarification: number;
  awaitingApproval: number;
  completedThisMonth: number;
  overdueInvoices: number;
}

export interface ManagerDashboard {
  pendingApprovals: number;
  activeJobs: number;
  overAllocations: number;
  dispatchReady: number;
  reorderAlerts: number;
}

export interface AdminDashboard {
  storeman: StoremanDashboard;
  accounts: AccountsDashboard;
  manager: ManagerDashboard;
  totalUsers: number;
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
    @InjectRepository(StockControlLocation)
    private readonly locationRepo: Repository<StockControlLocation>,
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(Requisition)
    private readonly requisitionRepo: Repository<Requisition>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(CpoCalloffRecord)
    private readonly calloffRepo: Repository<CpoCalloffRecord>,
    @InjectRepository(DashboardPreference)
    private readonly preferenceRepo: Repository<DashboardPreference>,
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
      .andWhere("item.min_stock_level > 0")
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

  async sohByLocation(
    companyId: number,
  ): Promise<{ location: string; totalQuantity: number; totalValue: number }[]> {
    const result = await this.stockItemRepo
      .createQueryBuilder("item")
      .leftJoin("item.locationEntity", "loc")
      .select("COALESCE(loc.name, item.location, 'Unassigned')", "location")
      .addSelect("SUM(item.quantity)", "totalQuantity")
      .addSelect("SUM(item.quantity * item.cost_per_unit)", "totalValue")
      .where("item.company_id = :companyId", { companyId })
      .groupBy("COALESCE(loc.name, item.location, 'Unassigned')")
      .orderBy("location", "ASC")
      .getRawMany();

    return result.map((r) => ({
      location: r.location,
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
      .andWhere("item.min_stock_level > 0")
      .andWhere("item.quantity <= item.min_stock_level")
      .orderBy("item.quantity", "ASC")
      .getMany();
  }

  async workflowLaneCounts(companyId: number): Promise<WorkflowLaneCounts> {
    const jcCountByStatus = async (status: string) =>
      this.jobCardRepo.count({
        where: {
          companyId,
          workflowStatus: status,
          status: In([JobCardStatus.ACTIVE, JobCardStatus.DRAFT]),
        },
      });

    const [
      deliveriesPending,
      deliveriesProcessed,
      invoicesPending,
      invoicesNeedClarification,
      invoicesAwaitingApproval,
      jobCardsDraft,
      jobCardsPendingAdmin,
      jobCardsPendingManager,
      jobCardsPendingAllocation,
      coatingPending,
      coatingAnalysed,
      requisitionsPending,
      requisitionsApproved,
      requisitionsOrdered,
      jobCardsDispatched,
      jobCardsFileClosed,
      lowStockAlerts,
    ] = await Promise.all([
      this.deliveryNoteRepo.count({
        where: { companyId, extractionStatus: IsNull() },
      }),
      this.deliveryNoteRepo.count({
        where: { companyId, extractionStatus: "completed" },
      }),
      this.invoiceRepo.count({
        where: {
          companyId,
          extractionStatus: In([
            InvoiceExtractionStatus.PENDING,
            InvoiceExtractionStatus.PROCESSING,
          ]),
        },
      }),
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.NEEDS_CLARIFICATION },
      }),
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.AWAITING_APPROVAL },
      }),
      jcCountByStatus(WORKFLOW_STATUS_DRAFT),
      jcCountByStatus("admin_approval"),
      jcCountByStatus("manager_approval"),
      jcCountByStatus("quality_check"),
      this.coatingRepo.count({
        where: { companyId, status: CoatingAnalysisStatus.PENDING },
      }),
      this.coatingRepo.count({
        where: { companyId, status: CoatingAnalysisStatus.ANALYSED },
      }),
      this.requisitionRepo.count({
        where: { companyId, status: RequisitionStatus.PENDING },
      }),
      this.requisitionRepo.count({
        where: { companyId, status: RequisitionStatus.APPROVED },
      }),
      this.requisitionRepo.count({
        where: { companyId, status: RequisitionStatus.ORDERED },
      }),
      jcCountByStatus("dispatched"),
      jcCountByStatus("file_closed"),
      this.stockItemRepo
        .createQueryBuilder("item")
        .where("item.company_id = :companyId", { companyId })
        .andWhere("item.min_stock_level > 0")
        .andWhere("item.quantity <= item.min_stock_level")
        .getCount(),
    ]);

    return {
      inbound: {
        deliveriesPending,
        deliveriesProcessed,
        invoicesPending,
        invoicesNeedClarification,
        invoicesAwaitingApproval,
      },
      workshop: {
        jobCardsDraft,
        jobCardsPendingAdmin,
        jobCardsPendingManager,
        jobCardsPendingAllocation,
        coatingPending,
        coatingAnalysed,
        requisitionsPending,
        requisitionsApproved,
        requisitionsOrdered,
      },
      outbound: {
        jobCardsDispatched,
        jobCardsFileClosed,
        lowStockAlerts,
      },
    };
  }

  async storemanSummary(companyId: number): Promise<StoremanDashboard> {
    const sevenDaysAgo = now().minus({ days: 7 }).toJSDate();
    const startOfToday = now().startOf("day").toJSDate();

    const [incomingDeliveries, dispatchReadyJobs, todayMovements, reorderAlerts] =
      await Promise.all([
        this.deliveryNoteRepo.count({
          where: { companyId, createdAt: MoreThanOrEqual(sevenDaysAgo) },
        }),
        this.jobCardRepo.count({
          where: {
            companyId,
            workflowStatus: "ready",
            status: In([JobCardStatus.ACTIVE, JobCardStatus.DRAFT]),
          },
        }),
        this.movementRepo.count({
          where: { companyId, createdAt: MoreThanOrEqual(startOfToday) },
        }),
        this.reorderAlertCount(companyId),
      ]);

    return { incomingDeliveries, dispatchReadyJobs, todayMovements, reorderAlerts };
  }

  async accountsSummary(companyId: number): Promise<AccountsDashboard> {
    const startOfMonth = now().startOf("month").toJSDate();
    const twentyOneDaysAgo = now().minus({ days: 21 }).toJSDate();

    const [
      pendingExtraction,
      processing,
      needsClarification,
      awaitingApproval,
      completedThisMonth,
      overdueInvoices,
    ] = await Promise.all([
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.PENDING },
      }),
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.PROCESSING },
      }),
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.NEEDS_CLARIFICATION },
      }),
      this.invoiceRepo.count({
        where: { companyId, extractionStatus: InvoiceExtractionStatus.AWAITING_APPROVAL },
      }),
      this.invoiceRepo.count({
        where: {
          companyId,
          extractionStatus: InvoiceExtractionStatus.COMPLETED,
          createdAt: MoreThanOrEqual(startOfMonth),
        },
      }),
      this.calloffRepo.count({
        where: {
          companyId,
          status: CalloffStatus.DELIVERED,
          deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        },
      }),
    ]);

    return {
      pendingExtraction,
      processing,
      needsClarification,
      awaitingApproval,
      completedThisMonth,
      overdueInvoices,
    };
  }

  async managerSummary(companyId: number): Promise<ManagerDashboard> {
    const [pendingApprovals, activeJobs, overAllocations, dispatchReady, reorderAlerts] =
      await Promise.all([
        this.approvalRepo.count({
          where: { companyId, status: ApprovalStatus.PENDING },
        }),
        this.jobCardRepo.count({
          where: { companyId, status: JobCardStatus.ACTIVE },
        }),
        this.stockItemRepo
          .createQueryBuilder("item")
          .innerJoin(
            (qb) =>
              qb
                .select("sa.stock_item_id", "stockItemId")
                .addSelect("SUM(sa.quantity_used)", "totalAllocated")
                .from(StockAllocation, "sa")
                .where("sa.company_id = :companyId", { companyId })
                .groupBy("sa.stock_item_id"),
            "alloc",
            'alloc."stockItemId" = item.id',
          )
          .where("item.company_id = :companyId", { companyId })
          .andWhere('alloc."totalAllocated" > item.quantity')
          .getCount(),
        this.jobCardRepo.count({
          where: {
            companyId,
            workflowStatus: "ready",
            status: In([JobCardStatus.ACTIVE, JobCardStatus.DRAFT]),
          },
        }),
        this.reorderAlertCount(companyId),
      ]);

    return { pendingApprovals, activeJobs, overAllocations, dispatchReady, reorderAlerts };
  }

  async adminSummary(companyId: number): Promise<AdminDashboard> {
    const [storeman, accounts, manager, totalUsers] = await Promise.all([
      this.storemanSummary(companyId),
      this.accountsSummary(companyId),
      this.managerSummary(companyId),
      this.userRepo.count({ where: { companyId } }),
    ]);

    return { storeman, accounts, manager, totalUsers };
  }

  async preferencesForUser(companyId: number, userId: number): Promise<DashboardPreference | null> {
    return this.preferenceRepo.findOne({ where: { companyId, userId } }) ?? null;
  }

  async updatePreferences(
    companyId: number,
    userId: number,
    data: Partial<
      Pick<DashboardPreference, "pinnedWidgets" | "hiddenWidgets" | "viewOverride" | "widgetOrder">
    >,
  ): Promise<DashboardPreference> {
    const existing = await this.preferenceRepo.findOne({ where: { companyId, userId } });

    if (existing) {
      const merged = this.preferenceRepo.merge(existing, data);
      return this.preferenceRepo.save(merged);
    }

    const created = this.preferenceRepo.create({ companyId, userId, ...data });
    return this.preferenceRepo.save(created);
  }

  private async reorderAlertCount(companyId: number): Promise<number> {
    return this.stockItemRepo
      .createQueryBuilder("item")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.min_stock_level > 0")
      .andWhere("item.quantity <= item.min_stock_level")
      .getCount();
  }
}
