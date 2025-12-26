import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, In } from 'typeorm';

import {
  CustomerCompany,
  CustomerProfile,
  CustomerDeviceBinding,
  CustomerLoginAttempt,
  CustomerSession,
  CustomerAccountStatus,
  CustomerOnboarding,
  CustomerDocument,
} from './entities';
import { CustomerOnboardingStatus } from './entities/customer-onboarding.entity';
import { CustomerDocumentValidationStatus } from './entities/customer-document.entity';
import { SessionInvalidationReason } from './entities/customer-session.entity';
import {
  CustomerQueryDto,
  SuspendCustomerDto,
  ReactivateCustomerDto,
  ResetDeviceBindingDto,
  CustomerListResponseDto,
  CustomerDetailDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class CustomerAdminService {
  constructor(
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerDeviceBinding)
    private readonly deviceBindingRepo: Repository<CustomerDeviceBinding>,
    @InjectRepository(CustomerLoginAttempt)
    private readonly loginAttemptRepo: Repository<CustomerLoginAttempt>,
    @InjectRepository(CustomerSession)
    private readonly sessionRepo: Repository<CustomerSession>,
    @InjectRepository(CustomerOnboarding)
    private readonly onboardingRepo: Repository<CustomerOnboarding>,
    @InjectRepository(CustomerDocument)
    private readonly documentRepo: Repository<CustomerDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List all customers with filtering and pagination
   */
  async listCustomers(query: CustomerQueryDto): Promise<CustomerListResponseDto> {
    const { search, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.company', 'company')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.deviceBindings', 'deviceBinding', 'deviceBinding.isActive = true AND deviceBinding.isPrimary = true')
      .leftJoin('profile.sessions', 'session', 'session.isActive = true OR session.invalidatedAt IS NOT NULL');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(company.legalName ILIKE :search OR company.tradingName ILIKE :search OR user.email ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('profile.accountStatus = :status', { status });
    }

    // Sorting
    const validSortFields = ['createdAt', 'firstName', 'lastName', 'accountStatus'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`profile.${sortField}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [profiles, total] = await queryBuilder.getManyAndCount();

    const items = profiles.map((profile) => ({
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.user?.email || '',
      companyName: profile.company?.tradingName || profile.company?.legalName || '',
      accountStatus: profile.accountStatus,
      createdAt: profile.createdAt,
      lastLoginAt: null as Date | null, // Would need to query separately
      deviceBound: profile.deviceBindings?.length > 0,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed customer information
   */
  async getCustomerDetail(customerId: number): Promise<CustomerDetailDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company', 'user', 'deviceBindings'],
    });

    if (!profile) {
      throw new NotFoundException('Customer not found');
    }

    // Get recent login attempts
    const recentLogins = await this.loginAttemptRepo.find({
      where: { customerProfileId: customerId },
      order: { attemptTime: 'DESC' },
      take: 10,
    });

    const activeBinding = profile.deviceBindings.find(
      (b) => b.isActive && b.isPrimary,
    );

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.user?.email || '',
      jobTitle: profile.jobTitle,
      directPhone: profile.directPhone,
      mobilePhone: profile.mobilePhone,
      accountStatus: profile.accountStatus,
      suspensionReason: profile.suspensionReason,
      suspendedAt: profile.suspendedAt,
      createdAt: profile.createdAt,
      termsAcceptedAt: profile.termsAcceptedAt,
      company: {
        id: profile.company.id,
        legalName: profile.company.legalName,
        tradingName: profile.company.tradingName,
        registrationNumber: profile.company.registrationNumber,
        vatNumber: profile.company.vatNumber,
        industry: profile.company.industry,
        companySize: profile.company.companySize,
        streetAddress: profile.company.streetAddress,
        city: profile.company.city,
        provinceState: profile.company.provinceState,
        postalCode: profile.company.postalCode,
        country: profile.company.country,
        primaryPhone: profile.company.primaryPhone,
        generalEmail: profile.company.generalEmail,
        website: profile.company.website,
      },
      deviceBinding: activeBinding
        ? {
            id: activeBinding.id,
            deviceFingerprint: activeBinding.deviceFingerprint,
            registeredIp: activeBinding.registeredIp,
            ipCountry: activeBinding.ipCountry,
            browserInfo: activeBinding.browserInfo,
            createdAt: activeBinding.createdAt,
            isActive: activeBinding.isActive,
          }
        : null,
      recentLogins: recentLogins.map((login) => ({
        attemptTime: login.attemptTime,
        success: login.success,
        failureReason: login.failureReason,
        ipAddress: login.ipAddress,
        ipMismatchWarning: login.ipMismatchWarning,
      })),
    };
  }

  /**
   * Suspend a customer account
   */
  async suspendCustomer(
    customerId: number,
    dto: SuspendCustomerDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer not found');
    }

    if (profile.accountStatus === CustomerAccountStatus.SUSPENDED) {
      throw new BadRequestException('Account is already suspended');
    }

    const oldStatus = profile.accountStatus;

    profile.accountStatus = CustomerAccountStatus.SUSPENDED;
    profile.suspensionReason = dto.reason;
    profile.suspendedAt = new Date();
    profile.suspendedBy = adminUserId;

    await this.profileRepo.save(profile);

    // Invalidate all active sessions
    await this.sessionRepo.update(
      { customerProfileId: customerId, isActive: true },
      {
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: SessionInvalidationReason.ACCOUNT_SUSPENDED,
      },
    );

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: customerId,
      action: AuditAction.UPDATE,
      performedBy: adminUser || undefined,
      oldValues: { accountStatus: oldStatus },
      newValues: {
        accountStatus: CustomerAccountStatus.SUSPENDED,
        suspensionReason: dto.reason,
        event: 'account_suspended',
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Customer account suspended successfully',
    };
  }

  /**
   * Reactivate a suspended customer account
   */
  async reactivateCustomer(
    customerId: number,
    dto: ReactivateCustomerDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer not found');
    }

    if (profile.accountStatus === CustomerAccountStatus.ACTIVE) {
      throw new BadRequestException('Account is already active');
    }

    const oldStatus = profile.accountStatus;

    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    profile.suspensionReason = null;
    profile.suspendedAt = null;
    profile.suspendedBy = null;

    await this.profileRepo.save(profile);

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: customerId,
      action: AuditAction.UPDATE,
      performedBy: adminUser || undefined,
      oldValues: { accountStatus: oldStatus },
      newValues: {
        accountStatus: CustomerAccountStatus.ACTIVE,
        note: dto.note,
        event: 'account_reactivated',
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Customer account reactivated successfully',
    };
  }

  /**
   * Reset customer device binding (allows them to register new device)
   */
  async resetDeviceBinding(
    customerId: number,
    dto: ResetDeviceBindingDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['deviceBindings'],
    });

    if (!profile) {
      throw new NotFoundException('Customer not found');
    }

    const activeBinding = profile.deviceBindings.find(
      (b) => b.isActive && b.isPrimary,
    );

    if (!activeBinding) {
      throw new BadRequestException('No active device binding found');
    }

    // Deactivate the current binding
    activeBinding.isActive = false;
    activeBinding.deactivatedAt = new Date();
    activeBinding.deactivatedBy = adminUserId;
    activeBinding.deactivationReason = dto.reason;

    await this.deviceBindingRepo.save(activeBinding);

    // Invalidate all active sessions
    await this.sessionRepo.update(
      { customerProfileId: customerId, isActive: true },
      {
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: SessionInvalidationReason.DEVICE_RESET,
      },
    );

    // Update account status to pending so they need to re-bind device on next login
    profile.accountStatus = CustomerAccountStatus.PENDING;
    await this.profileRepo.save(profile);

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: customerId,
      action: AuditAction.UPDATE,
      performedBy: adminUser || undefined,
      newValues: {
        event: 'device_binding_reset',
        reason: dto.reason,
        oldDeviceFingerprint: activeBinding.deviceFingerprint.substring(0, 20) + '...',
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Device binding reset successfully. Customer will need to register new device on next login.',
    };
  }

  /**
   * Get login history for a customer
   */
  async getLoginHistory(customerId: number, limit: number = 50) {
    const attempts = await this.loginAttemptRepo.find({
      where: { customerProfileId: customerId },
      order: { attemptTime: 'DESC' },
      take: limit,
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      attemptTime: attempt.attemptTime,
      success: attempt.success,
      failureReason: attempt.failureReason,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      deviceFingerprint: attempt.deviceFingerprint?.substring(0, 20) + '...',
      ipMismatchWarning: attempt.ipMismatchWarning,
    }));
  }

  // ==================== REVIEW QUEUE METHODS ====================

  /**
   * Get customers pending onboarding review
   */
  async getPendingReviewCustomers() {
    const onboardings = await this.onboardingRepo.find({
      where: {
        status: In([CustomerOnboardingStatus.SUBMITTED, CustomerOnboardingStatus.UNDER_REVIEW]),
      },
      relations: ['customer', 'customer.company', 'customer.user'],
      order: { submittedAt: 'ASC' },
    });

    return onboardings.map(onb => ({
      id: onb.id,
      customerId: onb.customerId,
      status: onb.status,
      submittedAt: onb.submittedAt,
      resubmissionCount: onb.resubmissionCount,
      customer: {
        id: onb.customer.id,
        name: `${onb.customer.firstName} ${onb.customer.lastName}`,
        email: onb.customer.user?.email,
        companyName: onb.customer.company?.tradingName || onb.customer.company?.legalName,
      },
    }));
  }

  /**
   * Get onboarding details for review
   */
  async getOnboardingForReview(onboardingId: number) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { id: onboardingId },
      relations: ['customer', 'customer.company', 'customer.user', 'reviewedBy'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    const documents = await this.documentRepo.find({
      where: { customerId: onboarding.customerId },
    });

    return {
      id: onboarding.id,
      status: onboarding.status,
      submittedAt: onboarding.submittedAt,
      reviewedAt: onboarding.reviewedAt,
      reviewedBy: onboarding.reviewedBy
        ? `${onboarding.reviewedBy.username}`
        : null,
      rejectionReason: onboarding.rejectionReason,
      remediationSteps: onboarding.remediationSteps,
      resubmissionCount: onboarding.resubmissionCount,
      customer: {
        id: onboarding.customer.id,
        firstName: onboarding.customer.firstName,
        lastName: onboarding.customer.lastName,
        email: onboarding.customer.user?.email,
        jobTitle: onboarding.customer.jobTitle,
        directPhone: onboarding.customer.directPhone,
        mobilePhone: onboarding.customer.mobilePhone,
      },
      company: {
        id: onboarding.customer.company.id,
        legalName: onboarding.customer.company.legalName,
        tradingName: onboarding.customer.company.tradingName,
        registrationNumber: onboarding.customer.company.registrationNumber,
        vatNumber: onboarding.customer.company.vatNumber,
        industry: onboarding.customer.company.industry,
        streetAddress: onboarding.customer.company.streetAddress,
        city: onboarding.customer.company.city,
        provinceState: onboarding.customer.company.provinceState,
        postalCode: onboarding.customer.company.postalCode,
        country: onboarding.customer.company.country,
        primaryPhone: onboarding.customer.company.primaryPhone,
      },
      documents: documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: doc.uploadedAt,
        validationStatus: doc.validationStatus,
        validationNotes: doc.validationNotes,
        reviewedAt: doc.reviewedAt,
        expiryDate: doc.expiryDate,
      })),
    };
  }

  /**
   * Approve customer onboarding
   */
  async approveOnboarding(
    onboardingId: number,
    adminUserId: number,
    clientIp: string,
  ) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { id: onboardingId },
      relations: ['customer', 'customer.company', 'customer.user'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    if (![CustomerOnboardingStatus.SUBMITTED, CustomerOnboardingStatus.UNDER_REVIEW].includes(onboarding.status)) {
      throw new BadRequestException('Onboarding is not in a reviewable state');
    }

    // Validate all required documents are in acceptable state
    const documents = await this.documentRepo.find({
      where: { customerId: onboarding.customerId, isRequired: true },
    });

    const invalidDocuments = documents.filter(doc => {
      // Documents must be either VALID or MANUAL_REVIEW (with admin review completed)
      if (doc.validationStatus === CustomerDocumentValidationStatus.VALID) {
        return false; // Valid documents are OK
      }
      if (doc.validationStatus === CustomerDocumentValidationStatus.MANUAL_REVIEW && doc.reviewedById && doc.reviewedAt) {
        return false; // Manual review completed by admin is OK
      }
      return true; // All other states (PENDING, INVALID, FAILED, unreviewed MANUAL_REVIEW) are not OK
    });

    if (invalidDocuments.length > 0) {
      const docList = invalidDocuments
        .map(doc => `${doc.documentType} (${doc.validationStatus})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot approve onboarding. The following documents require review: ${docList}. ` +
        `Please review each document individually using the document review endpoint.`
      );
    }


    // Update onboarding
    onboarding.status = CustomerOnboardingStatus.APPROVED;
    onboarding.reviewedAt = new Date();
    onboarding.reviewedById = adminUserId;
    await this.onboardingRepo.save(onboarding);

    // Update profile to ACTIVE
    const profile = onboarding.customer;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Approve all documents
    await this.documentRepo.update(
      { customerId: onboarding.customerId, validationStatus: CustomerDocumentValidationStatus.PENDING },
      { validationStatus: CustomerDocumentValidationStatus.VALID, reviewedById: adminUserId, reviewedAt: new Date() },
    );

    // Send approval email
    await this.emailService.sendCustomerOnboardingApprovalEmail(
      profile.user.email,
      profile.company.tradingName || profile.company.legalName,
    );

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_onboarding',
      entityId: onboardingId,
      action: AuditAction.APPROVE,
      performedBy: adminUser || undefined,
      newValues: {
        status: CustomerOnboardingStatus.APPROVED,
        customerId: onboarding.customerId,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Customer onboarding approved successfully',
    };
  }

  /**
   * Reject customer onboarding
   */
  async rejectOnboarding(
    onboardingId: number,
    reason: string,
    remediationSteps: string,
    adminUserId: number,
    clientIp: string,
  ) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { id: onboardingId },
      relations: ['customer', 'customer.company', 'customer.user'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    if (![CustomerOnboardingStatus.SUBMITTED, CustomerOnboardingStatus.UNDER_REVIEW].includes(onboarding.status)) {
      throw new BadRequestException('Onboarding is not in a reviewable state');
    }

    // Update onboarding
    onboarding.status = CustomerOnboardingStatus.REJECTED;
    onboarding.reviewedAt = new Date();
    onboarding.reviewedById = adminUserId;
    onboarding.rejectionReason = reason;
    onboarding.remediationSteps = remediationSteps;
    await this.onboardingRepo.save(onboarding);

    // Send rejection email
    const profile = onboarding.customer;
    await this.emailService.sendCustomerOnboardingRejectionEmail(
      profile.user.email,
      profile.company.tradingName || profile.company.legalName,
      reason,
      remediationSteps,
    );

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_onboarding',
      entityId: onboardingId,
      action: AuditAction.REJECT,
      performedBy: adminUser || undefined,
      newValues: {
        status: CustomerOnboardingStatus.REJECTED,
        reason,
        remediationSteps,
        customerId: onboarding.customerId,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Customer onboarding rejected. Customer has been notified.',
    };
  }

  /**
   * Review a specific document
   */
  async reviewDocument(
    documentId: number,
    validationStatus: CustomerDocumentValidationStatus,
    validationNotes: string | null,
    adminUserId: number,
    clientIp: string,
  ) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.validationStatus = validationStatus;
    document.validationNotes = validationNotes;
    document.reviewedById = adminUserId;
    document.reviewedAt = new Date();
    await this.documentRepo.save(document);

    const adminUser = await this.userRepo.findOne({ where: { id: adminUserId } });
    await this.auditService.log({
      entityType: 'customer_document',
      entityId: documentId,
      action: AuditAction.UPDATE,
      performedBy: adminUser || undefined,
      newValues: {
        validationStatus,
        validationNotes,
        event: 'document_reviewed',
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      validationStatus,
      message: `Document marked as ${validationStatus}`,
    };
  }

  /**
   * Get customer documents for admin review
   */
  async getCustomerDocuments(customerId: number) {
    const documents = await this.documentRepo.find({
      where: { customerId },
      relations: ['reviewedBy'],
      order: { uploadedAt: 'DESC' },
    });

    return documents.map(doc => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt,
      validationStatus: doc.validationStatus,
      validationNotes: doc.validationNotes,
      reviewedAt: doc.reviewedAt,
      reviewedBy: doc.reviewedBy?.username,
      expiryDate: doc.expiryDate,
      isRequired: doc.isRequired,
    }));
  }
}
