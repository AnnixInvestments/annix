import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import { CustomerProfile, CustomerAccountStatus } from '../customer/entities/customer-profile.entity';
import { CustomerOnboarding } from '../customer/entities/customer-onboarding.entity';
import { CustomerOnboardingStatus } from '../customer/entities/customer-onboarding.entity';
import { CustomerSession } from '../customer/entities/customer-session.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { SupplierOnboarding } from '../supplier/entities/supplier-onboarding.entity';
import { SupplierOnboardingStatus } from '../supplier/entities/supplier-onboarding.entity';
import { SupplierAccountStatus } from '../supplier/entities/supplier-profile.entity';
import { SupplierSession } from '../supplier/entities/supplier-session.entity';
import { Rfq } from '../rfq/entities/rfq.entity';
import { AdminSession } from './entities/admin-session.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

import {
  DashboardStatsDto,
  RecentActivityItemDto,
  CustomerStatsDto,
  SupplierStatsDto,
} from './dto/admin-dashboard.dto';

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
    this.logger.log('Fetching dashboard statistics');

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

    // Get active session counts
    const now = new Date();
    const activeCustomerSessions = await this.customerSessionRepo.count({
      where: { expiresAt: MoreThan(now) },
    });

    const activeSupplierSessions = await this.supplierSessionRepo.count({
      where: { expiresAt: MoreThan(now) },
    });

    const activeAdminSessions = await this.adminSessionRepo.count({
      where: { isRevoked: false, expiresAt: MoreThan(now) },
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
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });

    return auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      userEmail: log.user?.email || 'Unknown',
      userName: log.user?.username || 'Unknown',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: this.formatAuditDetails(log),
      clientIp: log.ipAddress,
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

    if (log.action === 'CREATE') {
      return `Created ${log.entityType} #${log.entityId}`;
    }

    if (log.action === 'UPDATE') {
      return `Updated ${log.entityType} #${log.entityId}`;
    }

    if (log.action === 'DELETE') {
      return `Deleted ${log.entityType} #${log.entityId}`;
    }

    if (log.action === 'APPROVE') {
      return `Approved ${log.entityType} #${log.entityId}`;
    }

    if (log.action === 'REJECT') {
      return `Rejected ${log.entityType} #${log.entityId}`;
    }

    return `${log.action} on ${log.entityType}`;
  }
}
