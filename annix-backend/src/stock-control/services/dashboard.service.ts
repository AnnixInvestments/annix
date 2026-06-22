import { Injectable } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { CoatingAnalysisStatus } from "../entities/coating-analysis.entity";
import { DashboardPreference } from "../entities/dashboard-preference.entity";
import { JobCardStatus, WORKFLOW_STATUS_DRAFT } from "../entities/job-card.entity";
import { ApprovalStatus } from "../entities/job-card-approval.entity";
import { RequisitionStatus } from "../entities/requisition.entity";
import { StockItem } from "../entities/stock-item.entity";
import { InvoiceExtractionStatus } from "../entities/supplier-invoice.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { CpoCalloffRecordRepository } from "../repositories/cpo-calloff-record.repository";
import { DashboardPreferenceRepository } from "../repositories/dashboard-preference.repository";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardApprovalRepository } from "../repositories/job-card-approval.repository";
import { RequisitionRepository } from "../repositories/requisition.repository";
import { StockControlLocationRepository } from "../repositories/stock-control-location.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";

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
    private readonly stockItemRepo: StockItemRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly locationRepo: StockControlLocationRepository,
    private readonly deliveryNoteRepo: DeliveryNoteRepository,
    private readonly invoiceRepo: SupplierInvoiceRepository,
    private readonly requisitionRepo: RequisitionRepository,
    private readonly coatingRepo: JobCardCoatingAnalysisRepository,
    private readonly approvalRepo: JobCardApprovalRepository,
    private readonly userRepo: StockControlUserRepository,
    private readonly calloffRepo: CpoCalloffRecordRepository,
    private readonly preferenceRepo: DashboardPreferenceRepository,
  ) {}

  async stats(companyId: number): Promise<DashboardStats> {
    const totalItems = await this.stockItemRepo.count({ companyId });

    const totalValue = await this.stockItemRepo.totalValueForCompany(companyId);

    const lowStockCount = await this.stockItemRepo.lowStockCountForCompany(companyId);

    const activeJobs = await this.jobCardRepo.countByStatus(companyId, JobCardStatus.ACTIVE);

    return {
      totalItems,
      totalValue,
      lowStockCount,
      activeJobs,
    };
  }

  async sohSummary(
    companyId: number,
  ): Promise<{ category: string; totalQuantity: number; totalValue: number }[]> {
    return this.stockItemRepo.sohSummaryForCompany(companyId);
  }

  async sohByLocation(
    companyId: number,
  ): Promise<{ location: string; totalQuantity: number; totalValue: number }[]> {
    return this.stockItemRepo.sohByLocationForCompany(companyId);
  }

  async recentActivity(companyId: number, limit = 10): Promise<RecentActivity[]> {
    const movements = await this.movementRepo.recentActivityForCompany(companyId, limit);

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
    return this.stockItemRepo.reorderAlertsForCompany(companyId, 100);
  }

  async workflowLaneCounts(companyId: number): Promise<WorkflowLaneCounts> {
    const jcCountByStatus = async (status: string) =>
      this.jobCardRepo.countByWorkflowStatusAndStatuses(companyId, status, [
        JobCardStatus.ACTIVE,
        JobCardStatus.DRAFT,
      ]);

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
      this.deliveryNoteRepo.countPendingExtraction(companyId),
      this.deliveryNoteRepo.countCompletedExtraction(companyId),
      this.invoiceRepo.countByExtractionStatusesForCompany(companyId, [
        InvoiceExtractionStatus.PENDING,
        InvoiceExtractionStatus.PROCESSING,
      ]),
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.NEEDS_CLARIFICATION,
      ),
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.AWAITING_APPROVAL,
      ),
      jcCountByStatus(WORKFLOW_STATUS_DRAFT),
      jcCountByStatus("admin_approval"),
      jcCountByStatus("manager_approval"),
      jcCountByStatus("quality_check"),
      this.coatingRepo.countByStatus(companyId, CoatingAnalysisStatus.PENDING),
      this.coatingRepo.countByStatus(companyId, CoatingAnalysisStatus.ANALYSED),
      this.requisitionRepo.count({ companyId, status: RequisitionStatus.PENDING }),
      this.requisitionRepo.count({ companyId, status: RequisitionStatus.APPROVED }),
      this.requisitionRepo.count({ companyId, status: RequisitionStatus.ORDERED }),
      jcCountByStatus("dispatched"),
      jcCountByStatus("file_closed"),
      this.stockItemRepo.lowStockCountForCompany(companyId),
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
        this.deliveryNoteRepo.countCreatedSince(companyId, sevenDaysAgo),
        this.jobCardRepo.countByWorkflowStatusAndStatuses(companyId, "ready", [
          JobCardStatus.ACTIVE,
          JobCardStatus.DRAFT,
        ]),
        this.movementRepo.countCreatedSinceForCompany(companyId, startOfToday),
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
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.PENDING,
      ),
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.PROCESSING,
      ),
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.NEEDS_CLARIFICATION,
      ),
      this.invoiceRepo.countByExtractionStatusForCompany(
        companyId,
        InvoiceExtractionStatus.AWAITING_APPROVAL,
      ),
      this.invoiceRepo.countCompletedSinceForCompany(companyId, startOfMonth),
      this.calloffRepo.countOverdueDelivered(companyId, twentyOneDaysAgo),
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
        this.approvalRepo.countByStatus(companyId, ApprovalStatus.PENDING),
        this.jobCardRepo.countByStatus(companyId, JobCardStatus.ACTIVE),
        this.stockItemRepo.overAllocationCountForCompany(companyId),
        this.jobCardRepo.countByWorkflowStatusAndStatuses(companyId, "ready", [
          JobCardStatus.ACTIVE,
          JobCardStatus.DRAFT,
        ]),
        this.reorderAlertCount(companyId),
      ]);

    return { pendingApprovals, activeJobs, overAllocations, dispatchReady, reorderAlerts };
  }

  async adminSummary(companyId: number): Promise<AdminDashboard> {
    const [storeman, accounts, manager, totalUsers] = await Promise.all([
      this.storemanSummary(companyId),
      this.accountsSummary(companyId),
      this.managerSummary(companyId),
      this.userRepo.countForCompany(companyId),
    ]);

    return { storeman, accounts, manager, totalUsers };
  }

  async preferencesForUser(companyId: number, userId: number): Promise<DashboardPreference | null> {
    return (await this.preferenceRepo.findOneForUser(companyId, userId)) ?? null;
  }

  async updatePreferences(
    companyId: number,
    userId: number,
    data: Partial<
      Pick<DashboardPreference, "pinnedWidgets" | "hiddenWidgets" | "viewOverride" | "widgetOrder">
    >,
  ): Promise<DashboardPreference> {
    const existing = await this.preferenceRepo.findOneForUser(companyId, userId);

    if (existing) {
      const merged = Object.assign(existing, data);
      return this.preferenceRepo.saveForCompany(companyId, merged);
    }

    return this.preferenceRepo.create({ companyId, userId, ...data });
  }

  private async reorderAlertCount(companyId: number): Promise<number> {
    return this.stockItemRepo.reorderAlertCountForCompany(companyId);
  }
}
