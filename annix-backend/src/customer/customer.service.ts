import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { Rfq, RfqStatus } from "../rfq/entities/rfq.entity";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { User } from "../user/entities/user.entity";
import {
  ChangePasswordDto,
  CustomerProfileResponseDto,
  UpdateCompanyAddressDto,
  UpdateCustomerProfileDto,
} from "./dto";
import { CustomerCompany, CustomerDeviceBinding, CustomerProfile } from "./entities";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerDeviceBinding)
    private readonly deviceBindingRepo: Repository<CustomerDeviceBinding>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(RfqDraft)
    private readonly rfqDraftRepo: Repository<RfqDraft>,
  ) {}

  /**
   * Get customer profile with company and security info
   */
  async getProfile(customerId: number): Promise<CustomerProfileResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ["company", "deviceBindings", "user"],
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const activeBinding = profile.deviceBindings.find((b) => b.isActive && b.isPrimary);

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.user.email,
      jobTitle: profile.jobTitle,
      directPhone: profile.directPhone,
      mobilePhone: profile.mobilePhone,
      accountStatus: profile.accountStatus,
      createdAt: profile.createdAt,
      company: {
        id: profile.company.id,
        legalName: profile.company.legalName,
        tradingName: profile.company.tradingName,
        streetAddress: profile.company.streetAddress,
        city: profile.company.city,
        provinceState: profile.company.provinceState,
        postalCode: profile.company.postalCode,
        country: profile.company.country,
        primaryPhone: profile.company.primaryPhone,
      },
      security: {
        deviceBound: !!activeBinding,
        registeredIp: activeBinding?.registeredIp || "N/A",
        registeredAt: activeBinding?.createdAt || profile.createdAt,
      },
    };
  }

  /**
   * Get company details
   */
  async getCompany(customerId: number) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ["company"],
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    return profile.company;
  }

  /**
   * Update customer profile (limited fields only)
   */
  async updateProfile(
    customerId: number,
    dto: UpdateCustomerProfileDto,
    clientIp: string,
  ): Promise<CustomerProfileResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const oldValues = {
      jobTitle: profile.jobTitle,
      directPhone: profile.directPhone,
      mobilePhone: profile.mobilePhone,
    };

    // Update allowed fields only
    if (dto.jobTitle !== undefined) profile.jobTitle = dto.jobTitle;
    if (dto.directPhone !== undefined) profile.directPhone = dto.directPhone;
    if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;

    await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: "customer_profile",
      entityId: customerId,
      action: AuditAction.UPDATE,
      oldValues,
      newValues: dto,
      ipAddress: clientIp,
    });

    return this.getProfile(customerId);
  }

  /**
   * Update company address (limited fields)
   */
  async updateCompanyAddress(customerId: number, dto: UpdateCompanyAddressDto, clientIp: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ["company"],
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const company = profile.company;
    const oldValues = {
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.provinceState,
      postalCode: company.postalCode,
      primaryPhone: company.primaryPhone,
    };

    // Update allowed fields only
    if (dto.streetAddress !== undefined) company.streetAddress = dto.streetAddress;
    if (dto.city !== undefined) company.city = dto.city;
    if (dto.provinceState !== undefined) company.provinceState = dto.provinceState;
    if (dto.postalCode !== undefined) company.postalCode = dto.postalCode;
    if (dto.primaryPhone !== undefined) company.primaryPhone = dto.primaryPhone;

    await this.companyRepo.save(company);

    await this.auditService.log({
      entityType: "customer_company",
      entityId: company.id,
      action: AuditAction.UPDATE,
      oldValues,
      newValues: dto,
      ipAddress: clientIp,
    });

    return company;
  }

  /**
   * Change customer password
   */
  async changePassword(
    customerId: number,
    dto: ChangePasswordDto,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ["user"],
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const user = await this.userRepo.findOne({ where: { id: profile.userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    user.password = hashedPassword;
    user.salt = salt;
    await this.userRepo.save(user);

    await this.auditService.log({
      entityType: "customer_profile",
      entityId: customerId,
      action: AuditAction.UPDATE,
      newValues: { event: "password_changed" },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  }

  /**
   * Get dashboard data for customer
   */
  async getDashboard(customerId: number) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ["company", "deviceBindings", "sessions", "user"],
    });

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const activeBinding = profile.deviceBindings.find((b) => b.isActive && b.isPrimary);

    const lastSession = profile.sessions
      .filter((s) => s.isActive || s.invalidatedAt)
      .sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0))[0];

    const rfqStats = await this.rfqStatsForUser(profile.userId);
    const draftInfo = await this.activeDraftForUser(profile.userId);

    return {
      profile: {
        id: profile.id,
        name: `${profile.firstName} ${profile.lastName}`,
        email: profile.user?.email,
        jobTitle: profile.jobTitle,
        accountStatus: profile.accountStatus,
        memberSince: profile.createdAt,
      },
      company: {
        id: profile.company.id,
        name: profile.company.tradingName || profile.company.legalName,
        legalName: profile.company.legalName,
      },
      security: {
        deviceBound: !!activeBinding,
        registeredIp: activeBinding?.registeredIp,
        lastLogin: lastSession?.createdAt,
        lastActivity: lastSession?.lastActivity,
      },
      rfqStats,
      draftInfo,
    };
  }

  private async rfqStatsForUser(userId: number): Promise<{
    total: number;
    pending: number;
    quoted: number;
    accepted: number;
  }> {
    const rfqs = await this.rfqRepo.find({
      where: { createdBy: { id: userId } },
      select: ["id", "status"],
    });

    const statusCounts = rfqs.reduce(
      (acc, rfq) => {
        if (rfq.status !== RfqStatus.DRAFT) {
          acc.total += 1;
        }
        if (rfq.status === RfqStatus.PENDING) {
          acc.pending += 1;
        } else if (rfq.status === RfqStatus.QUOTED) {
          acc.quoted += 1;
        } else if (rfq.status === RfqStatus.ACCEPTED) {
          acc.accepted += 1;
        }
        return acc;
      },
      { total: 0, pending: 0, quoted: 0, accepted: 0 },
    );

    return statusCounts;
  }

  private async activeDraftForUser(userId: number): Promise<{
    hasDraft: boolean;
    draftId: number | null;
    projectName: string | null;
    completionPercentage: number;
    currentStep: number;
    lastUpdated: Date | null;
  } | null> {
    const draft = await this.rfqDraftRepo.findOne({
      where: { createdBy: { id: userId }, isConverted: false },
      order: { updatedAt: "DESC" },
    });

    if (!draft) {
      return null;
    }

    return {
      hasDraft: true,
      draftId: draft.id,
      projectName: draft.projectName || null,
      completionPercentage: draft.completionPercentage,
      currentStep: draft.currentStep,
      lastUpdated: draft.updatedAt,
    };
  }
}
