import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard, JobCardStatus, JobCardWorkflowStatus } from "../entities/job-card.entity";
import { Requisition, RequisitionStatus } from "../entities/requisition.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockControlLocation } from "../entities/stock-control-location.entity";
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
    jobCardsRequisitionSent: number;
    jobCardsPendingAllocation: number;
    jobCardsPendingFinal: number;
    coatingPending: number;
    coatingAnalysed: number;
    requisitionsPending: number;
    requisitionsApproved: number;
    requisitionsOrdered: number;
  };
  outbound: {
    jobCardsReadyForDispatch: number;
    jobCardsDispatched: number;
    lowStockAlerts: number;
  };
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
    const jcCountByStatus = async (status: JobCardWorkflowStatus) =>
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
      jobCardsRequisitionSent,
      jobCardsPendingAllocation,
      jobCardsPendingFinal,
      coatingPending,
      coatingAnalysed,
      requisitionsPending,
      requisitionsApproved,
      requisitionsOrdered,
      jobCardsReadyForDispatch,
      jobCardsDispatched,
      lowStockAlerts,
    ] = await Promise.all([
      this.deliveryNoteRepo.count({
        where: { companyId, extractionStatus: null },
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
      jcCountByStatus(JobCardWorkflowStatus.DRAFT),
      jcCountByStatus(JobCardWorkflowStatus.DOCUMENT_UPLOADED),
      jcCountByStatus(JobCardWorkflowStatus.ADMIN_APPROVED),
      jcCountByStatus(JobCardWorkflowStatus.REQUISITION_SENT),
      jcCountByStatus(JobCardWorkflowStatus.MANAGER_APPROVED),
      jcCountByStatus(JobCardWorkflowStatus.STOCK_ALLOCATED),
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
      jcCountByStatus(JobCardWorkflowStatus.READY_FOR_DISPATCH),
      jcCountByStatus(JobCardWorkflowStatus.DISPATCHED),
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
        jobCardsRequisitionSent,
        jobCardsPendingAllocation,
        jobCardsPendingFinal,
        coatingPending,
        coatingAnalysed,
        requisitionsPending,
        requisitionsApproved,
        requisitionsOrdered,
      },
      outbound: {
        jobCardsReadyForDispatch,
        jobCardsDispatched,
        lowStockAlerts,
      },
    };
  }
}
