import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  SupplierProfile,
  SupplierAccountStatus,
  SupplierCompany,
  SupplierOnboarding,
  SupplierOnboardingStatus,
  SupplierDocument,
  SupplierDocumentValidationStatus,
} from './entities';
import {
  RejectSupplierDto,
  SuspendSupplierDto,
  ReviewDocumentDto,
  SupplierListItemDto,
  SupplierDetailDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class SupplierAdminService {
  private readonly logger = new Logger(SupplierAdminService.name);

  constructor(
    @InjectRepository(SupplierProfile)
    private readonly profileRepo: Repository<SupplierProfile>,
    @InjectRepository(SupplierCompany)
    private readonly companyRepo: Repository<SupplierCompany>,
    @InjectRepository(SupplierOnboarding)
    private readonly onboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierDocument)
    private readonly documentRepo: Repository<SupplierDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Get all suppliers with pagination
   */
  async getAllSuppliers(
    page: number = 1,
    limit: number = 20,
    status?: SupplierOnboardingStatus,
  ): Promise<{ items: SupplierListItemDto[]; total: number; page: number; totalPages: number }> {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.company', 'company')
      .leftJoinAndSelect('profile.onboarding', 'onboarding')
      .orderBy('profile.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('onboarding.status = :status', { status });
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    const profiles = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const items: SupplierListItemDto[] = profiles.map(profile => ({
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      createdAt: profile.createdAt,
    }));

    return { items, total, page, totalPages };
  }

  /**
   * Get suppliers pending review
   */
  async getPendingReview(): Promise<SupplierListItemDto[]> {
    const profiles = await this.profileRepo.find({
      where: {
        onboarding: {
          status: SupplierOnboardingStatus.SUBMITTED,
        },
      },
      relations: ['user', 'company', 'onboarding'],
      order: { createdAt: 'ASC' },
    });

    return profiles.map(profile => ({
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus: profile.onboarding?.status,
      createdAt: profile.createdAt,
    }));
  }

  /**
   * Get supplier details
   */
  async getSupplierDetails(supplierId: number): Promise<SupplierDetailDto> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding', 'documents'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      id: profile.id,
      email: profile.user?.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.company?.tradingName || profile.company?.legalName,
      accountStatus: profile.accountStatus,
      onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      createdAt: profile.createdAt,
      company: profile.company ? {
        id: profile.company.id,
        legalName: profile.company.legalName,
        tradingName: profile.company.tradingName,
        registrationNumber: profile.company.registrationNumber,
        taxNumber: profile.company.taxNumber,
        vatNumber: profile.company.vatNumber,
        city: profile.company.city,
        provinceState: profile.company.provinceState,
        country: profile.company.country,
        primaryContactName: profile.company.primaryContactName,
        primaryContactEmail: profile.company.primaryContactEmail,
        primaryContactPhone: profile.company.primaryContactPhone,
        industryType: profile.company.industryType,
      } : undefined,
      documents: (profile.documents || []).map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        validationStatus: doc.validationStatus,
        uploadedAt: doc.uploadedAt,
      })),
      onboarding: {
        status: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete: profile.onboarding?.companyDetailsComplete || false,
        documentsComplete: profile.onboarding?.documentsComplete || false,
        submittedAt: profile.onboarding?.submittedAt,
        rejectionReason: profile.onboarding?.rejectionReason ?? undefined,
        remediationSteps: profile.onboarding?.remediationSteps ?? undefined,
        resubmissionCount: profile.onboarding?.resubmissionCount || 0,
      },
    };
  }

  /**
   * Review document (approve/reject)
   */
  async reviewDocument(
    supplierId: number,
    documentId: number,
    dto: ReviewDocumentDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<SupplierDocument> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, supplierId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const oldStatus = document.validationStatus;

    document.validationStatus = dto.validationStatus;
    document.validationNotes = dto.validationNotes ?? null;
    document.reviewedById = adminUserId;
    document.reviewedAt = new Date();

    const savedDocument = await this.documentRepo.save(document);

    await this.auditService.log({
      entityType: 'supplier_document',
      entityId: documentId,
      action: AuditAction.UPDATE,
      oldValues: { validationStatus: oldStatus },
      newValues: { validationStatus: dto.validationStatus, validationNotes: dto.validationNotes, reviewedById: adminUserId },
      ipAddress: clientIp,
    });

    return savedDocument;
  }

  /**
   * Approve supplier onboarding
   */
  async approveOnboarding(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (onboarding.status !== SupplierOnboardingStatus.SUBMITTED &&
        onboarding.status !== SupplierOnboardingStatus.UNDER_REVIEW) {
      throw new BadRequestException('Onboarding is not in a reviewable status');
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.APPROVED;
    onboarding.reviewedAt = new Date();
    onboarding.reviewedById = adminUserId;
    await this.onboardingRepo.save(onboarding);

    // Activate supplier account
    profile.accountStatus = SupplierAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Send approval email
    if (profile.user?.email) {
      await this.emailService.sendSupplierApprovalEmail(
        profile.user.email,
        profile.company?.tradingName || profile.company?.legalName || 'Your Company',
      );
    }

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.APPROVE,
      newValues: { status: SupplierOnboardingStatus.APPROVED, approvedById: adminUserId },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Supplier onboarding approved successfully',
    };
  }

  /**
   * Reject supplier onboarding
   */
  async rejectOnboarding(
    supplierId: number,
    dto: RejectSupplierDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['user', 'company', 'onboarding'],
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    const onboarding = profile.onboarding;
    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (onboarding.status !== SupplierOnboardingStatus.SUBMITTED &&
        onboarding.status !== SupplierOnboardingStatus.UNDER_REVIEW) {
      throw new BadRequestException('Onboarding is not in a reviewable status');
    }

    // Update onboarding status
    onboarding.status = SupplierOnboardingStatus.REJECTED;
    onboarding.reviewedAt = new Date();
    onboarding.reviewedById = adminUserId;
    onboarding.rejectionReason = dto.rejectionReason;
    onboarding.remediationSteps = dto.remediationSteps;
    await this.onboardingRepo.save(onboarding);

    // Send rejection email
    if (profile.user?.email) {
      await this.emailService.sendSupplierRejectionEmail(
        profile.user.email,
        profile.company?.tradingName || profile.company?.legalName || 'Your Company',
        dto.rejectionReason,
        dto.remediationSteps,
      );
    }

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.REJECT,
      newValues: {
        status: SupplierOnboardingStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        rejectedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Supplier onboarding rejected',
    };
  }

  /**
   * Start review (move to UNDER_REVIEW status)
   */
  async startReview(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const onboarding = await this.onboardingRepo.findOne({
      where: { supplierId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    if (onboarding.status !== SupplierOnboardingStatus.SUBMITTED) {
      throw new BadRequestException('Onboarding is not in submitted status');
    }

    onboarding.status = SupplierOnboardingStatus.UNDER_REVIEW;
    await this.onboardingRepo.save(onboarding);

    await this.auditService.log({
      entityType: 'supplier_onboarding',
      entityId: onboarding.id,
      action: AuditAction.UPDATE,
      newValues: { status: SupplierOnboardingStatus.UNDER_REVIEW, reviewStartedById: adminUserId },
      ipAddress: clientIp,
    });

    return { success: true };
  }

  /**
   * Suspend supplier account
   */
  async suspendSupplier(
    supplierId: number,
    dto: SuspendSupplierDto,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    profile.accountStatus = SupplierAccountStatus.SUSPENDED;
    profile.suspensionReason = dto.reason;
    profile.suspendedAt = new Date();
    profile.suspendedBy = adminUserId;
    await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: 'supplier_profile',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: {
        accountStatus: SupplierAccountStatus.SUSPENDED,
        suspensionReason: dto.reason,
        suspendedById: adminUserId,
      },
      ipAddress: clientIp,
    });

    return { success: true };
  }

  /**
   * Reactivate supplier account
   */
  async reactivateSupplier(
    supplierId: number,
    adminUserId: number,
    clientIp: string,
  ): Promise<{ success: boolean }> {
    const profile = await this.profileRepo.findOne({
      where: { id: supplierId },
    });

    if (!profile) {
      throw new NotFoundException('Supplier not found');
    }

    profile.accountStatus = SupplierAccountStatus.ACTIVE;
    profile.suspensionReason = null;
    profile.suspendedAt = null;
    profile.suspendedBy = null;
    await this.profileRepo.save(profile);

    await this.auditService.log({
      entityType: 'supplier_profile',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: { accountStatus: SupplierAccountStatus.ACTIVE, reactivatedById: adminUserId },
      ipAddress: clientIp,
    });

    return { success: true };
  }
}
