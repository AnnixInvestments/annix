import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { Address, ContactDetails } from "../lib/value-objects";
import { CompanyRepository } from "../platform/company.repository";
import { RfqStatus } from "../rfq/entities/rfq.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { UserRepository } from "../user/user.repository";
import { CustomerProfileRepository } from "./customer-profile.repository";
import {
  ChangePasswordDto,
  CustomerProfileResponseDto,
  UpdateCompanyAddressDto,
  UpdateCustomerProfileDto,
} from "./dto";

@Injectable()
export class CustomerService {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly profileRepository: CustomerProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly auditService: AuditService,
    private readonly rfqRepo: RfqRepository,
    private readonly rfqDraftRepo: RfqDraftRepository,
  ) {}

  /**
   * Get customer profile with company and security info
   */
  async getProfile(customerId: number): Promise<CustomerProfileResponseDto> {
    const profile = await this.profileRepository.findById(customerId, [
      "company",
      "deviceBindings",
      "user",
    ]);

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
        legalName: profile.company.legalName || "",
        tradingName: profile.company.tradingName || "",
        streetAddress: profile.company.streetAddress || "",
        city: profile.company.city || "",
        provinceState: profile.company.province || "",
        postalCode: profile.company.postalCode || "",
        country: profile.company.country || "",
        primaryPhone: profile.company.phone || "",
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
    const profile = await this.profileRepository.findById(customerId, ["company"]);

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
    const profile = await this.profileRepository.findById(customerId);

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

    await this.profileRepository.save(profile);

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
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const company = profile.company;
    const oldValues = {
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.province,
      postalCode: company.postalCode,
      primaryPhone: company.phone,
    };

    // Update allowed fields only (normalize via shared value-objects)
    const address = Address.fromParts({
      streetAddress: dto.streetAddress ?? company.streetAddress,
      city: dto.city ?? company.city,
      province: dto.provinceState ?? company.province,
      postalCode: dto.postalCode ?? company.postalCode,
    });
    const contact = ContactDetails.fromParts({
      phone: dto.primaryPhone ?? company.phone,
    });
    if (dto.streetAddress !== undefined) company.streetAddress = address.streetAddress;
    if (dto.city !== undefined) company.city = address.city;
    if (dto.provinceState !== undefined) company.province = address.province;
    if (dto.postalCode !== undefined) company.postalCode = address.postalCode;
    if (dto.primaryPhone !== undefined) company.phone = contact.phone;

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
    const profile = await this.profileRepository.findById(customerId, ["user"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const user = await this.userRepo.findById(profile.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash || "",
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    user.passwordHash = hashedPassword;
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
    const profile = await this.profileRepository.findById(customerId, [
      "company",
      "deviceBindings",
      "sessions",
      "user",
    ]);

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
    const rfqs = await this.rfqRepo.findStatusesByCreator(userId);

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
    const draft = await this.rfqDraftRepo.findLatestUnconvertedForCreator(userId);

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
