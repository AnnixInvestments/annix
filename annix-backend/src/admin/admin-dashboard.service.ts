import { Injectable, Logger } from "@nestjs/common";
import { AuditLogRepository } from "../audit/audit.repository";
import { AuditAction, AuditLog } from "../audit/entities/audit-log.entity";
import { CustomerOnboardingRepository } from "../customer/customer-onboarding.repository";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { CustomerSessionRepository } from "../customer/customer-session.repository";
import { CustomerOnboardingStatus } from "../customer/entities/customer-onboarding.entity";
import { CustomerAccountStatus } from "../customer/entities/customer-profile.entity";
import { now } from "../lib/datetime";
import { RfqRepository } from "../rfq/rfq.repository";
import { SupplierOnboardingStatus } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierAccountStatus } from "../supplier/entities/supplier-profile.entity";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { SupplierSessionRepository } from "../supplier/supplier-session.repository";
import {
  AdminAttentionDto,
  AttentionItemDto,
  CustomerStatsDto,
  DashboardStatsDto,
  RecentActivityItemDto,
  SupplierStatsDto,
} from "./dto/admin-dashboard.dto";
import { AdminSessionRepository } from "./repositories/admin-session.repository";

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly customerProfileRepo: CustomerProfileRepository,
    private readonly customerOnboardingRepo: CustomerOnboardingRepository,
    private readonly customerSessionRepo: CustomerSessionRepository,
    private readonly supplierProfileRepo: SupplierProfileRepository,
    private readonly supplierOnboardingRepo: SupplierOnboardingRepository,
    private readonly supplierSessionRepo: SupplierSessionRepository,
    private readonly rfqRepo: RfqRepository,
    private readonly adminSessionRepo: AdminSessionRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    this.logger.log("Fetching dashboard statistics");

    const totalCustomers = await this.customerProfileRepo.count({
      accountStatus: CustomerAccountStatus.ACTIVE,
    });

    const totalSuppliers = await this.supplierProfileRepo.count({
      accountStatus: SupplierAccountStatus.ACTIVE,
    });

    const totalRfqs = await this.rfqRepo.count();

    const pendingCustomerApprovals = await this.customerOnboardingRepo.count({
      status: CustomerOnboardingStatus.UNDER_REVIEW,
    });

    const pendingSupplierApprovals = await this.supplierOnboardingRepo.count({
      status: SupplierOnboardingStatus.UNDER_REVIEW,
    });

    // Get recent activity (last 10 audit log entries)
    const recentActivity = await this.getRecentActivity(10);

    // Get active session counts - only count sessions with recent activity (last 30 minutes)
    const currentTime = now().toJSDate();
    const recentActivityThreshold = now().minus({ minutes: 30 }).toJSDate();

    const activeCustomerSessions = await this.customerSessionRepo.countActiveSince(
      currentTime,
      recentActivityThreshold,
    );

    const activeSupplierSessions = await this.supplierSessionRepo.countActiveSince(
      currentTime,
      recentActivityThreshold,
    );

    const activeAdminSessions = await this.adminSessionRepo.countActive(
      currentTime,
      recentActivityThreshold,
    );

    return {
      totalCustomers,
      totalSuppliers,
      totalRfqs,
      pendingApprovals: {
        customers: pendingCustomerApprovals,
        suppliers: pendingSupplierApprovals,
        total: pendingCustomerApprovals + pendingSupplierApprovals,
      },
      recentActivity,
      systemHealth: {
        activeCustomerSessions,
        activeSupplierSessions,
        activeAdminSessions,
      },
    };
  }

  /**
   * Per-app summary of items needing admin action, for the Global Apps badges
   * and the dashboard "Needs Attention" panel. Only the RFQ Platform has
   * defined attention sources so far; other apps are added as their sources
   * are identified.
   */
  async getAttentionSummary(): Promise<AdminAttentionDto> {
    const [
      submittedSuppliers,
      reviewSuppliers,
      submittedCustomers,
      reviewCustomers,
      draftSupplierDocReview,
      submittedSupplierDocReview,
      underReviewSupplierDocReview,
      draftCustomerDocReview,
      submittedCustomerDocReview,
      underReviewCustomerDocReview,
    ] = await Promise.all([
      this.supplierOnboardingRepo.count({ status: SupplierOnboardingStatus.SUBMITTED }),
      this.supplierOnboardingRepo.count({ status: SupplierOnboardingStatus.UNDER_REVIEW }),
      this.customerOnboardingRepo.count({ status: CustomerOnboardingStatus.SUBMITTED }),
      this.customerOnboardingRepo.count({ status: CustomerOnboardingStatus.UNDER_REVIEW }),
      this.supplierOnboardingRepo.count({
        status: SupplierOnboardingStatus.DRAFT,
        documentsNeedReview: true,
      }),
      this.supplierOnboardingRepo.count({
        status: SupplierOnboardingStatus.SUBMITTED,
        documentsNeedReview: true,
      }),
      this.supplierOnboardingRepo.count({
        status: SupplierOnboardingStatus.UNDER_REVIEW,
        documentsNeedReview: true,
      }),
      this.customerOnboardingRepo.count({
        status: CustomerOnboardingStatus.DRAFT,
        documentsNeedReview: true,
      }),
      this.customerOnboardingRepo.count({
        status: CustomerOnboardingStatus.SUBMITTED,
        documentsNeedReview: true,
      }),
      this.customerOnboardingRepo.count({
        status: CustomerOnboardingStatus.UNDER_REVIEW,
        documentsNeedReview: true,
      }),
    ]);

    const pendingSuppliers = submittedSuppliers + reviewSuppliers;
    const pendingCustomers = submittedCustomers + reviewCustomers;
    const supplierDocReview =
      draftSupplierDocReview + submittedSupplierDocReview + underReviewSupplierDocReview;
    const customerDocReview =
      draftCustomerDocReview + submittedCustomerDocReview + underReviewCustomerDocReview;

    const rfqItems: AttentionItemDto[] = [
      {
        label: "Suppliers awaiting approval",
        count: pendingSuppliers,
        href: "/admin/portal/suppliers",
        severity: "warning" as const,
      },
      {
        label: "Customers awaiting approval",
        count: pendingCustomers,
        href: "/admin/portal/customers",
        severity: "warning" as const,
      },
      {
        label: "Registrations with document mismatches",
        count: supplierDocReview + customerDocReview,
        href: "/admin/portal/approvals",
        severity: "urgent" as const,
      },
    ].filter((item) => item.count > 0);

    return {
      apps: [
        {
          appCode: "rfq",
          appName: "Annix Forge",
          total: rfqItems.reduce((sum, item) => sum + item.count, 0),
          items: rfqItems,
        },
      ],
    };
  }

  async getRecentActivity(limit: number = 20): Promise<RecentActivityItemDto[]> {
    const auditLogs = await this.auditLogRepo.findRecentWithPerformedBy(limit);

    return auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      userId: log.performedBy?.id ?? 0,
      userEmail: log.performedBy?.email || "Unknown",
      userName: log.performedBy?.username || "Unknown",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || 0,
      details: this.formatAuditDetails(log),
      clientIp: log.ipAddress || "",
    }));
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<CustomerStatsDto> {
    const [total, active, suspended, pendingReview, deactivated] = await Promise.all([
      this.customerProfileRepo.count(),
      this.customerProfileRepo.count({ accountStatus: CustomerAccountStatus.ACTIVE }),
      this.customerProfileRepo.count({ accountStatus: CustomerAccountStatus.SUSPENDED }),
      this.customerOnboardingRepo.count({ status: CustomerOnboardingStatus.UNDER_REVIEW }),
      this.customerProfileRepo.count({ accountStatus: CustomerAccountStatus.DEACTIVATED }),
    ]);

    return {
      total,
      active,
      suspended,
      pendingReview,
      deactivated,
    };
  }

  /**
   * Get supplier statistics
   */
  async getSupplierStats(): Promise<SupplierStatsDto> {
    const [total, active, suspended, pendingReview, deactivated] = await Promise.all([
      this.supplierProfileRepo.count(),
      this.supplierProfileRepo.count({ accountStatus: SupplierAccountStatus.ACTIVE }),
      this.supplierProfileRepo.count({ accountStatus: SupplierAccountStatus.SUSPENDED }),
      this.supplierOnboardingRepo.count({ status: SupplierOnboardingStatus.UNDER_REVIEW }),
      this.supplierProfileRepo.count({ accountStatus: SupplierAccountStatus.DEACTIVATED }),
    ]);

    return {
      total,
      active,
      suspended,
      pendingReview,
      deactivated,
    };
  }

  /**
   * Format audit log details for display
   */
  private formatAuditDetails(log: AuditLog): string {
    const newValues = log.newValues as any;

    if (newValues?.event) {
      return newValues.event;
    }

    if (log.action === AuditAction.CREATE) {
      return `Created ${log.entityType} #${log.entityId}`;
    }

    if (log.action === AuditAction.UPDATE) {
      return `Updated ${log.entityType} #${log.entityId}`;
    }

    if (log.action === AuditAction.DELETE) {
      return `Deleted ${log.entityType} #${log.entityId}`;
    }

    if (log.action === AuditAction.APPROVE) {
      return `Approved ${log.entityType} #${log.entityId}`;
    }

    if (log.action === AuditAction.REJECT) {
      return `Rejected ${log.entityType} #${log.entityId}`;
    }

    return `${log.action} on ${log.entityType}`;
  }
}
