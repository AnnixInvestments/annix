import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, In } from 'typeorm';

import { now } from '../lib/datetime';

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
import { S3StorageService } from '../storage/s3-storage.service';
import { SecureDocumentsService } from '../secure-documents/secure-documents.service';

@Injectable()
export class CustomerAdminService {
  private readonly logger = new Logger(CustomerAdminService.name);

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
    private readonly storageService: S3StorageService,
    private readonly secureDocumentsService: SecureDocumentsService,
  ) {}

  /**
   * List all customers with filtering and pagination
   */
  async listCustomers(
    query: CustomerQueryDto,
  ): Promise<CustomerListResponseDto> {
    const {
      search,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.company', 'company')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect(
        'profile.deviceBindings',
        'deviceBinding',
        'deviceBinding.isActive = true AND deviceBinding.isPrimary = true',
      )
      .leftJoin(
        'profile.sessions',
        'session',
        'session.isActive = true OR session.invalidatedAt IS NOT NULL',
      );

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
    const validSortFields = [
      'createdAt',
      'firstName',
      'lastName',
      'accountStatus',
    ];
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
      companyName:
        profile.company?.tradingName || profile.company?.legalName || '',
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

    const onboarding = await this.onboardingRepo.findOne({
      where: { customerId },
      relations: ['reviewedBy'],
    });

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
      onboarding: onboarding
        ? {
            id: onboarding.id,
            status: onboarding.status,
            submittedAt: onboarding.submittedAt,
            reviewedAt: onboarding.reviewedAt,
            reviewedByName: onboarding.reviewedBy
              ? `${onboarding.reviewedBy.firstName} ${onboarding.reviewedBy.lastName}`
              : null,
          }
        : null,
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
    profile.suspendedAt = now().toJSDate();
    profile.suspendedBy = adminUserId;

    await this.profileRepo.save(profile);

    // Invalidate all active sessions
    await this.sessionRepo.update(
      { customerProfileId: customerId, isActive: true },
      {
        isActive: false,
        invalidatedAt: now().toJSDate(),
        invalidationReason: SessionInvalidationReason.ACCOUNT_SUSPENDED,
      },
    );

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
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

    await this.secureDocumentsService.deactivateEntityFolder(
      'customer',
      customerId,
      `Account suspended: ${dto.reason}`,
    );

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

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
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

    await this.secureDocumentsService.reactivateEntityFolder('customer', customerId);

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
    activeBinding.deactivatedAt = now().toJSDate();
    activeBinding.deactivatedBy = adminUserId;
    activeBinding.deactivationReason = dto.reason;

    await this.deviceBindingRepo.save(activeBinding);

    // Invalidate all active sessions
    await this.sessionRepo.update(
      { customerProfileId: customerId, isActive: true },
      {
        isActive: false,
        invalidatedAt: now().toJSDate(),
        invalidationReason: SessionInvalidationReason.DEVICE_RESET,
      },
    );

    // Update account status to pending so they need to re-bind device on next login
    profile.accountStatus = CustomerAccountStatus.PENDING;
    await this.profileRepo.save(profile);

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: customerId,
      action: AuditAction.UPDATE,
      performedBy: adminUser || undefined,
      newValues: {
        event: 'device_binding_reset',
        reason: dto.reason,
        oldDeviceFingerprint:
          activeBinding.deviceFingerprint.substring(0, 20) + '...',
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message:
        'Device binding reset successfully. Customer will need to register new device on next login.',
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
        status: In([
          CustomerOnboardingStatus.SUBMITTED,
          CustomerOnboardingStatus.UNDER_REVIEW,
        ]),
      },
      relations: ['customer', 'customer.company', 'customer.user'],
      order: { submittedAt: 'ASC' },
    });

    return onboardings.map((onb) => ({
      id: onb.id,
      customerId: onb.customerId,
      status: onb.status,
      submittedAt: onb.submittedAt,
      resubmissionCount: onb.resubmissionCount,
      customer: {
        id: onb.customer.id,
        name: `${onb.customer.firstName} ${onb.customer.lastName}`,
        email: onb.customer.user?.email,
        companyName:
          onb.customer.company?.tradingName || onb.customer.company?.legalName,
      },
    }));
  }

  /**
   * Get onboarding details for review
   */
  async getOnboardingForReview(onboardingId: number) {
    const onboarding = await this.onboardingRepo.findOne({
      where: { id: onboardingId },
      relations: [
        'customer',
        'customer.company',
        'customer.user',
        'reviewedBy',
      ],
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
      documents: documents.map((doc) => ({
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

    if (
      ![
        CustomerOnboardingStatus.SUBMITTED,
        CustomerOnboardingStatus.UNDER_REVIEW,
      ].includes(onboarding.status)
    ) {
      throw new BadRequestException('Onboarding is not in a reviewable state');
    }

    // Validate all required documents are in acceptable state
    const documents = await this.documentRepo.find({
      where: { customerId: onboarding.customerId, isRequired: true },
    });

    const invalidDocuments = documents.filter((doc) => {
      // Documents must be either VALID or MANUAL_REVIEW (with admin review completed)
      if (doc.validationStatus === CustomerDocumentValidationStatus.VALID) {
        return false; // Valid documents are OK
      }
      if (
        doc.validationStatus ===
          CustomerDocumentValidationStatus.MANUAL_REVIEW &&
        doc.reviewedById &&
        doc.reviewedAt
      ) {
        return false; // Manual review completed by admin is OK
      }
      return true; // All other states (PENDING, INVALID, FAILED, unreviewed MANUAL_REVIEW) are not OK
    });

    if (invalidDocuments.length > 0) {
      const docList = invalidDocuments
        .map((doc) => `${doc.documentType} (${doc.validationStatus})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot approve onboarding. The following documents require review: ${docList}. ` +
          `Please review each document individually using the document review endpoint.`,
      );
    }

    // Update onboarding
    onboarding.status = CustomerOnboardingStatus.APPROVED;
    onboarding.reviewedAt = now().toJSDate();
    onboarding.reviewedById = adminUserId;
    await this.onboardingRepo.save(onboarding);

    // Update profile to ACTIVE
    const profile = onboarding.customer;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Approve all documents
    await this.documentRepo.update(
      {
        customerId: onboarding.customerId,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
      },
      {
        validationStatus: CustomerDocumentValidationStatus.VALID,
        reviewedById: adminUserId,
        reviewedAt: now().toJSDate(),
      },
    );

    // Send approval email
    await this.emailService.sendCustomerOnboardingApprovalEmail(
      profile.user.email,
      profile.company.tradingName || profile.company.legalName,
    );

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
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

    if (
      ![
        CustomerOnboardingStatus.SUBMITTED,
        CustomerOnboardingStatus.UNDER_REVIEW,
      ].includes(onboarding.status)
    ) {
      throw new BadRequestException('Onboarding is not in a reviewable state');
    }

    // Update onboarding
    onboarding.status = CustomerOnboardingStatus.REJECTED;
    onboarding.reviewedAt = now().toJSDate();
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

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
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
      relations: ['customer', 'customer.user', 'customer.company'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.validationStatus = validationStatus;
    document.validationNotes = validationNotes;
    document.reviewedById = adminUserId;
    document.reviewedAt = now().toJSDate();
    await this.documentRepo.save(document);

    const adminUser = await this.userRepo.findOne({
      where: { id: adminUserId },
    });
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

    if (validationStatus === CustomerDocumentValidationStatus.INVALID) {
      const onboarding = await this.onboardingRepo.findOne({
        where: { customerId: document.customerId },
      });

      if (onboarding && onboarding.status !== CustomerOnboardingStatus.REJECTED) {
        onboarding.status = CustomerOnboardingStatus.REJECTED;
        onboarding.rejectionReason = `Document rejected: ${document.documentType}`;
        onboarding.remediationSteps = validationNotes || 'Please re-upload the rejected document with the correct information.';
        onboarding.reviewedAt = now().toJSDate();
        onboarding.reviewedById = adminUserId;
        await this.onboardingRepo.save(onboarding);

        await this.auditService.log({
          entityType: 'customer_onboarding',
          entityId: onboarding.id,
          action: AuditAction.UPDATE,
          performedBy: adminUser || undefined,
          newValues: {
            status: CustomerOnboardingStatus.REJECTED,
            rejectionReason: onboarding.rejectionReason,
            event: 'onboarding_rejected_due_to_document',
          },
          ipAddress: clientIp,
        });

        if (document.customer?.user?.email) {
          const documentTypeLabels: Record<string, string> = {
            company_registration: 'Company Registration (CIPC)',
            vat_registration: 'VAT Registration',
            bee_certificate: 'B-BBEE Certificate',
            proof_of_banking: 'Proof of Banking',
          };
          const docLabel = documentTypeLabels[document.documentType] || document.documentType;
          const actionUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/customer/portal/documents`;

          await this.emailService.sendEmail({
            to: document.customer.user.email,
            subject: 'Document Review - Action Required',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Document Review - Action Required</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #dc2626;">Document Review - Action Required</h1>
                  <p>Dear ${document.customer.firstName || 'Customer'},</p>
                  <p>Your <strong>${docLabel}</strong> document has been reviewed and requires attention.</p>
                  <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
                    <p style="margin: 8px 0 0 0; color: #7f1d1d;">${validationNotes || 'The document could not be verified. Please upload a valid document.'}</p>
                  </div>
                  <p>Please log in to your account and upload a corrected version of the document.</p>
                  <p style="margin: 30px 0;">
                    <a href="${actionUrl}"
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Go to Documents
                    </a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="color: #999; font-size: 12px;">
                    If you have any questions, please contact our support team.
                  </p>
                </div>
              </body>
              </html>
            `,
          });
        }
      }
    }

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

    return documents.map((doc) => ({
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

  async getDocumentUrl(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storageService.getPresignedUrl(document.filePath);

    return {
      url,
      filename: document.fileName,
      mimeType: document.mimeType,
    };
  }

  async getDocumentById(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDocumentReviewData(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['customer', 'customer.company', 'reviewedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storageService.getPresignedUrl(document.filePath);
    const company = document.customer.company;

    const expectedData = {
      companyName: company.legalName,
      tradingName: company.tradingName,
      registrationNumber: company.registrationNumber,
      vatNumber: company.vatNumber,
      streetAddress: company.streetAddress,
      city: company.city,
      provinceState: company.provinceState,
      postalCode: company.postalCode,
      beeLevel: company.beeLevel,
      beeCertificateExpiry: company.beeCertificateExpiry,
      beeVerificationAgency: company.beeVerificationAgency,
    };

    const extractedData = document.ocrExtractedData ?? {};

    const fieldComparison = this.buildFieldComparison(expectedData, extractedData, document.fieldResults ?? []);

    return {
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
      validationStatus: document.validationStatus,
      validationNotes: document.validationNotes,
      presignedUrl: url,
      ocrProcessedAt: document.ocrProcessedAt,
      ocrFailed: document.ocrFailed,
      verificationConfidence: document.verificationConfidence,
      allFieldsMatch: document.allFieldsMatch,
      expectedData,
      extractedData,
      fieldComparison,
      reviewedBy: document.reviewedBy?.username ?? null,
      reviewedAt: document.reviewedAt,
      customer: {
        id: document.customer.id,
        firstName: document.customer.firstName,
        lastName: document.customer.lastName,
      },
    };
  }

  private buildFieldComparison(
    expected: Record<string, any>,
    extracted: Record<string, any>,
    fieldResults: { fieldName: string; expected: string; extracted: string; matches: boolean; similarity: number }[],
  ) {
    const fieldResultsMap = new Map(fieldResults.map((fr) => [fr.fieldName, fr]));

    const fields = ['companyName', 'registrationNumber', 'vatNumber', 'streetAddress', 'city', 'provinceState', 'postalCode', 'beeLevel'];

    return fields.map((field) => {
      const storedResult = fieldResultsMap.get(field);
      const expectedValue = expected[field];
      const extractedValue = extracted[field];

      if (storedResult) {
        return {
          field,
          expected: expectedValue ?? null,
          extracted: extractedValue ?? null,
          matches: storedResult.matches,
          similarity: storedResult.similarity,
        };
      }

      const matches = this.valuesMatch(expectedValue, extractedValue);
      return {
        field,
        expected: expectedValue ?? null,
        extracted: extractedValue ?? null,
        matches,
        similarity: matches ? 100 : 0,
      };
    });
  }

  private valuesMatch(expected: any, extracted: any): boolean {
    if (expected === null || expected === undefined) return true;
    if (extracted === null || extracted === undefined) return false;
    return String(expected).toUpperCase().trim() === String(extracted).toUpperCase().trim();
  }

  async getDocumentPreviewImages(documentId: number): Promise<{ pages: string[]; totalPages: number }> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.mimeType !== 'application/pdf') {
      const url = await this.storageService.getPresignedUrl(document.filePath);
      return {
        pages: [url],
        totalPages: 1,
      };
    }

    const buffer = await this.storageService.download(document.filePath);
    const pages = await this.convertPdfToImages(buffer);

    return {
      pages,
      totalPages: pages.length,
    };
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<string[]> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const execAsync = promisify(exec);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-preview-'));
    const inputPath = path.join(tempDir, 'input.pdf');
    const outputPattern = path.join(tempDir, 'page-%d.png');

    this.logger.debug('[PDF Preview] Starting conversion');
    this.logger.debug('[PDF Preview] Temp dir:', tempDir);
    this.logger.debug('[PDF Preview] PDF buffer size:', pdfBuffer.length);

    try {
      await fs.writeFile(inputPath, pdfBuffer);
      this.logger.debug('[PDF Preview] Wrote input PDF to:', inputPath);

      const gsCommand = process.platform === 'win32'
        ? '"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"'
        : 'gs';
      const command = `${gsCommand} -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r150 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 "-sOutputFile=${outputPattern}" "${inputPath}"`;

      this.logger.debug('[PDF Preview] Running command:', command);

      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      this.logger.debug('[PDF Preview] GS stdout:', stdout);
      if (stderr) {
        this.logger.debug('[PDF Preview] GS stderr:', stderr);
      }

      const files = await fs.readdir(tempDir);
      this.logger.debug('[PDF Preview] Files in temp dir:', files);

      const pngFiles = files
        .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        });

      this.logger.debug('[PDF Preview] PNG files found:', pngFiles);

      const pages: string[] = [];
      for (const file of pngFiles) {
        const filePath = path.join(tempDir, file);
        const imageBuffer = await fs.readFile(filePath);
        const base64 = imageBuffer.toString('base64');
        pages.push(`data:image/png;base64,${base64}`);
        this.logger.debug('[PDF Preview] Converted', file, 'size:', imageBuffer.length);
      }

      this.logger.debug('[PDF Preview] Total pages converted:', pages.length);
      return pages;
    } catch (error) {
      this.logger.error('[PDF Preview] Error during conversion:', error);
      throw error;
    } finally {
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        await fs.rmdir(tempDir);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
