import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { AuditAction, AuditLog } from "../audit/entities/audit-log.entity";
import {
  CustomerOnboarding,
  CustomerOnboardingStatus,
} from "../customer/entities/customer-onboarding.entity";
import {
  CustomerAccountStatus,
  CustomerProfile,
} from "../customer/entities/customer-profile.entity";
import { CustomerSession } from "../customer/entities/customer-session.entity";
import { now } from "../lib/datetime";
import { Rfq } from "../rfq/entities/rfq.entity";
import {
  SupplierOnboarding,
  SupplierOnboardingStatus,
} from "../supplier/entities/supplier-onboarding.entity";
import {
  SupplierAccountStatus,
  SupplierProfile,
} from "../supplier/entities/supplier-profile.entity";
import { SupplierSession } from "../supplier/entities/supplier-session.entity";
import {
  CustomerStatsDto,
  DashboardStatsDto,
  RecentActivityItemDto,
  SupplierStatsDto,
} from "./dto/admin-dashboard.dto";
import { AdminSession } from "./entities/admin-session.entity";

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerOnboarding)
    private readonly customerOnboardingRepo: Repository<CustomerOnboarding>,
    @InjectRepository(CustomerSession)
    private readonly customerSessionRepo: Repository<CustomerSession>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    @InjectRepository(SupplierOnboarding)
    private readonly supplierOnboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierSession)
    private readonly supplierSessionRepo: Repository<SupplierSession>,
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(AdminSession)
    private readonly adminSessionRepo: Repository<AdminSession>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    this.logger.log("Fetching dashboard statistics");

    // Count customers (excluding deactivated)
    const totalCustomers = await this.customerProfileRepo.count({
      where: { accountStatus: CustomerAccountStatus.ACTIVE },
    });

    // Count suppliers (excluding deactivated)
    const totalSuppliers = await this.supplierProfileRepo.count({
      where: { accountStatus: SupplierAccountStatus.ACTIVE },
    });

    // Count total RFQs
    const totalRfqs = await this.rfqRepo.count();

    // Count pending customer approvals
    const pendingCustomerApprovals = await this.customerOnboardingRepo.count({
      where: { status: CustomerOnboardingStatus.UNDER_REVIEW },
    });

    // Count pending supplier approvals
    const pendingSupplierApprovals = await this.supplierOnboardingRepo.count({
      where: { status: SupplierOnboardingStatus.UNDER_REVIEW },
    });

    // Get recent activity (last 10 audit log entries)
    const recentActivity = await this.getRecentActivity(10);

    // Get active session counts - only count sessions with recent activity (last 30 minutes)
    const currentTime = now().toJSDate();
    const recentActivityThreshold = now().minus({ minutes: 30 }).toJSDate();

    const activeCustomerSessions = await this.customerSessionRepo.count({
      where: {
        isActive: true,
        expiresAt: MoreThan(currentTime),
        lastActivity: MoreThan(recentActivityThreshold),
      },
    });

    const activeSupplierSessions = await this.supplierSessionRepo.count({
      where: {
        isActive: true,
        expiresAt: MoreThan(currentTime),
        lastActivity: MoreThan(recentActivityThreshold),
      },
    });

    const activeAdminSessions = await this.adminSessionRepo.count({
      where: {
        isRevoked: false,
        expiresAt: MoreThan(currentTime),
        lastActiveAt: MoreThan(recentActivityThreshold),
      },
    });

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
   * Get recent activity from audit logs
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivityItemDto[]> {
    const auditLogs = await this.auditLogRepo.find({
      order: { timestamp: "DESC" },
      take: limit,
      relations: ["performedBy"],
    });

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
      this.customerProfileRepo.count({
        where: { accountStatus: CustomerAccountStatus.ACTIVE },
      }),
      this.customerProfileRepo.count({
        where: { accountStatus: CustomerAccountStatus.SUSPENDED },
      }),
      this.customerOnboardingRepo.count({
        where: { status: CustomerOnboardingStatus.UNDER_REVIEW },
      }),
      this.customerProfileRepo.count({
        where: { accountStatus: CustomerAccountStatus.DEACTIVATED },
      }),
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
      this.supplierProfileRepo.count({
        where: { accountStatus: SupplierAccountStatus.ACTIVE },
      }),
      this.supplierProfileRepo.count({
        where: { accountStatus: SupplierAccountStatus.SUSPENDED },
      }),
      this.supplierOnboardingRepo.count({
        where: { status: SupplierOnboardingStatus.UNDER_REVIEW },
      }),
      this.supplierProfileRepo.count({
        where: { accountStatus: SupplierAccountStatus.DEACTIVATED },
      }),
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
